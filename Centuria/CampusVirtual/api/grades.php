<?php
/**
 * Grades module for Centuria API
 * Handles grade entry, retrieval, and updates
 * Uses SQLite database with JWT authentication
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

// Middleware: require_auth() centralizado en auth.php

// List grades for a course
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['action']) && $_GET['action'] === 'list') {
    $decoded = require_auth();
    $role = $decoded->role;
    $user_id = $decoded->user_id;
    
    $course_id = $_GET['course_id'] ?? 0;
    
    if ($course_id == 0) {
        api_error('Course ID required', 400);
    }
    
    $pdo = db();
    
    // Check enrollment based on role
    if ($role === 'student') {
        // Students see only their own grades
        $stmt = $pdo->prepare(
            "SELECT g.id, g.component, g.score, g.max_score, g.created_at, 
                    u.firstname, u.lastname 
             FROM grades g 
             JOIN users u ON g.user_id = u.id 
             WHERE g.course_id = ? AND g.user_id = ?",
            [$course_id, $user_id]
        );
        $stmt->execute();
    } elseif ($role === 'teacher' || $role === 'admin' || $role === 'academic') {
        // Teachers/admins see all grades for their course
        $stmt = $pdo->prepare(
            "SELECT g.id, g.user_id, g.component, g.score, g.max_score, g.created_at,
                    u.firstname, u.lastname, u.username
             FROM grades g 
             JOIN users u ON g.user_id = u.id 
             WHERE g.course_id = ?
             ORDER BY u.lastname, u.firstname"
        );
        $stmt->execute([$course_id]);
    } else {
        api_error('Permission denied', 403);
    }
    
    $grades = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    api_response(['grades' => $grades]);
}

// Get grade by ID
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['action']) && $_GET['action'] === 'get') {
    $grade_id = $_GET['id'] ?? 0;
    
    if ($grade_id == 0) {
        api_error('Grade ID required', 400);
    }
    
    $pdo = db();
    $stmt = $pdo->prepare("SELECT g.*, u.firstname, u.lastname, u.username FROM grades g JOIN users u ON g.user_id = u.id WHERE g.id = ?");
    $stmt->execute([$grade_id]);
    $grade = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($grade) {
        api_response(['grade' => $grade]);
    } else {
        api_error('Grade not found', 404);
    }
}

// Record or update grade
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_REQUEST['action']) && $_REQUEST['action'] === 'record') {
    $decoded = require_auth();
    $role = $decoded->role;
    $user_id = $decoded->user_id;
    
    // Teachers, admins, and academic staff can record grades
    if (!in_array($role, ['teacher', 'admin', 'academic'])) {
        api_error('Permission denied: only teacher/admin/academic can record grades', 403);
    }
    
    $user_id_target = $_POST['user_id'] ?? 0;
    $course_id = $_POST['course_id'] ?? 0;
    $component = $_POST['component'] ?? '';
    $score = $_POST['score'] ?? 0;
    $max_score = $_POST['max_score'] ?? 100;
    
    if ($user_id_target == 0 || $course_id == 0 || empty($component)) {
        api_error('user_id, course_id and component are required', 400);
    }
    
    $pdo = db();
    
    // Check if course exists
    $stmt = $pdo->prepare("SELECT id FROM courses WHERE id = ?");
    $stmt->execute([$course_id]);
    
    if (!$stmt->fetchColumn()) {
        api_error('Course not found', 404);
    }
    
    // Check if user is enrolled in course
    $stmt = $pdo->prepare("SELECT id, role FROM users WHERE id = ?");
    $stmt->execute([$user_id_target]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if (!$user) {
        api_error('User not found', 404);
    }
    
    // Record or update grade (upsert)
    $stmt = $pdo->prepare(
        "INSERT INTO grades (user_id, course_id, component, score, max_score) 
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(user_id, course_id, component) 
         DO UPDATE SET score = excluded.score, max_score = excluded.max_score, updated_at = CURRENT_TIMESTAMP"
    );
    
    try {
        $stmt->execute([$user_id_target, $course_id, $component, $score, $max_score]);
        api_response(['success' => true, 'message' => 'Grade recorded/updated successfully']);
    } catch (PDOException $e) {
        api_error('Database error: ' . $e->getMessage(), 500);
    }
}

// Calculate final grade for a course
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['action']) && $_GET['action'] === 'final') {
    $course_id = $_GET['course_id'] ?? 0;
    
    if ($course_id == 0) {
        api_error('Course ID required', 400);
    }
    
    $pdo = db();
    
    // Get all grades for course
    $stmt = $pdo->prepare(
        "SELECT user_id, component, score, max_score FROM grades WHERE course_id = ?",
        [$course_id]
    );
    $stmt->execute();
    $grades = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Group by user
    $by_user = [];
    foreach ($grades as $g) {
        $uid = $g['user_id'];
        if (!isset($by_user[$uid])) {
            $by_user[$uid] = ['total_score' => 0, 'max_total' => 0, 'components' => []];
        }
        $by_user[$uid]['total_score'] += $g['score'];
        $by_user[$uid]['max_total'] += $g['max_score'];
        $by_user[$uid]['components'][] = [
            'component' => $g['component'],
            'score' => $g['score'],
            'max_score' => $g['max_score'],
            'percentage' => $g['max_score'] > 0 ? ($g['score'] / $g['max_score'] * 100) : 0
        ];
    }
    
    // Calculate final percentage per user
    $results = [];
    foreach ($by_user as $uid => $data) {
        $final_percentage = $data['max_total'] > 0 ? ($data['total_score'] / $data['max_total'] * 100) : 0;
        $results[$uid] = [
            'final_percentage' => round($final_percentage, 2),
            'components' => $data['components'],
            'total_components' => count($data['components'])
        ];
    }
    
    api_response(['final_grades' => $results]);
}