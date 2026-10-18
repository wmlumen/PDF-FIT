<?php
/**
 * Catálogos API — CRUD completo para Secciones, Carreras, Grados, Programas, Modalidades
 * Endpoints: list, create, update, delete
 * Requiere: auth admin para escritura, lectura pública
 */
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/auth.php';

// ═══ Tablas de catálogos ═══
function ensureCatalogTables($pdo) {
    $pdo->exec("CREATE TABLE IF NOT EXISTS catalogo_secciones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo TEXT UNIQUE NOT NULL,
        nombre TEXT DEFAULT '',
        carrera TEXT DEFAULT '',
        grado TEXT DEFAULT '',
        capacidad INTEGER DEFAULT 40,
        activa INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )");
    $pdo->exec("CREATE TABLE IF NOT EXISTS catalogo_carreras (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT UNIQUE NOT NULL,
        codigo TEXT DEFAULT '',
        grado TEXT DEFAULT '',
        activa INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )");
    $pdo->exec("CREATE TABLE IF NOT EXISTS catalogo_grados (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT UNIQUE NOT NULL,
        activa INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )");
    $pdo->exec("CREATE TABLE IF NOT EXISTS catalogo_programas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT UNIQUE NOT NULL,
        tipo TEXT DEFAULT '',
        activa INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )");
    $pdo->exec("CREATE TABLE IF NOT EXISTS catalogo_modalidades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT UNIQUE NOT NULL,
        activa INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )");
}

// ═══ LISTAR ═══
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['action']) && $_GET['action'] === 'list') {
    $tipo = $_GET['tipo'] ?? '';
    $pdo = db();
    ensureCatalogTables($pdo);

    $tablas = [
        'secciones'   => 'catalogo_secciones',
        'carreras'    => 'catalogo_carreras',
        'grados'      => 'catalogo_grados',
        'programas'   => 'catalogo_programas',
        'modalidades' => 'catalogo_modalidades',
    ];

    if ($tipo && isset($tablas[$tipo])) {
        $stmt = $pdo->query("SELECT * FROM {$tablas[$tipo]} WHERE activa = 1 ORDER BY id");
        api_response(['items' => $stmt->fetchAll(PDO::FETCH_ASSOC), 'tipo' => $tipo]);
    } else {
        // Devolver todos
        $resultado = [];
        foreach ($tablas as $key => $tabla) {
            $stmt = $pdo->query("SELECT * FROM {$tabla} WHERE activa = 1 ORDER BY id");
            $resultado[$key] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        }
        api_response($resultado);
    }
}

