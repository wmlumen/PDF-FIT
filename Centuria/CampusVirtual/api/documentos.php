<?php
/**
 * Documentos module for Centuria API
 * Persiste actas, planillas, registros de clase y planes (JSON) en SQLite.
 * La nómina y las calificaciones siempre salen de users/grades (proceso del sistema).
 */

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/auth.php';

$TIPOS = ['acta', 'planilla', 'registro', 'plan'];

// Obtener un documento guardado
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['action']) && $_GET['action'] === 'get') {
    $decoded = require_auth();
    $tipo = trim($_GET['tipo'] ?? '');
    $curso = trim($_GET['curso'] ?? '');
    $periodo = trim($_GET['periodo'] ?? '');

    if ($tipo === '') {
        api_error('tipo is required', 400);
    }

    $pdo = db();
    $stmt = $pdo->prepare("SELECT id, tipo, curso, periodo, datos, docente, updated_at FROM documentos WHERE tipo = ? AND curso = ? AND periodo = ?");
    $stmt->execute([$tipo, $curso, $periodo]);
    $doc = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($doc) {
        api_response(['found' => true, 'documento' => $doc]);
    } else {
        api_response(['found' => false]);
    }
}

// Listar documentos (filtro opcional por tipo/curso)
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['action']) && $_GET['action'] === 'list') {
    $decoded = require_auth();
    $tipo = trim($_GET['tipo'] ?? '');
    $curso = trim($_GET['curso'] ?? '');

    $pdo = db();
    $sql = "SELECT id, tipo, curso, periodo, docente, updated_at FROM documentos WHERE 1 = 1";
    $params = [];
    if ($tipo !== '') { $sql .= " AND tipo = ?"; $params[] = $tipo; }
    if ($curso !== '') { $sql .= " AND curso = ?"; $params[] = $curso; }
    $sql .= " ORDER BY updated_at DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    api_response(['documentos' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
}

// Guardar (crear o actualizar) un documento
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_REQUEST['action']) && $_REQUEST['action'] === 'save') {
    $decoded = require_auth();
    $role = $decoded->role;

    if (!in_array($role, ['teacher', 'admin', 'academic'])) {
        api_error('Permission denied: only teacher/admin/academic can save documents', 403);
    }

    $tipo = trim($_POST['tipo'] ?? '');
    $curso = trim($_POST['curso'] ?? '');
    $periodo = trim($_POST['periodo'] ?? '');
    $datos = $_POST['datos'] ?? '{}';
    $docente = trim($_POST['docente'] ?? '');

    if ($tipo === '' || !in_array($tipo, ['acta', 'planilla', 'registro', 'plan'])) {
        api_error('Valid tipo is required (acta, planilla, registro, plan)', 400);
    }

    // Validar que datos sea JSON válido
    json_decode($datos);
    if (json_last_error() !== JSON_ERROR_NONE) {
        api_error('datos must be valid JSON', 400);
    }

    $pdo = db();
    $stmt = $pdo->prepare(
        "INSERT INTO documentos (tipo, curso, periodo, datos, docente, updated_at)
         VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(tipo, curso, periodo)
         DO UPDATE SET datos = excluded.datos, docente = excluded.docente, updated_at = CURRENT_TIMESTAMP"
    );
    $stmt->execute([$tipo, $curso, $periodo, $datos, $docente]);

    api_response(['message' => 'Documento guardado en el sistema.']);
}

// Eliminar un documento
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_REQUEST['action']) && $_REQUEST['action'] === 'delete') {
    $decoded = require_auth();
    $role = $decoded->role;

    if (!in_array($role, ['teacher', 'admin', 'academic'])) {
        api_error('Permission denied', 403);
    }

    $id = $_POST['id'] ?? 0;
    if ($id == 0) {
        api_error('id is required', 400);
    }

    $pdo = db();
    $stmt = $pdo->prepare("DELETE FROM documentos WHERE id = ?");
    $stmt->execute([$id]);

    if ($stmt->rowCount() == 0) {
        api_error('Documento not found', 404);
    }

    api_response(['message' => 'Documento eliminado.']);
}
