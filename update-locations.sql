-- SQL script to update fleet locations
-- You can run these commands directly in psql or via docker exec

-- Example: Move Demo Warehouse to Paris
UPDATE loci 
SET coordinates = '{"latitude": 48.8566, "longitude": 2.3522, "altitude": 35}'
WHERE name = 'Demo Warehouse';

-- Example: Move Development Lab to Seattle
UPDATE loci 
SET coordinates = '{"latitude": 47.6062, "longitude": -122.3321, "altitude": 10}'
WHERE name = 'Development Lab';

-- Example: Move Factory Simulation to Tokyo
UPDATE loci 
SET coordinates = '{"latitude": 35.6762, "longitude": 139.6503, "altitude": 20}'
WHERE name = 'Factory Simulation';

-- Verify the changes:
SELECT name, coordinates->>'latitude' as lat, coordinates->>'longitude' as lng, coordinates->>'altitude' as alt 
FROM loci 
ORDER BY name;

