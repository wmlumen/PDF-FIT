<?php
/**
 * Admin module for Centuria API
 * Handles user management, role assignment, and CRUD operations
 * Uses SQLite database with JWT authentication
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

// Middleware: require authentication with admin/academic role
function require_admin() {
    $decoded = require_auth();
    $role = $decoded->role;
    
    if (!in_array($role, ['admin', 'academic'])) {
        api_error('Permission denied: only admin/academic can perform this action', 403);
    }
    
    return $decoded;
}

// List all users with their roles and course enrollment
// Accesible a cualquier usuario autenticado (los docentes la usan para pasar lista)
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['action']) && $_GET['action'] === 'list') {
    $decoded = require_auth();

    $pdo = db();
    
    // Get all users with role and course info
    $stmt = $pdo->prepare(
        "SELECT u.id, u.username, u.firstname, u.lastname, u.email, u.role, u.course_id,
                c.name as course_name
         FROM users u
         LEFT JOIN courses c ON u.course_id = c.id
         ORDER BY u.lastname, u.firstname"
    );
    $stmt->execute();
    
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    api_response(['users' => $users]);
}

// Get single user details
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['action']) && $_GET['action'] === 'get') {
    $user_id = $_GET['id'] ?? 0;
    
    if ($user_id == 0) {
        api_error('User ID required', 400);
    }
    
    $pdo = db();
    
    $stmt = $pdo->prepare(
        "SELECT u.id, u.username, u.firstname, u.lastname, u.email, u.role, u.course_id,
                c.name as course_name, u.created_at
         FROM users u
         LEFT JOIN courses c ON u.course_id = c.id
         WHERE u.id = ?"
    );
    $stmt->execute([$user_id]);
    
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($user) {
        api_response(['user' => $user]);
    } else {
        api_error('User not found', 404);
    }
}

// Update user role (acepta user_id numérico o cédula como username; roles en español o inglés)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_REQUEST['action']) && $_REQUEST['action'] === 'set_role') {
    $decoded = require_admin();
    $admin_id = $decoded->user_id;

    $target_user_id = $_POST['user_id'] ?? 0;
    $cedula = trim($_POST['cedula'] ?? '');
    $raw_role = trim($_POST['role'] ?? '');

    $pdo = db();

    if ($target_user_id == 0 && $cedula !== '') {
        $stmt = $pdo->prepare("SELECT id FROM users WHERE username = ?");
        $stmt->execute([$cedula]);
        $target_user_id = $stmt->fetchColumn() ?: 0;
    }

    if ($target_user_id == 0 || $raw_role === '') {
        api_error('user_id (o cedula) and role are required', 400);
    }

    $new_role = normalize_role($raw_role);
    $valid_roles = ['student', 'teacher', 'admin', 'academic', 'inactive'];
    if (!in_array($new_role, $valid_roles)) {
        api_error('Invalid role. Allowed: ' . implode(', ', $valid_roles), 400);
    }

    // Prevent admin from removing their own admin role via this endpoint (safety)
    if ($target_user_id == $admin_id && $new_role !== 'admin') {
        api_error('Cannot change your own role to non-admin via this endpoint', 400);
    }

    $stmt = $pdo->prepare("UPDATE users SET role = ? WHERE id = ?");
    $stmt->execute([$new_role, $target_user_id]);

    if ($stmt->rowCount() == 0) {
        api_error('User not found', 404);
    }

    api_response(['message' => 'User role updated successfully']);
}

// Delete user
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_REQUEST['action']) && $_REQUEST['action'] === 'delete') {
    $decoded = require_admin();
    
    $target_user_id = $_POST['user_id'] ?? 0;
    
    if ($target_user_id == 0) {
        api_error('user_id required', 400);
    }
    
    // Prevent self-deletion
    if ($target_user_id == $decoded->user_id) {
        api_error('Cannot delete your own account', 400);
    }
    
    $pdo = db();
    
    // Delete associated data first (grades, attendance, calendar events)
    $stmt = $pdo->prepare("DELETE FROM grades WHERE user_id = ?");
    $stmt->execute([$target_user_id]);
    
    $stmt = $pdo->prepare("DELETE FROM attendance WHERE user_id = ?");
    $stmt->execute([$target_user_id]);
    
    $stmt = $pdo->prepare("DELETE FROM calendar WHERE created_by = ?");
    $stmt->execute([$target_user_id]);
    
    // Delete user
    $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
    $stmt->execute([$target_user_id]);
    
    if ($stmt->rowCount() == 0) {
        api_error('User not found', 404);
    }
    
    api_response(['success' => true, 'message' => 'User deleted successfully']);
}

// Bulk import users from CSV
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_REQUEST['action']) && $_REQUEST['action'] === 'import') {
    $decoded = require_admin();
    
    // Handle CSV upload
    if (!isset($_FILES['csv_file']) || $_FILES['csv_file']['error'] !== UPLOAD_ERR_OK) {
        api_error('CSV file is required', 400);
    }
    
    $csv_file = $_FILES['csv_file']['tmp_name'];
    
    if (($handle = fopen($csv_file, 'r')) === false) {
        api_error('Could not open CSV file', 500);
    }
    
    $pdo = db();
    $imported = 0;
    $errors = 0;
    
    // Skip header row
    $header = fgetcsv($handle, 1000, ',');
    
    while (($row = fgetcsv($handle, 1000, ',')) !== false) {
        // Expected columns: username, password, firstname, lastname, email, course_id, role
        if (count($row) < 7) {
            $errors++;
            continue;
        }
        
        extract([
            'username' => $row[0],
            'password' => $row[1],
            'firstname' => $row[2],
            'lastname' => $row[3],
            'email' => $row[4] ?? '',
            'course_id' => $row[5] ?? null,
            'role' => $row[6] ?? 'student'
        ]);
        
        // Validate required fields
        if (empty($username) || empty($password) || empty($firstname) || empty($lastname)) {
            $errors++;
            continue;
        }
        
        // Validate role
        $valid_roles = ['student', 'teacher', 'admin', 'academic'];
        if (!in_array($role, $valid_roles)) {
            $role = 'student'; // default to student
        }
        
        // Check if username already exists
        $stmt = $pdo->prepare("SELECT id FROM users WHERE username = ?");
        $stmt->execute([$username]);
        
        if ($stmt->fetchColumn()) {
            $errors++;
            continue;
        }
        
        // Hash password
        $hashed_password = password_hash($password, PASSWORD_DEFAULT);
        
        // Insert user
        $stmt = $pdo->prepare(
            "INSERT INTO users (username, password, firstname, lastname, email, course_id, role) 
             VALUES (?, ?, ?, ?, ?, ?, ?)"
        );
        
        try {
            $stmt->execute([$username, $hashed_password, $firstname, $lastname, $email, $course_id, $role]);
            $imported++;
        } catch (PDOException $e) {
            $errors++;
        }
    }
    
    fclose($handle);
    
    api_response([
        'success' => true,
        'imported' => $imported,
        'errors' => $errors,
        'message' => "$imported users imported, $errors errors"
    ]);
}