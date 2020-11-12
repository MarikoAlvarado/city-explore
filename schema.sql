DROP TABLE IF EXISTS location;

CREATE TABLE location
(
  id SERIAL PRIMARY KEY,
  city VARCHAR(255),
  city_info VARCHAR(255),
  lat VARCHAR(255),
  lon VARCHAR(255)
);