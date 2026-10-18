<?php
/**
 * Courses module for Centuria API
 * Handles course listing and creation
 * Uses SQLite database with JWT authentication
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

// Middleware: require_auth() centralizado en auth.php

// List all courses
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['action']) && $_GET['action'] === 'list') {
    $decoded = require_auth();
    $role = $decoded->role;
    $user_id = $decoded->user_id;
    
    $pdo = db();
    
    // Different access levels based on role
    if ($role === 'admin' || $role === 'academic') {
        // Admin/academic can see all courses
        $stmt = $pdo->prepare("SELECT id, name, shortname, description, created_by FROM courses");
        $stmt->execute();
    } else {
        // Students see only courses they're enrolled in
        // (or all courses for demo purposes)
        $stmt = $pdo->prepare("SELECT id, name, shortname, description FROM courses");
        $stmt->execute();
    }
    
    $courses = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    api_response(['courses' => $courses]);
}

// Get single course by ID
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['action']) && $_GET['action'] === 'get') {
    $course_id = $_GET['id'] ?? 0;
    
    if ($course_id == 0) {
        api_error('Course ID required', 400);
    }
    
    $pdo = db();
    $stmt = $pdo->prepare("SELECT id, name, shortname, description, created_by FROM courses WHERE id = ?");
    $stmt->execute([$course_id]);
    $course = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($course) {
        api_response(['course' => $course]);
    } else {
        api_error('Course not found', 404);
    }
}

// Create new course
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_REQUEST['action']) && $_REQUEST['action'] === 'create') {
    $decoded = require_auth();
    $role = $decoded->role;
    $user_id = $decoded->user_id;
    
    // Only admins and academic staff can create courses
    if (!in_array($role, ['admin', 'academic'])) {
        api_error('Permission denied: only admin/academic can create courses', 403);
    }
    
    $name = $_POST['name'] ?? '';
    $shortname = $_POST['shortname'] ?? '';
    $description = $_POST['description'] ?? '';
    
    if (empty($name) || empty($shortname)) {
        api_error('Name and shortname are required', 400);
    }
    
    $pdo = db();
    
    // Check if shortname already exists
    $stmt = $pdo->prepare("SELECT id FROM courses WHERE shortname = ?");
    $stmt->execute([$shortname]);
    
    if ($stmt->fetchColumn()) {
        api_error('Course shortname already exists', 409);
    }
    
    $stmt = $pdo->prepare(
        "INSERT INTO courses (name, shortname, description, created_by) 
         VALUES (?, ?, ?, ?)"
    );
    
    try {
        $stmt->execute([$name, $shortname, $description, $user_id]);
        
        $course_id = $pdo->lastInsertId();
        
        api_response(['course' => ['id' => $course_id, 'name' => $name, 'shortname' => $shortname]], 201);
    } catch (PDOException $e) {
        api_error('Database error: ' . $e->getMessage(), 500);
    }
}

// Enroll student in course
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_REQUEST['action']) && $_REQUEST['action'] === 'enroll') {
    $decoded = require_auth();
    $role = $decoded->role;
    
    if ($role !== 'student' && $role !== 'admin') {
        api_error('Only students or admin can enroll', 403);
    }
    
    $user_id = $decoded->user_id;
    $course_id = $_POST['course_id'] ?? 0;
    
    if ($course_id == 0) {
        api_error('Course ID required', 400);
    }
    
    $pdo = db();
    
    // Check if course exists
    $stmt = $pdo->prepare("SELECT id FROM courses WHERE id = ?");
    $stmt->execute([$course_id]);
    
    if (!$stmt->fetchColumn()) {
        api_error('Course not found', 404);
    }
    
    // Enroll student (insert or update course_id for user)
    $stmt = $pdo->prepare(
        "UPDATE users SET course_id = ? WHERE id = ?"
    );
    
    try {
        $stmt->execute([$course_id, $user_id]);
        api_response(['success' => true, 'message' => 'Enrolled in course successfully']);
    } catch (PDOException $e) {
        api_error('Database error: ' . $e->getMessage(), 500);
    }
}