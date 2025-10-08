CREATE DATABASE IF NOT EXISTS mysql_cl CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE mysql_cl;

CREATE TABLE IF NOT EXISTS medical_centers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    country_iso CHAR(2) NOT NULL DEFAULT 'CL',
    timezone VARCHAR(50) NOT NULL DEFAULT 'America/Santiago',
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
    country_iso CHAR(2) NOT NULL DEFAULT 'CL',
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
    country_iso CHAR(2) NOT NULL DEFAULT 'CL',
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
    country_iso CHAR(2) NOT NULL DEFAULT 'CL',
    booked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (schedule_id) REFERENCES medical_schedules(id),
    UNIQUE KEY unique_appointment (appointment_id),
    INDEX idx_schedule_country (schedule_id, country_iso)
);

INSERT INTO medical_centers (id, name, address, city, country_iso, timezone) VALUES
(10, 'RIMAC Centro Medico Las Condes', 'Av. Apoquindo 123', 'Santiago', 'CL', 'America/Santiago'),
(11, 'RIMAC Centro Medico Providencia', 'Av. Providencia 456', 'Santiago', 'CL', 'America/Santiago'),
(12, 'RIMAC Centro Medico Valparaiso', 'Calle Condell 789', 'Valparaiso', 'CL', 'America/Santiago'),
(13, 'RIMAC Centro Medico Concepcion', 'Av. O\'Higgins 321', 'Concepcion', 'CL', 'America/Santiago'),
(14, 'RIMAC Centro Medico Vina del Mar', 'Av. Libertad 654', 'Vina del Mar', 'CL', 'America/Santiago'),
(15, 'RIMAC Centro Medico La Serena', 'Calle Balmaceda 987', 'La Serena', 'CL', 'America/Santiago');

INSERT INTO specialities (id, name, description) VALUES
(11, 'Medicina General', 'Consulta medica general'),
(12, 'Cardiologia', 'Especialista en corazon'),
(13, 'Dermatologia', 'Especialista en piel'),
(14, 'Ginecologia', 'Especialista en salud femenina'),
(15, 'Pediatria', 'Especialista en ninos'),
(16, 'Oftalmologia', 'Especialista en ojos'),
(17, 'Traumatologia', 'Especialista en huesos y articulaciones'),
(18, 'Neurologia', 'Especialista en sistema nervioso'),
(19, 'Psiquiatria', 'Especialista en salud mental'),
(20, 'Urologia', 'Especialista en sistema urinario');

INSERT INTO doctors (id, first_name, last_name, license_number) VALUES
(10, 'Rodrigo', 'Silva', 'RUT-11111111'),
(11, 'Camila', 'Morales', 'RUT-22222222'),
(12, 'Felipe', 'Herrera', 'RUT-33333333'),
(13, 'Valentina', 'Castro', 'RUT-44444444'),
(14, 'Sebastian', 'Rojas', 'RUT-55555555');


INSERT INTO medical_schedules (id, center_id, speciality_id, medic_id, appointment_date, country_iso) VALUES
(200, 10, 11, 10, '2025-10-10 08:00:00', 'CL'),
(201, 10, 11, 10, '2025-10-10 08:30:00', 'CL'),
(202, 10, 12, 11, '2025-10-10 09:00:00', 'CL'),
(203, 11, 13, 12, '2025-10-10 15:00:00', 'CL'),
(204, 12, 14, 13, '2025-10-11 10:00:00', 'CL'),
(205, 10, 11, 10, '2025-10-12 09:00:00', 'CL'),
(206, 10, 11, 10, '2025-10-12 13:30:00', 'CL');