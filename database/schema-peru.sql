CREATE DATABASE IF NOT EXISTS mysql_pe CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE mysql_pe;

CREATE TABLE IF NOT EXISTS medical_centers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    country_iso CHAR(2) NOT NULL DEFAULT 'PE',
    timezone VARCHAR(50) NOT NULL DEFAULT 'America/Lima',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_country_active (country_iso, is_active)
);

CREATE TABLE IF NOT EXISTS specialities (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS doctors (
    id INT PRIMARY KEY AUTO_INCREMENT,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    license_number VARCHAR(50) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS doctor_specialities (
    doctor_id INT NOT NULL,
    speciality_id INT NOT NULL,
    PRIMARY KEY (doctor_id, speciality_id),
    FOREIGN KEY (doctor_id) REFERENCES doctors(id),
    FOREIGN KEY (speciality_id) REFERENCES specialities(id)
);

CREATE TABLE IF NOT EXISTS doctor_centers (
    doctor_id INT NOT NULL,
    center_id INT NOT NULL,
    PRIMARY KEY (doctor_id, center_id),
    FOREIGN KEY (doctor_id) REFERENCES doctors(id),
    FOREIGN KEY (center_id) REFERENCES medical_centers(id)
);

CREATE TABLE IF NOT EXISTS medical_schedules (
    id INT PRIMARY KEY AUTO_INCREMENT,
    center_id INT NOT NULL,
    speciality_id INT NOT NULL,
    medic_id INT NOT NULL,
    appointment_date DATETIME NOT NULL,
    country_iso CHAR(2) NOT NULL DEFAULT 'PE',
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (center_id) REFERENCES medical_centers(id),
    FOREIGN KEY (speciality_id) REFERENCES specialities(id),
    FOREIGN KEY (medic_id) REFERENCES doctors(id),
    INDEX idx_country_available (country_iso, is_available),
    INDEX idx_appointment_date (appointment_date),
    INDEX idx_center_date (center_id, appointment_date)
);

CREATE TABLE IF NOT EXISTS processed_appointments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    appointment_id VARCHAR(100) NOT NULL UNIQUE,
    insured_id VARCHAR(5) NOT NULL,
    schedule_id INT NOT NULL,
    country_iso CHAR(2) NOT NULL DEFAULT 'PE',
    center_id INT,
    speciality_id INT,
    medic_id INT,
    appointment_date DATETIME,
    status ENUM('pending', 'completed', 'failed', 'cancelled') NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (schedule_id) REFERENCES medical_schedules(id),
    FOREIGN KEY (center_id) REFERENCES medical_centers(id),
    FOREIGN KEY (speciality_id) REFERENCES specialities(id),
    FOREIGN KEY (medic_id) REFERENCES doctors(id),
    INDEX idx_insured_country (insured_id, country_iso),
    INDEX idx_status_country (status, country_iso),
    INDEX idx_appointment_date (appointment_date)
);

CREATE TABLE IF NOT EXISTS schedule_bookings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    schedule_id INT NOT NULL,
    appointment_id VARCHAR(100) NOT NULL,
    country_iso CHAR(2) NOT NULL DEFAULT 'PE',
    booked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (schedule_id) REFERENCES medical_schedules(id),
    UNIQUE KEY unique_appointment (appointment_id),
    INDEX idx_schedule_country (schedule_id, country_iso)
);

INSERT INTO medical_centers (id, name, address, city, country_iso, timezone) VALUES
(1, 'RIMAC Centro Medico San Isidro', 'Av. El Golf 123', 'Lima', 'PE', 'America/Lima'),
(2, 'RIMAC Centro Medico Miraflores', 'Av. Larco 456', 'Lima', 'PE', 'America/Lima'),
(3, 'RIMAC Centro Medico La Molina', 'Av. Javier Prado 789', 'Lima', 'PE', 'America/Lima'),
(4, 'RIMAC Centro Medico Arequipa', 'Calle Mercaderes 321', 'Arequipa', 'PE', 'America/Lima'),
(5, 'RIMAC Centro Medico Trujillo', 'Av. Espana 654', 'Trujillo', 'PE', 'America/Lima');

INSERT INTO specialities (id, name, description) VALUES
(1, 'Medicina General', 'Consulta medica general'),
(2, 'Cardiologia', 'Especialista en corazon'),
(3, 'Dermatologia', 'Especialista en piel'),
(4, 'Ginecologia', 'Especialista en salud femenina'),
(5, 'Pediatria', 'Especialista en ninos'),
(6, 'Oftalmologia', 'Especialista en ojos'),
(7, 'Traumatologia', 'Especialista en huesos y articulaciones'),
(8, 'Neurologia', 'Especialista en sistema nervioso'),
(9, 'Psiquiatria', 'Especialista en salud mental'),
(10, 'Urologia', 'Especialista en sistema urinario');

INSERT INTO doctors (id, first_name, last_name, license_number) VALUES
(1, 'Carlos', 'Mendoza', 'CMP-12345'),
(2, 'Maria', 'Gonzalez', 'CMP-12346'),
(3, 'Jose', 'Rios', 'CMP-12347'),
(4, 'Ana', 'Torres', 'CMP-12348'),
(5, 'Luis', 'Vargas', 'CMP-12349');

INSERT INTO medical_schedules (id, center_id, speciality_id, medic_id, appointment_date, country_iso) VALUES
(100, 1, 1, 1, '2025-10-10 09:00:00', 'PE'),
(101, 1, 1, 1, '2025-10-10 09:30:00', 'PE'),
(102, 1, 2, 2, '2025-10-10 10:00:00', 'PE'),
(103, 2, 3, 3, '2025-10-10 14:00:00', 'PE'),
(104, 3, 4, 4, '2025-10-11 08:00:00', 'PE');