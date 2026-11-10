-- Beyond Boundaries - MySQL schema
-- The app also creates these tables automatically on first start.

CREATE TABLE IF NOT EXISTS district_metrics (
  id INT PRIMARY KEY AUTO_INCREMENT,
  district_id VARCHAR(64) NOT NULL,          -- matches `id` in public/static/data/balochistan-districts.geojson
  name VARCHAR(120) NOT NULL,
  region VARCHAR(40),
  connectivity INT,                          -- digital-access index, 0-100
  learners INT,                              -- girls enrolled in digital-skills training
  earning INT,                               -- girls who earned online in the period
  mentors INT,
  hubs INT,                                  -- training / co-working access points
  year INT,
  source_type VARCHAR(16) NOT NULL DEFAULT 'sample',   -- 'sample' or 'verified'
  source_note VARCHAR(255),                  -- name the survey / programme for verified rows
  INDEX (district_id)
) CHARACTER SET utf8mb4;

CREATE TABLE IF NOT EXISTS aspirations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(40),
  district_id VARCHAR(64),
  career_id VARCHAR(64) NOT NULL,
  message VARCHAR(120),
  is_seed INT NOT NULL DEFAULT 0,
  created_at VARCHAR(32) NOT NULL
) CHARACTER SET utf8mb4;

CREATE TABLE IF NOT EXISTS simulations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  district_id VARCHAR(64),
  education VARCHAR(32),
  top_career VARCHAR(64),
  match_score INT,
  engine VARCHAR(32),
  created_at VARCHAR(32) NOT NULL
) CHARACTER SET utf8mb4;

-- Loading verified data: insert a row per district. Verified rows automatically
-- replace the sample figures in the map and analytics.
-- INSERT INTO district_metrics (district_id,name,region,connectivity,learners,earning,mentors,hubs,year,source_type,source_note)
-- VALUES ('quetta','Quetta','Central',81,2100,388,70,12,2026,'verified','Programme enrolment records, Jan-Jun 2026');