// ═══ CREAR ═══
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_REQUEST['action']) && $_REQUEST['action'] === 'create') {
    $auth = require_auth();
    if ($auth->role !== 'admin') api_error('Solo administradores', 403);

    $tipo = $_POST['tipo'] ?? '';
    $pdo = db();
    ensureCatalogTables($pdo);

    switch ($tipo) {
        case 'secciones':
            $codigo = strtoupper(trim($_POST['codigo'] ?? ''));
            $nombre = trim($_POST['nombre'] ?? '');
            $carrera = trim($_POST['carrera'] ?? '');
            $grado = trim($_POST['grado'] ?? '');
            $capacidad = intval($_POST['capacidad'] ?? 40);
            if (empty($codigo)) api_error('Código requerido', 400);
            $stmt = $pdo->prepare("INSERT INTO catalogo_secciones (codigo, nombre, carrera, grado, capacidad) VALUES (?,?,?,?,?)");
            try { $stmt->execute([$codigo, $nombre, $carrera, $grado, $capacidad]); }
            catch (PDOException $e) {
                if (strpos($e->getMessage(), 'UNIQUE') !== false) api_error('Ya existe una sección con ese código', 409);
                api_error('Error: ' . $e->getMessage(), 500);
            }
            api_response(['status' => 'Éxito', 'mensaje' => 'Sección creada', 'id' => $pdo->lastInsertId()]);
            break;

        case 'carreras':
            $nombre = trim($_POST['nombre'] ?? '');
            $codigo = strtoupper(trim($_POST['codigo'] ?? ''));
            $grado = trim($_POST['grado'] ?? '');
            if (empty($nombre)) api_error('Nombre requerido', 400);
            $stmt = $pdo->prepare("INSERT INTO catalogo_carreras (nombre, codigo, grado) VALUES (?,?,?)");
            try { $stmt->execute([$nombre, $codigo, $grado]); }
            catch (PDOException $e) {
                if (strpos($e->getMessage(), 'UNIQUE') !== false) api_error('Ya existe esa carrera', 409);
                api_error('Error: ' . $e->getMessage(), 500);
            }
            api_response(['status' => 'Éxito', 'mensaje' => 'Carrera creada', 'id' => $pdo->lastInsertId()]);
            break;

        case 'grados':
            $nombre = trim($_POST['nombre'] ?? '');
            if (empty($nombre)) api_error('Nombre requerido', 400);
            $stmt = $pdo->prepare("INSERT INTO catalogo_grados (nombre) VALUES (?)");
            try { $stmt->execute([$nombre]); }
            catch (PDOException $e) {
                if (strpos($e->getMessage(), 'UNIQUE') !== false) api_error('Ya existe ese grado', 409);
                api_error('Error: ' . $e->getMessage(), 500);
            }
            api_response(['status' => 'Éxito', 'mensaje' => 'Grado creado', 'id' => $pdo->lastInsertId()]);
            break;

        case 'programas':
            $nombre = trim($_POST['nombre'] ?? '');
            $tipo_prog = trim($_POST['tipo_prog'] ?? '');
            if (empty($nombre)) api_error('Nombre requerido', 400);
            $stmt = $pdo->prepare("INSERT INTO catalogo_programas (nombre, tipo) VALUES (?,?)");
            try { $stmt->execute([$nombre, $tipo_prog]); }
            catch (PDOException $e) {
                if (strpos($e->getMessage(), 'UNIQUE') !== false) api_error('Ya existe ese programa', 409);
                api_error('Error: ' . $e->getMessage(), 500);
            }
            api_response(['status' => 'Éxito', 'mensaje' => 'Programa creado', 'id' => $pdo->lastInsertId()]);
            break;

        case 'modalidades':
            $nombre = trim($_POST['nombre'] ?? '');
            if (empty($nombre)) api_error('Nombre requerido', 400);
            $stmt = $pdo->prepare("INSERT INTO catalogo_modalidades (nombre) VALUES (?)");
            try { $stmt->execute([$nombre]); }
            catch (PDOException $e) {
                if (strpos($e->getMessage(), 'UNIQUE') !== false) api_error('Ya existe esa modalidad', 409);
                api_error('Error: ' . $e->getMessage(), 500);
            }
            api_response(['status' => 'Éxito', 'mensaje' => 'Modalidad creada', 'id' => $pdo->lastInsertId()]);
            break;

        default:
            api_error('Tipo de catálogo no válido: ' . $tipo, 400);
    }
}

