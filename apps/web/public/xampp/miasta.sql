SET NAMES utf8mb4;

CREATE TABLE miasta (
    id INT PRIMARY KEY,
    nazwa VARCHAR(80) NOT NULL
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO miasta (id, nazwa) VALUES
    (1, 'Łódź'),
    (2, 'Gdańsk');
