-- Seed Users — pass chung: P@ssw0rd
-- Chạy: sudo -u postgres psql wms_db -f seed_users.sql

INSERT INTO users (full_name, email, password_hash, is_active) VALUES
  ('Anh Luu',      'anhld@dnsvn.com',    '$2b$10$nfzoGsLJHBYlrvpztNq8r.YqndkaFrpuzAqW7xSLzuS7EaaZ1WumO', true),
  ('Hieu Dao',     'hieudd@dnsvn.com',   '$2b$10$nfzoGsLJHBYlrvpztNq8r.YqndkaFrpuzAqW7xSLzuS7EaaZ1WumO', true),
  ('Hieu Nguyen',  'hieunc@dnsvn.com',   '$2b$10$nfzoGsLJHBYlrvpztNq8r.YqndkaFrpuzAqW7xSLzuS7EaaZ1WumO', true),
  ('Khai Nguyen',  'khainq@dnsvn.com',   '$2b$10$nfzoGsLJHBYlrvpztNq8r.YqndkaFrpuzAqW7xSLzuS7EaaZ1WumO', true),
  ('Linh Nguyen',  'linhnth@dnsvn.com',  '$2b$10$nfzoGsLJHBYlrvpztNq8r.YqndkaFrpuzAqW7xSLzuS7EaaZ1WumO', true),
  ('Phong Nguyen', 'phongnn@dnsvn.com',  '$2b$10$nfzoGsLJHBYlrvpztNq8r.YqndkaFrpuzAqW7xSLzuS7EaaZ1WumO', true),
  ('Phuc Nguyen',  'phucnh@dnsvn.com',   '$2b$10$nfzoGsLJHBYlrvpztNq8r.YqndkaFrpuzAqW7xSLzuS7EaaZ1WumO', true),
  ('Thuy Nguyen',  'jade@dnsvn.com',     '$2b$10$nfzoGsLJHBYlrvpztNq8r.YqndkaFrpuzAqW7xSLzuS7EaaZ1WumO', true),
  ('Tran Nguyen',  'trannl@dnsvn.com',   '$2b$10$nfzoGsLJHBYlrvpztNq8r.YqndkaFrpuzAqW7xSLzuS7EaaZ1WumO', true),
  ('Trang Nguyen', 'trangnht@dnsvn.com', '$2b$10$nfzoGsLJHBYlrvpztNq8r.YqndkaFrpuzAqW7xSLzuS7EaaZ1WumO', true),
  ('Tu Le',        'tulv@dnsvn.com',     '$2b$10$nfzoGsLJHBYlrvpztNq8r.YqndkaFrpuzAqW7xSLzuS7EaaZ1WumO', true),
  ('Uyen Nguyen',  'uyennnp@dnsvn.com',  '$2b$10$nfzoGsLJHBYlrvpztNq8r.YqndkaFrpuzAqW7xSLzuS7EaaZ1WumO', true)
ON CONFLICT (email) DO NOTHING;