// ═══ EDITAR ═══
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_REQUEST['action']) && $_REQUEST['action'] === 'update') {
    $auth = require_auth();
    if ($auth->role !== 'admin') api_error('Solo administradores', 403);

    $tipo = $_POST['tipo'] ?? '';
    $id = intval($_POST['id'] ?? 0);
    if (!$id) api_error('ID requerido', 400);

    $pdo = db();
    ensureCatalogTables($pdo);

    switch ($tipo) {
        case 'secciones':
            $codigo = strtoupper(trim($_POST['codigo'] ?? ''));
            $nombre = trim($_POST['nombre'] ?? '');
            $carrera = trim($_POST['carrera'] ?? '');
            $grado = trim($_POST['grado'] ?? '');
            $capacidad = intval($_POST['capacidad'] ?? 40);
            if (empty($codigo)) api_error('Código requerido', 400);
            $stmt = $pdo->prepare("UPDATE catalogo_secciones SET codigo=?, nombre=?, carrera=?, grado=?, capacidad=? WHERE id=?");
            try { $stmt->execute([$codigo, $nombre, $carrera, $grado, $capacidad, $id]); }
            catch (PDOException $e) {
                if (strpos($e->getMessage(), 'UNIQUE') !== false) api_error('Ya existe otra sección con ese código', 409);
                api_error('Error', 500);
            }
            api_response(['status' => 'Éxito', 'mensaje' => 'Sección actualizada']);
            break;

        case 'carreras':
            $nombre = trim($_POST['nombre'] ?? '');
            $codigo = strtoupper(trim($_POST['codigo'] ?? ''));
            $grado = trim($_POST['grado'] ?? '');
            if (empty($nombre)) api_error('Nombre requerido', 400);
            $stmt = $pdo->prepare("UPDATE catalogo_carreras SET nombre=?, codigo=?, grado=? WHERE id=?");
            try { $stmt->execute([$nombre, $codigo, $grado, $id]); }
            catch (PDOException $e) {
                if (strpos($e->getMessage(), 'UNIQUE') !== false) api_error('Ya existe esa carrera', 409);
                api_error('Error', 500);
            }
            api_response(['status' => 'Éxito', 'mensaje' => 'Carrera actualizada']);
            break;

        case 'grados':
            $nombre = trim($_POST['nombre'] ?? '');
            if (empty($nombre)) api_error('Nombre requerido', 400);
            $stmt = $pdo->prepare("UPDATE catalogo_grados SET nombre=? WHERE id=?");
            try { $stmt->execute([$nombre, $id]); }
            catch (PDOException $e) {
                if (strpos($e->getMessage(), 'UNIQUE') !== false) api_error('Ya existe ese grado', 409);
                api_error('Error', 500);
            }
            api_response(['status' => 'Éxito', 'mensaje' => 'Grado actualizado']);
            break;

        case 'programas':
            $nombre = trim($_POST['nombre'] ?? '');
            $tipo_prog = trim($_POST['tipo_prog'] ?? '');
            if (empty($nombre)) api_error('Nombre requerido', 400);
            $stmt = $pdo->prepare("UPDATE catalogo_programas SET nombre=?, tipo=? WHERE id=?");
            try { $stmt->execute([$nombre, $tipo_prog, $id]); }
            catch (PDOException $e) {
                if (strpos($e->getMessage(), 'UNIQUE') !== false) api_error('Ya existe ese programa', 409);
                api_error('Error', 500);
            }
            api_response(['status' => 'Éxito', 'mensaje' => 'Programa actualizado']);
            break;

        case 'modalidades':
            $nombre = trim($_POST['nombre'] ?? '');
            if (empty($nombre)) api_error('Nombre requerido', 400);
            $stmt = $pdo->prepare("UPDATE catalogo_modalidades SET nombre=? WHERE id=?");
            try { $stmt->execute([$nombre, $id]); }
            catch (PDOException $e) {
                if (strpos($e->getMessage(), 'UNIQUE') !== false) api_error('Ya existe esa modalidad', 409);
                api_error('Error', 500);
            }
            api_response(['status' => 'Éxito', 'mensaje' => 'Modalidad actualizada']);
            break;

        default:
            api_error('Tipo no válido', 400);
    }
}

// ═══ ELIMINAR (desactivar) ═══
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_REQUEST['action']) && $_REQUEST['action'] === 'delete') {
    $auth = require_auth();
    if ($auth->role !== 'admin') api_error('Solo administradores', 403);

    $tipo = $_POST['tipo'] ?? '';
    $id = intval($_POST['id'] ?? 0);
    if (!$id) api_error('ID requerido', 400);

    $pdo = db();
    ensureCatalogTables($pdo);

    $tablas = [
        'secciones'   => 'catalogo_secciones',
        'carreras'    => 'catalogo_carreras',
        'grados'      => 'catalogo_grados',
        'programas'   => 'catalogo_programas',
        'modalidades' => 'catalogo_modalidades',
    ];

    if (!isset($tablas[$tipo])) api_error('Tipo no válido', 400);

    $stmt = $pdo->prepare("UPDATE {$tablas[$tipo]} SET activa = 0 WHERE id = ?");
    $stmt->execute([$id]);
    api_response(['status' => 'Éxito', 'mensaje' => ucfirst($tipo) . ' desactivado(a)']);
}
