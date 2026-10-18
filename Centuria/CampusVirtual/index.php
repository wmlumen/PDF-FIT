<?php
// Campus Virtual Centuria — Entry point (router)
$uri = $_SERVER['REQUEST_URI'];
$path = parse_url($uri, PHP_URL_PATH);

// CORS headers for ALL API requests
if (strpos($path, '/api/') === 0) {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');

    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }

    $apiFile = __DIR__ . $path;
    if (is_file($apiFile)) {
        require $apiFile;
        exit;
    }
    require __DIR__ . '/api/index.php';
    exit;
}

// Root: serve app/index.html
if ($path === '/' || $path === '' || $path === '/index.html') {
    header('Content-Type: text/html; charset=UTF-8');
    readfile(__DIR__ . '/app/index.html');
    exit;
}

// Static files: look in app/ directory
$appFile = __DIR__ . '/app' . $path;
if (is_file($appFile)) {
    $ext = strtolower(pathinfo($appFile, PATHINFO_EXTENSION));
    $mimeTypes = [
        'html' => 'text/html', 'css' => 'text/css', 'js' => 'application/javascript',
        'json' => 'application/json', 'png' => 'image/png', 'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg', 'gif' => 'image/gif', 'svg' => 'image/svg+xml',
        'ico' => 'image/x-icon', 'woff' => 'font/woff', 'woff2' => 'font/woff2',
        'ttf' => 'font/ttf', 'eot' => 'application/vnd.ms-fontobject',
    ];
    header('Content-Type: ' . ($mimeTypes[$ext] ?? 'application/octet-stream'));
    readfile($appFile);
    exit;
}

// Fallback: try root
$rootFile = __DIR__ . $path;
if (is_file($rootFile)) {
    $ext = strtolower(pathinfo($rootFile, PATHINFO_EXTENSION));
    $mimeTypes = [
        'html' => 'text/html', 'css' => 'text/css', 'js' => 'application/javascript',
        'json' => 'application/json', 'png' => 'image/png', 'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg', 'gif' => 'image/gif', 'svg' => 'image/svg+xml',
    ];
    header('Content-Type: ' . ($mimeTypes[$ext] ?? 'application/octet-stream'));
    readfile($rootFile);
    exit;
}

http_response_code(404);
echo 'Not Found';
