<?php
// API Configuration - Centuria Portal Standalone
// Usa SQLite para persistencia, sin MySQL/Docker

// Base path for API routes
define('API_BASE_PATH', '/api/');

// SQLite database path (relative to CampusVirtual root)
define('DB_PATH', __DIR__ . '/centuria.db');

// CORS headers - allow all origins for development
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    http_response_code(204);
    exit;
}
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json; charset=UTF-8');

// Session configuration
session_name('centuria_session');
session_start();

// JWT settings
define('JWT_SECRET', 'Centuria2024SecretKeyChangeInProduction');
define('JWT_EXPIRY', 3600); // 1 hour in seconds

// Error reporting (development only)
if (PHP_SAPI === 'cli') {
    error_reporting(E_ALL);
    ini_set('display_errors', '1');
} else {
    error_reporting(E_ALL & ~E_WARNING);
    ini_set('display_errors', '0');
}

// Database configuration
$dbOptions = [
    'driver' => 'sqlite',
    'path' => DB_PATH,
    'charset' => 'utf8mb4'
];

// Response helper functions
// Respuesta plana: los campos de $data van al nivel raíz para que el
// frontend los lea directos (data.token, data.users, ...).
function api_response($data, $status_code = 200) {
    http_response_code($status_code);
    if (!is_array($data)) {
        $data = ['data' => $data];
    }
    echo json_encode(array_merge(
        ['success' => true, 'timestamp' => time()],
        $data
    ));
    exit;
}

// Normaliza roles en español (frontend) a inglés (backend/DB)
function normalize_role($role) {
    $map = [
        'alumno' => 'student',
        'docente' => 'teacher',
        'academico' => 'academic',
        'académico' => 'academic',
        'admin' => 'admin',
        'administrador' => 'admin',
        'student' => 'student',
        'teacher' => 'teacher',
        'academic' => 'academic',
        'inactivo' => 'inactive',
        'inactive' => 'inactive',
    ];
    $key = mb_strtolower(trim((string)$role), 'UTF-8');
    return $map[$key] ?? 'student';
}

function api_error($message, $status_code = 400) {
    http_response_code($status_code);
    echo json_encode([
        'success' => false,
        'error' => $message,
        'timestamp' => time()
    ]);
    exit;
}

// Database connection wrapper
function get_db() {
    global $dbOptions;
    static $instance = null;
    
    if ($instance === null) {
        $path = $dbOptions['path'];
        if (!file_exists($path)) {
            // Create database if not exists
            $instance = new PDO('sqlite:' . $path);
            $instance->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            // Initialize schema
            execute_schema($instance);
        } else {
            $instance = new PDO('sqlite:' . $path);
            $instance->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        }
    }
    
    return $instance;
}

function execute_schema(PDO $pdo) {
    $schema = file_dirname(__DIR__) . '/db_schema.sql';
    if (file_exists($schema)) {
        $pdo->exec(file_get_contents($schema));
    }
}