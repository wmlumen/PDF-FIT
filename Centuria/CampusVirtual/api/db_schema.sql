-- Centuria API SQLite Schema
-- Compatible with SQLite (no ENUM support, uses CHECK constraints)
-- ==================================================

-- ============================================================
-- USERS table - Usuarios del sistema
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    firstname TEXT NOT NULL,
    lastname TEXT NOT NULL,
    email TEXT UNIQUE,
    course_id INTEGER,
    role TEXT DEFAULT 'student',
    telefono TEXT DEFAULT '',
    grado TEXT DEFAULT '',
    carrera TEXT DEFAULT '',
    seccion TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    FOREIGN KEY (course_id) REFERENCES courses(id),
    CHECK (role IN ('student', 'teacher', 'admin', 'academic'))
);

-- Indexes for role-based queries
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_course ON users(course_id);
CREATE INDEX idx_username ON users(username);

-- ============================================================
-- COURSES table - Cursos académicos
-- ============================================================
CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    shortname TEXT UNIQUE NOT NULL,
    description TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Index for course lookups
CREATE INDEX idx_courses_shortname ON courses(shortname);
CREATE INDEX idx_courses_created_by ON courses(created_by);

-- ============================================================
-- GRADES table - Calificaciones
-- ============================================================
CREATE TABLE IF NOT EXISTS grades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    component VARCHAR(100) NOT NULL,
    score REAL DEFAULT 0,
    max_score REAL DEFAULT 100,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    UNIQUE(user_id, course_id, component)
);

-- Indexes for grade queries
CREATE INDEX idx_grades_user ON grades(user_id);
CREATE INDEX idx_grades_course ON grades(course_id);
CREATE INDEX idx_grades_component ON grades(component);

-- ============================================================
-- ATTENDANCE table - Asistencia
-- ============================================================
CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    date DATE NOT NULL,
    status TEXT DEFAULT 'present',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
    UNIQUE(user_id, course_id, date)
);

-- Indexes for attendance queries
CREATE INDEX idx_attendance_user ON attendance(user_id);
CREATE INDEX idx_attendance_course ON attendance(course_id);
CREATE INDEX idx_attendance_date ON attendance(date);

-- ============================================================
-- CALENDAR table - Eventos y calendario
-- ============================================================
CREATE TABLE IF NOT EXISTS calendar (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    start_date DATETIME NOT NULL,
    end_date DATETIME,
    all_day INTEGER DEFAULT 0,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Indexes for calendar queries
CREATE INDEX idx_calendar_start ON calendar(start_date);
CREATE INDEX idx_calendar_created ON calendar(created_by);

-- ============================================================
-- SESSIONS table - Sesiones JWT / login
-- ============================================================
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token VARCHAR(255) UNIQUE NOT NULL,
    user_id INTEGER NOT NULL,
    expires DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index for session validation
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_user ON sessions(user_id);