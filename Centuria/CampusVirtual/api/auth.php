<?php
/**
 * Authentication module for Centuria API
 * Handles login, registration, and session validation
 * Uses SQLite database with token-based auth (no JWT extension needed)
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/config.php';

// Helper: Generate password hash
function hash_password($password) {
    return password_hash($password, PASSWORD_DEFAULT);
}

// Helper: Verify password
function verify_password($password, $hash) {
    return password_verify($password, $hash);
}

// Helper: Generate session token
function generate_token($length = 32) {
    $characters = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    $token = '';
    for ($i = 0; $i < $length; $i++) {
        $token .= $characters[random_int(0, strlen($characters) - 1)];
    }
    return $token;
}

// Helper: Get IP address for session binding
function get_client_ip() {
    $ip = '0.0.0.0';
    if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $ip = $_SERVER['HTTP_X_FORWARDED_FOR'];
    } elseif (!empty($_SERVER['HTTP_X_REAL_IP'])) {
        $ip = $_SERVER['HTTP_X_REAL_IP'];
    } elseif (!empty($_SERVER['REMOTE_ADDR'])) {
        $ip = $_SERVER['REMOTE_ADDR'];
    }
    return $ip;
}

// Middleware: require authentication (sessions table)
function require_auth() {
    $auth_header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if (empty($auth_header) && function_exists('getallheaders')) {
        $h = getallheaders();
        $auth_header = $h['Authorization'] ?? $h['authorization'] ?? '';
    }

    if (empty($auth_header)) {
        api_error('Authorization header required', 401);
    }

    $parts = explode(' ', $auth_header);
    if (count($parts) !== 2 || $parts[0] !== 'Bearer') {
        api_error('Invalid authorization format', 401);
    }

    $pdo = db();
    $stmt = $pdo->prepare("SELECT s.user_id, u.role, u.username FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ? AND s.expires > datetime('now')");
    $stmt->execute([$parts[1]]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        api_error('Invalid or expired token', 401);
    }

    $obj = new stdClass();
    $obj->user_id = (int)$row['user_id'];
    $obj->role = $row['role'];
    $obj->username = $row['username'];
    return $obj;
}

// Login endpoint
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_REQUEST['action']) && $_REQUEST['action'] === 'login') {
    $username = $_POST['username'] ?? '';
    $password = $_POST['password'] ?? '';
    
    if (empty($username) || empty($password)) {
        api_error('Username and password required', 400);
    }
    
    $pdo = db();
    $stmt = $pdo->prepare("SELECT id, username, password, role, firstname, lastname FROM users WHERE username = ?");
    $stmt->execute([$username]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($user && verify_password($password, $user['password'])) {
        // Generate session token
        $token = generate_token(48);
        
        // Delete old tokens for this user
        $stmt = $pdo->prepare("DELETE FROM sessions WHERE user_id = ?");
        $stmt->execute([$user['id']]);
        
        // Store new token with IP and user agent binding
        $user_agent = !empty($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : '';
        $client_ip = get_client_ip();
        
        $stmt = $pdo->prepare(
            "INSERT INTO sessions (token, user_id, expires, ip_address, user_agent) 
             VALUES (?, ?, datetime('now', '+1 hour'), ?, ?)"
        );
        $stmt->execute([$token, $user['id'], $client_ip, $user_agent]);
        
        api_response([
            'token' => $token,
            'user' => [
                'id' => $user['id'],
                'username' => $user['username'],
                'firstname' => $user['firstname'],
                'lastname' => $user['lastname'],
                'role' => $user['role']
            ]
        ]);
    } else {
        api_error('Invalid credentials', 401);
    }
}

// Register endpoint
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_REQUEST['action']) && $_REQUEST['action'] === 'register') {
    $username = $_POST['username'] ?? '';
    $password = $_POST['password'] ?? '';
    $firstname = $_POST['firstname'] ?? '';
    $lastname = $_POST['lastname'] ?? '';
    $email = $_POST['email'] ?? '';
    $course_id = $_POST['course_id'] ?? null;
    $role = normalize_role($_POST['role'] ?? 'student');
    $telefono = $_POST['telefono'] ?? '';
    $grado = $_POST['grado'] ?? '';
    $carrera = $_POST['carrera'] ?? '';
    $seccion = $_POST['seccion'] ?? '';
    $foto = $_POST['foto'] ?? '';
    
    if (empty($username) || empty($password) || empty($firstname) || empty($lastname)) {
        api_error('All required fields must be provided', 400);
    }
    
    $pdo = db();
    
    // Check if username already exists
    $stmt = $pdo->prepare("SELECT id FROM users WHERE username = ?");
    $stmt->execute([$username]);
    
    if ($stmt->fetchColumn()) {
        api_error('Username already exists', 409);
    }
    
    // Hash password
    $hashed_password = hash_password($password);
    
    // Insert new user
    $stmt = $pdo->prepare(
        "INSERT INTO users (username, password, firstname, lastname, email, course_id, role, telefono, grado, carrera, seccion, foto) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    
    try {
        $stmt->execute([$username, $hashed_password, $firstname, $lastname, $email, $course_id, $role, $telefono, $grado, $carrera, $seccion, $foto]);
        
        $user_id = $pdo->lastInsertId();
        
        // Create session token for new user
        $token = generate_token(48);
        
        $user_agent = !empty($_SERVER['HTTP_USER_AGENT']) ? $_SERVER['HTTP_USER_AGENT'] : '';
        $client_ip = get_client_ip();
        
        $stmt = $pdo->prepare(
            "INSERT INTO sessions (token, user_id, expires, ip_address, user_agent) 
             VALUES (?, ?, datetime('now', '+1 hour'), ?, ?)"
        );
        $stmt->execute([$token, $user_id, $client_ip, $user_agent]);
        
        api_response([
            'token' => $token,
            'user' => [
                'id' => $user_id,
                'username' => $username,
                'firstname' => $firstname,
                'lastname' => $lastname,
                'role' => $role,
                'grado' => $grado,
                'carrera' => $carrera,
                'seccion' => $seccion,
                'foto' => $foto
            ]
        ], 201);
    } catch (PDOException $e) {
        api_error('Database error: ' . $e->getMessage(), 500);
    }
}

// Buscar usuario por cédula (para recuperar contraseña institucional).
// No expone el hash: el frontend deriva la contraseña con el formato oficial.
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['action']) && $_GET['action'] === 'find_user') {
    $cedula = trim($_GET['cedula'] ?? '');

    if ($cedula === '') {
        api_error('Cedula required', 400);
    }

    $pdo = db();
    $stmt = $pdo->prepare("SELECT username, firstname, lastname, role FROM users WHERE username = ?");
    $stmt->execute([$cedula]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($user) {
        api_response(['found' => true, 'user' => $user]);
    } else {
        api_response(['found' => false]);
    }
}

// Session validation endpoint
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['action']) && $_GET['action'] === 'validate') {
    $auth_header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    
    if (empty($auth_header)) {
        api_error('Authorization header required', 401);
    }
    
    // Extract token from Bearer token
    $parts = explode(' ', $auth_header);
    if (count($parts) !== 2 || $parts[0] !== 'Bearer') {
        api_error('Invalid authorization format', 401);
    }
    
    $token = $parts[1];
    
    // Verify token against sessions table
    $pdo = db();
    $stmt = $pdo->prepare("SELECT s.user_id, s.expires, u.role, u.firstname, u.lastname, u.username 
                           FROM sessions s 
                           JOIN users u ON s.user_id = u.id 
                           WHERE s.token = ? AND s.expires > datetime('now')");
    $stmt->execute([$token]);
    $session = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($session) {
        api_response([
            'valid' => true,
            'user' => [
                'id' => $session['user_id'],
                'username' => $session['username'],
                'firstname' => $session['firstname'],
                'lastname' => $session['lastname'],
                'role' => $session['role']
            ]
        ]);
    } else {
        api_error('Invalid or expired token', 401);
    }
}

// Logout endpoint
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_REQUEST['action']) && $_REQUEST['action'] === 'logout') {
    $auth_header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    
    if (!empty($auth_header)) {
        $parts = explode(' ', $auth_header);
        if (count($parts) === 2 && $parts[0] === 'Bearer') {
            $token = $parts[1];
            // Delete token from sessions table
            $pdo = db();
            $stmt = $pdo->prepare("DELETE FROM sessions WHERE token = ?");
            $stmt->execute([$token]);
        }
    }
    
    // Clear session
    session_destroy();
    
    api_response(['success' => true, 'message' => 'Logged out successfully']);
}