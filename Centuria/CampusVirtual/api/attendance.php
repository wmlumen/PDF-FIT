<?php
/**
 * Attendance module for Centuria API
 * Handles attendance tracking and reporting
 * Uses SQLite database with JWT authentication
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

// Middleware: require_auth() centralizado en auth.php

// Mark attendance for a course on a specific date
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_REQUEST['action']) && $_REQUEST['action'] === 'mark') {
    $decoded = require_auth();
    $role = $decoded->role;
    $user_id = $decoded->user_id;
    
    // Teachers, admins, and academic can mark attendance
    if (!in_array($role, ['teacher', 'admin', 'academic'])) {
        api_error('Permission denied: only teacher/admin/academic can mark attendance', 403);
    }
    
    $course_id = $_POST['course_id'] ?? 0;
    $date = $_POST['date'] ?? '';
    $status = $_POST['status'] ?? 'present'; // present, absent, late, excused
    
    if ($course_id == 0 || empty($date)) {
        api_error('course_id and date are required', 400);
    }
    
    // Validate date format
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
        api_error('Invalid date format (YYYY-MM-DD)', 400);
    }
    
    // Validate status
    $valid_statuses = ['present', 'absent', 'late', 'excused'];
    if (!in_array($status, $valid_statuses)) {
        api_error('Invalid status. Allowed: ' . implode(', ', $valid_statuses), 400);
    }
    
    $pdo = db();
    
    // Check course exists
    $stmt = $pdo->prepare("SELECT id FROM courses WHERE id = ?");
    $stmt->execute([$course_id]);
    
    if (!$stmt->fetchColumn()) {
        api_error('Course not found', 404);
    }
    
    // Mark attendance for all enrolled students, or for a specific student
    $student_id = $_POST['student_id'] ?? null;
    
    if ($student_id) {
        // Mark for specific student
        $stmt = $pdo->prepare(
            "INSERT INTO attendance (user_id, course_id, date, status) 
             VALUES (?, ?, ?, ?)
             ON CONFLICT(user_id, course_id, date) 
             DO UPDATE SET status = excluded.status, updated_at = CURRENT_TIMESTAMP"
        );
        $stmt->execute([$student_id, $course_id, $date, $status]);
    } else {
        // Mark for all enrolled students in the course
        $stmt = $pdo->prepare("SELECT id FROM users WHERE course_id = ?");
        $stmt->execute([$course_id]);
        $students = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
        foreach ($students as $studentId) {
            $stmt = $pdo->prepare(
                "INSERT INTO attendance (user_id, course_id, date, status) 
                 VALUES (?, ?, ?, ?)
                 ON CONFLICT(user_id, course_id, date) 
                 DO UPDATE SET status = excluded.status, updated_at = CURRENT_TIMESTAMP"
            );
            $stmt->execute([$studentId, $course_id, $date, $status]);
        }
    }
    
    api_response(['success' => true, 'message' => 'Attendance marked successfully']);
}

// Get attendance records for a course
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['action']) && $_GET['action'] === 'list') {
    $decoded = require_auth();
    $role = $decoded->role;
    $user_id = $decoded->user_id;
    
    $course_id = $_GET['course_id'] ?? 0;
    
    if ($course_id == 0) {
        api_error('Course ID required', 400);
    }
    
    $pdo = db();
    
    // Different views based on role
    if ($role === 'student') {
        // Students see their own attendance
        $stmt = $pdo->prepare(
            "SELECT a.id, a.date, a.status, c.name as course_name
             FROM attendance a
             JOIN courses c ON a.course_id = c.id
             WHERE a.user_id = ? AND a.course_id = ?
             ORDER BY a.date DESC",
            [$user_id, $course_id]
        );
        $stmt->execute();
    } elseif ($role === 'teacher' || $role === 'admin' || $role === 'academic') {
        // Teachers see all attendance for their course
        $stmt = $pdo->prepare(
            "SELECT a.id, a.user_id, u.firstname, u.lastname, a.date, a.status, c.name as course_name
             FROM attendance a
             JOIN users u ON a.user_id = u.id
             JOIN courses c ON a.course_id = c.id
             WHERE a.course_id = ?
             ORDER BY a.date DESC, u.lastname, u.firstname",
            [$course_id]
        );
        $stmt->execute();
    } else {
        api_error('Permission denied', 403);
    }
    
    $attendance = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    api_response(['attendance' => $attendance]);
}

// Get attendance summary for a course
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['action']) && $_GET['action'] === 'summary') {
    $course_id = $_GET['course_id'] ?? 0;
    
    if ($course_id == 0) {
        api_error('Course ID required', 400);
    }
    
    $pdo = db();
    
    // Get attendance statistics
    $stmt = $pdo->prepare(
        "SELECT status, COUNT(*) as count 
         FROM attendance 
         WHERE course_id = ? 
         GROUP BY status",
        [$course_id]
    );
    $stmt->execute();
    $summary = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Calculate percentages
    $total = 0;
    $present = 0;
    foreach ($summary as $row) {
        $total += $row['count'];
        if ($row['status'] === 'present') {
            $present = $row['count'];
        }
    }
    
    $attendance_rate = $total > 0 ? round($present / $total * 100, 2) : 0;
    
    api_response([
        'course_id' => $course_id,
        'total_sessions' => $total,
        'present' => $present,
        'absent_excused' => isset($summary[1]) ? $summary[1]['count'] : 0, // assuming second row is absent
        'attendance_rate' => $attendance_rate,
        'details' => $summary
    ]);
}