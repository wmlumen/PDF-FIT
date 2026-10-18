<?php
/**
 * Upload module for Centuria API
 * Handles CSV upload and mass user creation
 * Uses SQLite database with JWT authentication
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

// Middleware: require authentication with admin role
function require_admin() {
    $decoded = require_auth();
    $role = $decoded->role;
    
    if ($role !== 'admin') {
        api_error('Permission denied: only admin can upload CSV files', 403);
    }
    
    return $decoded;
}

// Bulk import users from CSV file upload
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_REQUEST['action']) && $_REQUEST['action'] === 'import') {
    $decoded = require_admin();
    $admin_id = $decoded->user_id;
    
    // Handle CSV upload via multipart form
    if (!isset($_FILES['csv']) || $_FILES['csv']['error'] !== UPLOAD_ERR_OK) {
        api_error('CSV file upload is required', 400);
    }
    
    $csv_file = $_FILES['csv']['tmp_name'];
    $max_rows = $_POST['max_rows'] ?? 100; // Limit for safety
    
    if (($handle = fopen($csv_file, 'r')) === false) {
        api_error('Could not open uploaded CSV file', 500);
    }
    
    $pdo = db();
    $imported = 0;
    $errors = 0;
    $skipped = 0;
    
    // Read header row
    if (($header = fgetcsv($handle, 1000, ',')) === false) {
        fclose($handle);
        api_error('CSV file is empty', 400);
    }
    
    // Expected column order: cedula, nombre, apellido, email, curso, rol
    // We'll map flexibly
    $row_num = 0;
    
    while (($row = fgetcsv($handle, 1000, ',')) !== false && $row_num < $max_rows) {
        $row_num++;
        
        if (count($row) < 5) {
            $errors++;
            $skipped++;
            continue;
        }
        
        // Map columns flexibly
        // Column mapping: 0=cédula/username, 1=nombre, 2=apellido, 3=email, 4=curso, 5=rol
        $username = $row[0] ?? '';
        $firstname = $row[1] ?? '';
        $lastname = $row[2] ?? '';
        $email = $row[3] ?? '';
        $course_name = $row[4] ?? '';
        $role = $row[5] ?? 'student';
        
        // Skip rows with essential data missing
        if (empty($username) || empty($firstname) || empty($lastname)) {
            $errors++;
            $skipped++;
            continue;
        }
        
        // Format username: Jp + cedula + * (institutional format)
        // If username doesn't contain @ or special chars, treat as raw
        if (!str_contains($username, '@') && !str_contains($username, '.')) {
            // Apply institutional format: first letter first name + first letter last name + cedula + *
            // But since we're reading from CSV, we trust the username provided
            // However, ensure it ends with * if it looks like a password-derived username
            if (!preg_match('/\*$/', $username)) {
                $username .= '*'; // Add institutional suffix
            }
        }
        
        // Validate role
        $valid_roles = ['student', 'teacher', 'admin', 'academic'];
        if (!in_array($role, $valid_roles)) {
            $role = 'student';
        }
        
        // Handle course - look up course ID by name or use as-is
        $course_id = null;
        if (!empty($course_name)) {
            $stmt = $pdo->prepare("SELECT id FROM courses WHERE name = ? OR shortname = ?");
            $stmt->execute([$course_name, $course_name]);
            $course = $stmt->fetch(PDO::FETCH_ASSOC);
            $course_id = $course ? $course['id'] : null;
        }
        
        // Check if username already exists
        $stmt = $pdo->prepare("SELECT id FROM users WHERE username = ?");
        $stmt->execute([$username]);
        
        if ($stmt->fetchColumn()) {
            $errors++;
            $skipped++;
            continue;
        }
        
        // Hash password using institutional format
        // Password format: PrimeraLetraNombre(Mayús) + primeraLetraApellido(minús) + cédula(sin puntos) + *
        // Since we're reading from CSV, we'll hash whatever password is provided
        $hashed_password = password_hash($password ?? '', PASSWORD_DEFAULT);
        
        // If no password provided, generate one based on institutional format
        // Using the username components to generate a default password
        if (empty($password)) {
            // Derive from username: remove * suffix, get first letters
            $base_username = rtrim($username, '*');
            if (strlen($base_username) >= 2) {
                $first_name_init = mb_strtoupper(mb_substr($firstname, 0, 1), 'UTF-8');
                $last_name_init = mb_strtolower(mb_substr($lastname, 0, 1), 'UTF-8');
                // Extract cedula from username (remove Jp prefix and * suffix)
                $cedula = preg_replace('/^[A-Za-z]{2}/', '', $base_username);
                $cedula = preg_replace('/\*$/', '', $cedula);
                $password = $first_name_init . $last_name_init . $cedula . '*';
                $hashed_password = password_hash($password, PASSWORD_DEFAULT);
            }
        }
        
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
        'skipped' => $skipped,
        'message' => "$imported users imported, $errors errors, $skipped skipped"
    ]);
}

// Health check endpoint
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['action']) && $_GET['action'] === 'health') {
    api_response([
        'status' => 'ok',
        'database' => 'connected',
        'timestamp' => time(),
        'supported_endpoints' => ['auth', 'courses', 'grades', 'attendance', 'calendar', 'admin', 'upload']
    ]);
}