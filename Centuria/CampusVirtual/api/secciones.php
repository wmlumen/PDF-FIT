<?php
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/auth.php';

// Listar secciones disponibles
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_REQUEST['action']) && $_REQUEST['action'] === 'list') {
    $pdo = db();
    // Crear tabla si no existe
    $pdo->exec("CREATE TABLE IF NOT EXISTS secciones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo TEXT UNIQUE NOT NULL,
        nombre TEXT DEFAULT '',
        carrera TEXT DEFAULT '',
        grado TEXT DEFAULT '',
        capacidad INTEGER DEFAULT 40,
        activa INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )");
    
    $stmt = $pdo->query("SELECT * FROM secciones WHERE activa = 1 ORDER BY codigo");
    $secciones = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    api_response(['secciones' => $secciones]);
}

// Crear sección (admin)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_REQUEST['action']) && $_REQUEST['action'] === 'create') {
    $auth = require_auth();
    if ($auth->role !== 'admin') {
        api_error('Solo administradores pueden crear secciones', 403);
    }
    
    $codigo = strtoupper(trim($_POST['codigo'] ?? ''));
    $nombre = trim($_POST['nombre'] ?? '');
    $carrera = trim($_POST['carrera'] ?? '');
    $grado = trim($_POST['grado'] ?? '');
    $capacidad = intval($_POST['capacidad'] ?? 40);
    
    if (empty($codigo)) {
        api_error('Código de sección requerido', 400);
    }
    
    $pdo = db();
    $pdo->exec("CREATE TABLE IF NOT EXISTS secciones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo TEXT UNIQUE NOT NULL,
        nombre TEXT DEFAULT '',
        carrera TEXT DEFAULT '',
        grado TEXT DEFAULT '',
        capacidad INTEGER DEFAULT 40,
        activa INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )");
    
    $stmt = $pdo->prepare("INSERT INTO secciones (codigo, nombre, carrera, grado, capacidad) VALUES (?, ?, ?, ?, ?)");
    try {
        $stmt->execute([$codigo, $nombre, $carrera, $grado, $capacidad]);
        api_response(['status' => 'Éxito', 'mensaje' => 'Sección creada', 'id' => $pdo->lastInsertId()]);
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'UNIQUE') !== false) {
            api_error('Ya existe una sección con ese código', 409);
        }
        api_error('Error al crear sección', 500);
    }
}

// Eliminar sección (admin)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_REQUEST['action']) && $_REQUEST['action'] === 'delete') {
    $auth = require_auth();
    if ($auth->role !== 'admin') {
        api_error('Solo administradores pueden eliminar secciones', 403);
    }
    
    $id = intval($_POST['id'] ?? 0);
    if (!$id) api_error('ID requerido', 400);
    
    $pdo = db();
    $stmt = $pdo->prepare("UPDATE secciones SET activa = 0 WHERE id = ?");
    $stmt->execute([$id]);
    api_response(['status' => 'Éxito', 'mensaje' => 'Sección desactivada']);
}

// Editar sección (admin)
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_REQUEST['action']) && $_REQUEST['action'] === 'update') {
    $auth = require_auth();
    if ($auth->role !== 'admin') {
        api_error('Solo administradores pueden editar secciones', 403);
    }
    
    $id = intval($_POST['id'] ?? 0);
    if (!$id) api_error('ID requerido', 400);
    
    $codigo = strtoupper(trim($_POST['codigo'] ?? ''));
    $nombre = trim($_POST['nombre'] ?? '');
    $carrera = trim($_POST['carrera'] ?? '');
    $grado = trim($_POST['grado'] ?? '');
    $capacidad = intval($_POST['capacidad'] ?? 40);
    
    if (empty($codigo)) api_error('Código de sección requerido', 400);
    
    $pdo = db();
    $stmt = $pdo->prepare("UPDATE secciones SET codigo = ?, nombre = ?, carrera = ?, grado = ?, capacidad = ? WHERE id = ?");
    try {
        $stmt->execute([$codigo, $nombre, $carrera, $grado, $capacidad, $id]);
        api_response(['status' => 'Éxito', 'mensaje' => 'Sección actualizada']);
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'UNIQUE') !== false) {
            api_error('Ya existe otra sección con ese código', 409);
        }
        api_error('Error al actualizar sección', 500);
    }
}
