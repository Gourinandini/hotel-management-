CREATE TABLE hotels (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    rating FLOAT,
    lat FLOAT,
    lon FLOAT,
    tier VARCHAR(20) DEFAULT 'medium'
);

CREATE TABLE spots (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    district VARCHAR(100) NOT NULL,
    description TEXT,
    lat FLOAT,
    lon FLOAT
);

CREATE TABLE restaurants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    district VARCHAR(100) NOT NULL,
    description TEXT,
    lat FLOAT,
    lon FLOAT
);

CREATE TABLE rooms (
    id SERIAL PRIMARY KEY,
    hotel_id INT REFERENCES hotels(id),
    room_number VARCHAR(50) NOT NULL,
    type VARCHAR(100),
    price_per_night DECIMAL(10, 2)
);

CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    hotel_id INT REFERENCES hotels(id),
    room_id INT REFERENCES rooms(id),
    customer_name VARCHAR(255),
    customer_email VARCHAR(255),
    start_date DATE,
    end_date DATE,
    total_price DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE outbox (
    id SERIAL PRIMARY KEY,
    aggregate_type VARCHAR(100),
    aggregate_id VARCHAR(100),
    type VARCHAR(100),
    payload JSONB,
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert dummy data (Kerala, India)
INSERT INTO hotels (name, location, rating, lat, lon, tier) VALUES 
-- Kochi Cluster (City / Airport)
('Kochi Airport Transit Hotel', 'Kochi (0.5 miles from Airport)', 3.5, 10.1518, 76.3930, 'budget'),
('Grand Hyatt Kochi Bolgatty', 'Kochi (Downtown Island)', 4.8, 9.9839, 76.2691, 'luxury'),
('Fort Kochi Heritage Inn', 'Kochi (Fort Kochi Heritage Area)', 4.2, 9.9658, 76.2421, 'medium'),
-- Munnar Cluster (Hills)
('Munnar Tea Hills Resort', 'Munnar (Tea Gardens)', 4.6, 10.0889, 77.0595, 'medium'),
('Budget Retreat Munnar', 'Munnar (Town Center)', 3.0, 10.0800, 77.0600, 'budget'),
-- Alleppey (Backwaters)
('Alleppey Houseboat Stays', 'Alleppey (Backwaters)', 4.5, 9.4981, 76.3388, 'medium'),
('Lake Palace Resort', 'Alleppey (Vembanad Lake)', 4.7, 9.5050, 76.3400, 'luxury'),
-- Kovalam (Beach)
('Kovalam Beach Resort', 'Kovalam (Beachfront)', 4.3, 8.3988, 76.9786, 'medium'),
('Leela Kovalam', 'Kovalam (Cliff Top)', 4.9, 8.3881, 76.9760, 'luxury');

INSERT INTO rooms (hotel_id, room_number, type, price_per_night) VALUES 
-- Kochi Airport (Hotel 1)
(1, '101', 'Standard', 1145.00),
(1, '102', 'Double',1600.00),
-- Grand Hyatt (Hotel 2)
(2, '201', 'Standard', 5000.00),
(2, '202', 'Suite', 9000.00),
-- Fort Kochi Heritage (Hotel 3)
(3, '301', 'Heritage Room', 2990.00),
-- Munnar Tea Hills (Hotel 4)
(4, '401', 'Valley View', 2200.00),
(4, '402', 'Premium Suite',4200.00),
-- Budget Munnar (Hotel 5)
(5, '501', 'Basic', 730.00),
(5, '502', 'Basic',1130.00),
-- Alleppey Houseboat (Hotel 6)
(6, '601', 'Premium Houseboat', 3180.00),
(6, '602', 'Standard Bed', 1995.00),
-- Lake Palace (Hotel 7)
(7, '701', 'Lake Cottage',3250.00),
-- Kovalam Beach (Hotel 8)
(8, '801', 'Beach View', 2110.00),
-- Leela Kovalam (Hotel 9)
(9, '901', 'Club Suite', 2900.00),
(9, '902', 'Presidential Suite', 5500.00);
