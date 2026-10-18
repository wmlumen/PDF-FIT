<?php
/**
 * Database module for Centuria API
 * SQLite schema and connection utilities
 * 
 * Tables:
 * - users (id, username, password, firstname, lastname, email, course_id, role, created_at)
 * - courses (id, name, shortname, description, created_by, created_at)
 * - grades (id, user_id, course_id, component, score, max_score, created_at)
 * - attendance (id, user_id, course_id, date, status, created_at)
 * - calendar (id, title, description, start_date, end_date, all_day, created_by, created_at)
 * - sessions (id, token, user_id, expires, created_at)
 */

// Singleton database connection
class Database {
    private static $instance = null;
    private $pdo;
    
    private function __construct() {
        $dbPath = dirname(__FILE__) . '/../../../../CenturiaDB/centuria.db';
        // Normalize path for both development and production
        if (!file_exists($dbPath)) {
            $dbPath = dirname(__FILE__) . '/centuria.db';
        }
        if (!file_exists($dbPath)) {
            $dbPath = __DIR__ . '/centuria.db';
        }
        
        $this->pdo = new PDO("sqlite:$dbPath");
        $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $this->pdo->exec("PRAGMA journal_mode=WAL");
        $this->pdo->exec("PRAGMA foreign_keys=ON");
        $this->pdo->exec("PRAGMA encoding='UTF-8'");
        
        $this->create_tables();
    }
    
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new Database();
        }
        return self::$instance;
    }
    
    public function getPdo() {
        return $this->pdo;
    }
    
    private function create_tables() {
        $schema = [
            // users table
            "CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                firstname TEXT NOT NULL,
                lastname TEXT NOT NULL,
                email TEXT DEFAULT '',
                course_id INTEGER,
                role TEXT DEFAULT 'student',
                telefono TEXT DEFAULT '',
                grado TEXT DEFAULT '',
                carrera TEXT DEFAULT '',
                seccion TEXT DEFAULT '',
                foto TEXT DEFAULT '',
                estado TEXT DEFAULT 'activo' CHECK(estado IN ('activo','pendiente','inactivo')),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (course_id) REFERENCES courses(id)
            )",
            
            // courses table
            "CREATE TABLE IF NOT EXISTS courses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                shortname TEXT UNIQUE NOT NULL,
                description TEXT,
                created_by INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(id)
            )",
            
            // grades table
            "CREATE TABLE IF NOT EXISTS grades (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                course_id INTEGER NOT NULL,
                component VARCHAR(100) NOT NULL,
                score REAL DEFAULT 0,
                max_score REAL DEFAULT 100,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (course_id) REFERENCES courses(id)
            )",
            
            // attendance table
            "CREATE TABLE IF NOT EXISTS attendance (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                course_id INTEGER NOT NULL,
                date DATE NOT NULL,
                status TEXT DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'excused')),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (course_id) REFERENCES courses(id),
                UNIQUE(user_id, course_id, date)
            )",
            
            // calendar table
            "CREATE TABLE IF NOT EXISTS calendar (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT,
                start_date DATETIME NOT NULL,
                end_date DATETIME,
                all_day BOOLEAN DEFAULT 0,
                created_by INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (created_by) REFERENCES users(id)
            )",
            
            // documentos table (actas, planillas, registros y planes del docente)
            "CREATE TABLE IF NOT EXISTS documentos (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tipo TEXT NOT NULL CHECK (tipo IN ('acta', 'planilla', 'registro', 'plan')),
                curso TEXT DEFAULT '',
                periodo TEXT DEFAULT '',
                datos TEXT DEFAULT '{}',
                docente TEXT DEFAULT '',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(tipo, curso, periodo)
            )",

            // sessions table
            "CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                token VARCHAR(255) UNIQUE NOT NULL,
                user_id INTEGER NOT NULL,
                expires DATETIME NOT NULL,
                ip_address VARCHAR(45),
                user_agent TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )",

            // ═══ NUEVAS TABLAS: Perfil, Multi-roles, Roles ═══

            // user_roles: soporte multi-rol por usuario
            "CREATE TABLE IF NOT EXISTS user_roles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                rol TEXT NOT NULL,
                carrera TEXT DEFAULT '',
                seccion TEXT DEFAULT '',
                asignatura TEXT DEFAULT '',
                estado TEXT DEFAULT 'activo' CHECK(estado IN ('activo','inactivo','pendiente')),
                asignado_por TEXT DEFAULT '',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )",

            // roles_config: catálogo de roles con permisos JSON
            "CREATE TABLE IF NOT EXISTS roles_config (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT UNIQUE NOT NULL,
                descripcion TEXT DEFAULT '',
                permisos TEXT DEFAULT '{}',
                color TEXT DEFAULT '#64748b',
                icono TEXT DEFAULT 'bi-person',
                activo INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )",

            // usuarios_registrados: cola de aprobación para nuevos registros
            "CREATE TABLE IF NOT EXISTS usuarios_pendientes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cedula TEXT UNIQUE NOT NULL,
                nombre TEXT NOT NULL,
                apellido TEXT NOT NULL,
                email TEXT DEFAULT '',
                telefono TEXT DEFAULT '',
                grado TEXT DEFAULT '',
                carrera TEXT DEFAULT '',
                seccion TEXT DEFAULT '',
                foto TEXT DEFAULT '',
                estado TEXT DEFAULT 'pendiente' CHECK(estado IN ('pendiente','aprobado','rechazado')),
                observaciones TEXT DEFAULT '',
                revisado_por TEXT DEFAULT '',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                reviewed_at DATETIME
            )"
        ];
        
        foreach ($schema as $sql) {
            $this->pdo->exec($sql);
        }
    }
}

// Convenience function to get DB instance
function db() {
    return Database::getInstance()->getPdo();
}