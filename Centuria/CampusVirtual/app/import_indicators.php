<?php
/**
 * import_indicators.php – crea categorías y items de calificación a partir de indicators.json
 * Ejecutar: docker exec -i moodle_web php /var/www/html/local/import_indicators.php
 * O localmente: php import_indicators.php (si Moodle está en ./moodle)
 */
$cfgCandidates = [__DIR__.'/moodle/public/config.php', __DIR__.'/moodle/config.php', __DIR__.'/config.php'];
$found=false; foreach($cfgCandidates as $c){ if(file_exists($c)){ require_once($c); $found=true; break; } }
if(!$found) die("No se encontró config.php (probado: ".implode(', ',$cfgCandidates).")\n");
require_once($CFG->dirroot.'/lib/gradelib.php');
$jsonPath = __DIR__.'/indicators.json';
if (!file_exists($jsonPath)) {
    $jsonPath = __DIR__.'/../indicators.json';
}
$json = file_get_contents($jsonPath);
if (!$json) {
    die("No se pudo leer indicators.json en $jsonPath\n");
}
$data = json_decode($json, true);
if (!$data) {
    die("JSON inválido en indicators.json\n");
}
// ID del curso destino - CAMBIAR según tu Moodle
$courseid = 2; // <-- reemplaza con el ID del curso donde quieras los criterios
if (isset($argv[1])) { $courseid = intval($argv[1]); }

$course = $DB->get_record('course', ['id' => $courseid]);
if (!$course) {
    die("Curso ID $courseid no encontrado. Crea un curso en Moodle primero (ej. TIC - Unidad I) y usa su ID.\n");
}
echo "Curso encontrado: {$course->fullname} (ID $courseid)\n";

// Para cada unidad crear una categoría y sus indicadores
foreach ($data as $unit => $indicators) {
    // 1️⃣ Crear categoría (unidad)
    $category = $DB->get_record('grade_categories', ['courseid' => $courseid, 'fullname' => $unit]);
    if (!$category) {
        $cat = new grade_category(['courseid'=>$courseid, 'fullname'=>$unit, 'aggregation'=>GRADE_AGGREGATE_WEIGHTED_MEAN], false);
        $cat->insert();
        $category = $DB->get_record('grade_categories', ['courseid' => $courseid, 'fullname' => $unit]);
        echo "  + Categoría creada: $unit (ID {$category->id})\n";
    } else {
        echo "  = Categoría existe: $unit (ID {$category->id})\n";
    }
    // 2️⃣ Crear ítems (indicadores) dentro de la categoría
    foreach ($indicators as $ind) {
        $existing = $DB->get_record('grade_items', ['courseid'=>$courseid, 'itemname'=>$ind['name'], 'categoryid'=>$category->id]);
        if ($existing) {
            echo "    - Ya existe: {$ind['name']}\n";
            continue;
        }
        $grade = new grade_item([
            'courseid' => $courseid,
            'itemname' => $ind['name'],
            'gradetype' => GRADE_TYPE_VALUE,
            'grademax' => $ind['points'],
            'grademin' => 0,
            'categoryid' => $category->id
        ], false);
        $grade->insert();
        echo "    + Item creado: {$ind['name']} ({$ind['points']} pts)\n";
    }
}
echo "✅  Indicadores importados al curso $courseid\n";
