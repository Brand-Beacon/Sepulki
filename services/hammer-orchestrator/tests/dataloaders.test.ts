// Unit tests for dataloaders
// Tests DataLoader batching, caching, and error handling

import { setupDataLoaders } from '../../src/dataloaders';
import { Pool } from 'pg';

describe('DataLoaders', () => {
  let db: Pool;
  let dataloaders: ReturnType<typeof setupDataLoaders>;

  beforeEach(async () => {
    // Create test database pool
    db = new Pool({
      connectionString: process.env.TEST_DATABASE_URL || 
        'postgresql://smith:forge_dev@localhost:5432/sepulki_test',
      max: 10,
    });

    dataloaders = setupDataLoaders(db);
  });

  afterEach(async () => {
    // Clean up
    await db.end();
  });

  describe('Sepulka Loader', () => {
    test('loads single sepulka', async () => {
      // Create test sepulka
      const result = await db.query(`
        INSERT INTO sepulkas (id, name, description, version, status, pattern_id, created_by)
        VALUES (
          gen_random_uuid(),
          'Test Sepulka',
          'Test description',
          '1.0.0',
          'FORGING',
          NULL,
          gen_random_uuid()
        )
        RETURNING id
      `);
      const sepulkaId = result.rows[0].id;

      const sepulka = await dataloaders.sepulka.load(sepulkaId);

      expect(sepulka).toBeDefined();
      expect(sepulka?.id).toBe(sepulkaId);
      expect(sepulka?.name).toBe('Test Sepulka');
    });

    test('batches multiple requests', async () => {
      // Create multiple sepulkas
      const result1 = await db.query(`
        INSERT INTO sepulkas (id, name, description, version, status, pattern_id, created_by)
        VALUES (
          gen_random_uuid(),
          'Sepulka 1',
          'Description 1',
          '1.0.0',
          'FORGING',
          NULL,
          gen_random_uuid()
        )
        RETURNING id
      `);
      const id1 = result1.rows[0].id;

      const result2 = await db.query(`
        INSERT INTO sepulkas (id, name, description, version, status, pattern_id, created_by)
        VALUES (
          gen_random_uuid(),
          'Sepulka 2',
          'Description 2',
          '1.0.0',
          'FORGING',
          NULL,
          gen_random_uuid()
        )
        RETURNING id
      `);
      const id2 = result2.rows[0].id;

      // Load both in parallel (should batch into single query)
      const [sepulka1, sepulka2] = await Promise.all([
        dataloaders.sepulka.load(id1),
        dataloaders.sepulka.load(id2),
      ]);

      expect(sepulka1?.id).toBe(id1);
      expect(sepulka2?.id).toBe(id2);
    });

    test('returns null for non-existent sepulka', async () => {
      const sepulka = await dataloaders.sepulka.load('non-existent-id');

      expect(sepulka).toBeNull();
    });
  });

  describe('Fleet Loader', () => {
    test('loads single fleet', async () => {
      const result = await db.query(`
        INSERT INTO fleets (id, name, description, status)
        VALUES (
          gen_random_uuid(),
          'Test Fleet',
          'Test description',
          'ACTIVE'
        )
        RETURNING id
      `);
      const fleetId = result.rows[0].id;

      const fleet = await dataloaders.fleet.load(fleetId);

      expect(fleet).toBeDefined();
      expect(fleet?.id).toBe(fleetId);
    });

    test('batches multiple fleet requests', async () => {
      const result1 = await db.query(`
        INSERT INTO fleets (id, name, description, status)
        VALUES (
          gen_random_uuid(),
          'Fleet 1',
          'Description 1',
          'ACTIVE'
        )
        RETURNING id
      `);
      const id1 = result1.rows[0].id;

      const result2 = await db.query(`
        INSERT INTO fleets (id, name, description, status)
        VALUES (
          gen_random_uuid(),
          'Fleet 2',
          'Description 2',
          'ACTIVE'
        )
        RETURNING id
      `);
      const id2 = result2.rows[0].id;

      const [fleet1, fleet2] = await Promise.all([
        dataloaders.fleet.load(id1),
        dataloaders.fleet.load(id2),
      ]);

      expect(fleet1?.id).toBe(id1);
      expect(fleet2?.id).toBe(id2);
    });
  });

  describe('RobotsByFleet Loader', () => {
    test('loads robots for single fleet', async () => {
      // Create fleet
      const fleetResult = await db.query(`
        INSERT INTO fleets (id, name, description, status)
        VALUES (
          gen_random_uuid(),
          'Test Fleet',
          'Test description',
          'ACTIVE'
        )
        RETURNING id
      `);
      const fleetId = fleetResult.rows[0].id;

      // Create robots
      await db.query(`
        INSERT INTO robots (id, name, fleet_id, status)
        VALUES 
        (gen_random_uuid(), 'Robot 1', $1, 'IDLE'),
        (gen_random_uuid(), 'Robot 2', $1, 'IDLE')
      `, [fleetId]);

      const robots = await dataloaders.robotsByFleet.load(fleetId);

      expect(Array.isArray(robots)).toBe(true);
      expect(robots.length).toBe(2);
    });

    test('returns empty array for fleet with no robots', async () => {
      const fleetResult = await db.query(`
        INSERT INTO fleets (id, name, description, status)
        VALUES (
          gen_random_uuid(),
          'Empty Fleet',
          'Test description',
          'ACTIVE'
        )
        RETURNING id
      `);
      const fleetId = fleetResult.rows[0].id;

      const robots = await dataloaders.robotsByFleet.load(fleetId);

      expect(Array.isArray(robots)).toBe(true);
      expect(robots.length).toBe(0);
    });

    test('batches multiple fleet robot requests', async () => {
      const fleet1Result = await db.query(`
        INSERT INTO fleets (id, name, description, status)
        VALUES (
          gen_random_uuid(),
          'Fleet 1',
          'Description 1',
          'ACTIVE'
        )
        RETURNING id
      `);
      const fleet1Id = fleet1Result.rows[0].id;

      const fleet2Result = await db.query(`
        INSERT INTO fleets (id, name, description, status)
        VALUES (
          gen_random_uuid(),
          'Fleet 2',
          'Description 2',
          'ACTIVE'
        )
        RETURNING id
      `);
      const fleet2Id = fleet2Result.rows[0].id;

      await db.query(`
        INSERT INTO robots (id, name, fleet_id, status)
        VALUES (gen_random_uuid(), 'Robot 1', $1, 'IDLE')
      `, [fleet1Id]);

      const [robots1, robots2] = await Promise.all([
        dataloaders.robotsByFleet.load(fleet1Id),
        dataloaders.robotsByFleet.load(fleet2Id),
      ]);

      expect(robots1.length).toBe(1);
      expect(robots2.length).toBe(0);
    });
  });

  describe('Caching', () => {
    test('caches loaded entities', async () => {
      const result = await db.query(`
        INSERT INTO fleets (id, name, description, status)
        VALUES (
          gen_random_uuid(),
          'Test Fleet',
          'Test description',
          'ACTIVE'
        )
        RETURNING id
      `);
      const fleetId = result.rows[0].id;

      // First load
      const fleet1 = await dataloaders.fleet.load(fleetId);

      // Second load should use cache
      const fleet2 = await dataloaders.fleet.load(fleetId);

      expect(fleet1).toBe(fleet2); // Same object reference (cached)
    });

    test('clear removes from cache', async () => {
      const result = await db.query(`
        INSERT INTO fleets (id, name, description, status)
        VALUES (
          gen_random_uuid(),
          'Test Fleet',
          'Test description',
          'ACTIVE'
        )
        RETURNING id
      `);
      const fleetId = result.rows[0].id;

      await dataloaders.fleet.load(fleetId);
      dataloaders.fleet.clear(fleetId);

      // Update in database
      await db.query(
        'UPDATE fleets SET name = $1 WHERE id = $2',
        ['Updated Name', fleetId]
      );

      // Load again (should fetch fresh data)
      const fleet = await dataloaders.fleet.load(fleetId);
      expect(fleet?.name).toBe('Updated Name');
    });
  });
});

