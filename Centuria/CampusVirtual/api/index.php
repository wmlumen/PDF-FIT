<?php
// Centuria API — endpoint map
require_once __DIR__ . '/config.php';

api_response([
    'name' => 'Campus Virtual Centuria API',
    'version' => '1.0',
    'endpoints' => [
        'auth.php?action=login (POST: username, password)' => 'Iniciar sesión',
        'auth.php?action=register (POST: username, password, firstname, lastname)' => 'Registrar usuario',
        'auth.php?action=validate (GET + Bearer)' => 'Validar sesión',
        'auth.php?action=logout (POST + Bearer)' => 'Cerrar sesión',
        'courses.php?action=list|get|create|enroll' => 'Cursos',
        'grades.php?action=list|get|record|final' => 'Calificaciones',
        'attendance.php?action=list|mark|summary' => 'Asistencia',
        'calendar.php?action=list|get|create|update|delete' => 'Calendario',
        'admin.php?action=list|get|set_role|delete|import' => 'Administración',
        'upload.php?action=import|health' => 'Subidas y estado',
    ],
]);
