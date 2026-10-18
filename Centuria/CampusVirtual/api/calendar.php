<?php
/**
 * Calendar module for Centuria API
 * Handles events and calendar CRUD operations
 * Uses SQLite database with JWT authentication
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

// Middleware: require_auth() centralizado en auth.php

// Create calendar event
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_REQUEST['action']) && $_REQUEST['action'] === 'create') {
    $decoded = require_auth();
    $role = $decoded->role;
    $user_id = $decoded->user_id;
    
    // Teachers, admins, and academic can create events
    if (!in_array($role, ['teacher', 'admin', 'academic'])) {
        api_error('Permission denied: only teacher/admin/academic can create events', 403);
    }
    
    $title = $_POST['title'] ?? '';
    $description = $_POST['description'] ?? '';
    $start_date = $_POST['start_date'] ?? '';
    $end_date = $_POST['end_date'] ?? '';
    $all_day = $_POST['all_day'] ?? 0;
    
    if (empty($title) || empty($start_date)) {
        api_error('Title and start_date are required', 400);
    }
    
    // Validate date format
    if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $start_date)) {
        api_error('Invalid start_date format (YYYY-MM-DD)', 400);
    }
    
    if (!empty($end_date) && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $end_date)) {
        api_error('Invalid end_date format (YYYY-MM-DD)', 400);
    }
    
    $pdo = db();
    
    $stmt = $pdo->prepare(
        "INSERT INTO calendar (title, description, start_date, end_date, all_day, created_by) 
         VALUES (?, ?, ?, ?, ?, ?)"
    );
    
    try {
        $stmt->execute([$title, $description, $start_date, $end_date, (int)$all_day, $user_id]);
        $event_id = $pdo->lastInsertId();
        api_response(['event' => ['id' => $event_id, 'title' => $title, 'start_date' => $start_date]], 201);
    } catch (PDOException $e) {
        api_error('Database error: ' . $e->getMessage(), 500);
    }
}

// List calendar events
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['action']) && $_GET['action'] === 'list') {
    $decoded = require_auth();
    $role = $decoded->role;
    $user_id = $decoded->user_id;
    
    $course_id = $_GET['course_id'] ?? 0;
    $start = $_GET['start'] ?? ''; // filter by start date
    $end = $_GET['end'] ?? ''; // filter by end date
    
    $pdo = db();
    
    $query = "SELECT c.id, c.title, c.description, c.start_date, c.end_date, c.all_day, u.firstname, u.lastname 
              FROM calendar c
              LEFT JOIN users u ON c.created_by = u.id";
    $params = [];
    
    // Filter by course if specified and user has permission
    if ($course_id) {
        // Check user has access to this course
        $check_stmt = $pdo->prepare("SELECT id FROM users WHERE id = ? AND (role IN ('teacher','admin','academic') OR course_id = ?)");
        // This is simplified - in production, check proper enrollment
        $check_stmt->execute([$user_id, $course_id]);
        if ($check_stmt->fetchColumn()) {
            $query .= " WHERE c.id IN (SELECT course_id FROM users WHERE id = ?)";
            $params = [$user_id];
        }
    }
    
    // Filter by date range
    if (!empty($start)) {
        $query .= $query ? ' AND ' : ' WHERE ';
        $query .= "c.start_date >= ?";
        $params[] = $start;
    }
    
    if (!empty($end)) {
        $query .= $query ? ' AND ' : ' WHERE ';
        $query .= "c.end_date <= ?";
        $params[] = $end;
    }
    
    $query .= " ORDER BY c.start_date";
    
    $stmt = $pdo->prepare($query);
    $stmt->execute($params);
    
    $events = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    api_response(['events' => $events]);
}

// Get single event
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['action']) && $_GET['action'] === 'get') {
    $event_id = $_GET['id'] ?? 0;
    
    if ($event_id == 0) {
        api_error('Event ID required', 400);
    }
    
    $pdo = db();
    $stmt = $pdo->prepare("SELECT c.*, u.firstname, u.lastname FROM calendar c LEFT JOIN users u ON c.created_by = u.id WHERE c.id = ?");
    $stmt->execute([$event_id]);
    $event = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($event) {
        api_response(['event' => $event]);
    } else {
        api_error('Event not found', 404);
    }
}

// Update calendar event
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_REQUEST['action']) && $_REQUEST['action'] === 'update') {
    $decoded = require_auth();
    $role = $decoded->role;
    
    if (!in_array($role, ['teacher', 'admin', 'academic'])) {
        api_error('Permission denied', 403);
    }
    
    $event_id = $_POST['id'] ?? 0;
    
    if ($event_id == 0) {
        api_error('Event ID required', 400);
    }
    
    $title = $_POST['title'] ?? '';
    $description = $_POST['description'] ?? '';
    $start_date = $_POST['start_date'] ?? '';
    $end_date = $_POST['end_date'] ?? '';
    $all_day = $_POST['all_day'] ?? 0;
    
    $pdo = db();
    
    $stmt = $pdo->prepare(
        "UPDATE calendar SET title = ?, description = ?, start_date = ?, end_date = ?, all_day = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?"
    );
    
    try {
        $stmt->execute([$title, $description, $start_date, $end_date, (int)$all_day, $event_id]);
        
        if ($stmt->rowCount() == 0) {
            api_error('Event not found', 404);
        }
        
        api_response(['success' => true, 'message' => 'Event updated successfully']);
    } catch (PDOException $e) {
        api_error('Database error: ' . $e->getMessage(), 500);
    }
}

// Delete calendar event
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_REQUEST['action']) && $_REQUEST['action'] === 'delete') {
    $decoded = require_auth();
    $role = $decoded->role;
    
    if (!in_array($role, ['teacher', 'admin', 'academic'])) {
        api_error('Permission denied', 403);
    }
    
    $event_id = $_POST['id'] ?? 0;
    
    if ($event_id == 0) {
        api_error('Event ID required', 400);
    }
    
    $pdo = db();
    
    $stmt = $pdo->prepare("DELETE FROM calendar WHERE id = ?");
    $stmt->execute([$event_id]);
    
    if ($stmt->rowCount() == 0) {
        api_error('Event not found', 404);
    }
    
    api_response(['success' => true, 'message' => 'Event deleted successfully']);
}