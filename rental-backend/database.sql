-- Rental Clothes database schema and seed data

DROP DATABASE IF EXISTS rental_clothes;
CREATE DATABASE rental_clothes;
USE rental_clothes;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fullname VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  address TEXT,
  isAdmin TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  stock INT DEFAULT 0,
  category VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  product_id INT NOT NULL,
  rental_date DATE NOT NULL,
  return_date DATE NOT NULL,
  qty INT NOT NULL,
  status ENUM('pending','confirmed','returned','cancelled') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

INSERT INTO users (fullname, email, password, isAdmin)
VALUES ('Administrator', 'admin@example.com', '$2a$10$7cWQKfK8IDU60mrk2mAVQun9Y8f2z8rZQ8kbOVA/GbTNfaohH5sTa', 1);
-- password is 'admin123'

INSERT INTO products (name, description, price, stock, category) VALUES
('Red Dress', 'Elegant red dress for events', 25.00, 10, 'Dress'),
('Black Suit', 'Classic black suit with tie', 35.00, 6, 'Suit'),
('Summer Hat', 'Straw hat for summer looks', 8.00, 15, 'Accessory');
