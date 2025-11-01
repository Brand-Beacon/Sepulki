// Unit tests for fleet resolvers
// Tests fleet queries, mutations, and type resolvers

import { testEnv, createAuthenticatedContext, expectGraphQLSuccess } from '../setup';
import { fleetResolvers } from '../../src/resolvers/fleet';
import { NotFoundError, ValidationError } from '../../src/errors';
import { RobotStatus } from '@sepulki/shared-types';

describe('Fleet Resolvers', () => {
  let testFleetId: string;
  let testRobotId: string;
  let context: any;

  beforeEach(async () => {
    await testEnv.cleanDatabase();
    await testEnv.seedTestData();
    context = await createAuthenticatedContext();

    // Create test fleet
    const fleetResult = await testEnv.db.query(`
      INSERT INTO fleets (id, name, description, status, locus_id)
      VALUES (
        gen_random_uuid(),
        'Test Fleet',
        'Test fleet description',
        'ACTIVE',
        NULL
      )
      RETURNING id
    `);
    testFleetId = fleetResult.rows[0].id;

    // Create test robot
    const robotResult = await testEnv.db.query(`
      INSERT INTO robots (id, name, fleet_id, status)
      VALUES (
        gen_random_uuid(),
        'Test Robot',
        $1,
        'IDLE'
      )
      RETURNING id
    `, [testFleetId]);
    testRobotId = robotResult.rows[0].id;
  });

  describe('Query: fleets', () => {
    test('returns list of fleets', async () => {
      const result = await fleetResolvers.Query.fleets(
        null,
        {},
        context
      );

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('name');
    });

    test('filters fleets by status', async () => {
      const result = await fleetResolvers.Query.fleets(
        null,
        {
          filter: { status: 'ACTIVE' },
        },
        context
      );

      expect(result.every((fleet: any) => fleet.status === 'ACTIVE')).toBe(true);
    });

    test('applies pagination', async () => {
      const result = await fleetResolvers.Query.fleets(
        null,
        {
          limit: 1,
          offset: 0,
        },
        context
      );

      expect(result.length).toBeLessThanOrEqual(1);
    });
  });

  describe('Query: fleet', () => {
    test('returns fleet by id', async () => {
      const result = await fleetResolvers.Query.fleet(
        null,
        { id: testFleetId },
        context
      );

      expect(result).toBeDefined();
      expect(result.id).toBe(testFleetId);
      expect(result.name).toBe('Test Fleet');
    });

    test('throws NotFoundError for non-existent fleet', async () => {
      await expect(
        fleetResolvers.Query.fleet(
          null,
          { id: 'non-existent-id' },
          context
        )
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('Query: robots', () => {
    test('returns list of robots', async () => {
      const result = await fleetResolvers.Query.robots(
        null,
        {},
        context
      );

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    test('filters robots by fleetId', async () => {
      const result = await fleetResolvers.Query.robots(
        null,
        {
          fleetId: testFleetId,
        },
        context
      );

      expect(result.every((robot: any) => robot.fleet_id === testFleetId)).toBe(true);
    });

    test('filters robots by status', async () => {
      const result = await fleetResolvers.Query.robots(
        null,
        {
          status: RobotStatus.IDLE,
        },
        context
      );

      expect(result.every((robot: any) => robot.status === RobotStatus.IDLE)).toBe(true);
    });
  });

  describe('Query: robot', () => {
    test('returns robot by id', async () => {
      const result = await fleetResolvers.Query.robot(
        null,
        { id: testRobotId },
        context
      );

      expect(result).toBeDefined();
      expect(result.id).toBe(testRobotId);
    });

    test('throws NotFoundError for non-existent robot', async () => {
      await expect(
        fleetResolvers.Query.robot(
          null,
          { id: 'non-existent-id' },
          context
        )
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('Mutation: updateRobotStatus', () => {
    test('updates robot status', async () => {
      const result = await fleetResolvers.Mutation.updateRobotStatus(
        null,
        {
          robotId: testRobotId,
          status: RobotStatus.WORKING,
        },
        context
      );

      expect(result.status).toBe(RobotStatus.WORKING);
      expect(result.updated_at).toBeTruthy();
    });

    test('throws ValidationError for invalid status', async () => {
      await expect(
        fleetResolvers.Mutation.updateRobotStatus(
          null,
          {
            robotId: testRobotId,
            status: 'INVALID_STATUS',
          },
          context
        )
      ).rejects.toThrow(ValidationError);
    });

    test('throws NotFoundError for non-existent robot', async () => {
      await expect(
        fleetResolvers.Mutation.updateRobotStatus(
          null,
          {
            robotId: 'non-existent-id',
            status: RobotStatus.WORKING,
          },
          context
        )
      ).rejects.toThrow(NotFoundError);
    });

    test('publishes status change event', async () => {
      const publishSpy = jest.spyOn(context.redis, 'publish');

      await fleetResolvers.Mutation.updateRobotStatus(
        null,
        {
          robotId: testRobotId,
          status: RobotStatus.WORKING,
        },
        context
      );

      expect(publishSpy).toHaveBeenCalledWith(
        'robot:status',
        expect.stringContaining(testRobotId)
      );

      publishSpy.mockRestore();
    });
  });

  describe('Mutation: emergencyStop', () => {
    test('updates all robots in fleet to MAINTENANCE', async () => {
      // Create additional robots
      await testEnv.db.query(`
        INSERT INTO robots (id, name, fleet_id, status)
        VALUES (
          gen_random_uuid(),
          'Robot 2',
          $1,
          'WORKING'
        ),
        (
          gen_random_uuid(),
          'Robot 3',
          $1,
          'IDLE'
        )
      `, [testFleetId]);

      const result = await fleetResolvers.Mutation.emergencyStop(
        null,
        { fleetId: testFleetId },
        context
      );

      expect(result.status).toBe('MAINTENANCE');

      // Verify all robots are in MAINTENANCE
      const robots = await testEnv.db.query(
        'SELECT status FROM robots WHERE fleet_id = $1',
        [testFleetId]
      );
      expect(robots.rows.every((r: any) => r.status === 'MAINTENANCE')).toBe(true);
    });

    test('updates fleet status to MAINTENANCE', async () => {
      await fleetResolvers.Mutation.emergencyStop(
        null,
        { fleetId: testFleetId },
        context
      );

      const fleet = await testEnv.db.query(
        'SELECT status FROM fleets WHERE id = $1',
        [testFleetId]
      );
      expect(fleet.rows[0].status).toBe('MAINTENANCE');
    });

    test('cancels all active tasks for fleet', async () => {
      // Create a task
      const taskResult = await testEnv.db.query(`
        INSERT INTO tasks (id, name, type, status, created_by)
        VALUES (
          gen_random_uuid(),
          'Test Task',
          'PICK_AND_PLACE',
          'IN_PROGRESS',
          $1
        )
        RETURNING id
      `, [context.smith.id]);

      const taskId = taskResult.rows[0].id;

      // Assign task to robot
      await testEnv.db.query(`
        INSERT INTO task_robots (task_id, robot_id, assigned_at)
        VALUES ($1, $2, NOW())
      `, [taskId, testRobotId]);

      await fleetResolvers.Mutation.emergencyStop(
        null,
        { fleetId: testFleetId },
        context
      );

      const tasks = await testEnv.db.query(
        'SELECT status FROM tasks WHERE id = $1',
        [taskId]
      );
      expect(tasks.rows[0].status).toBe('CANCELLED');
    });

    test('publishes emergency stop event', async () => {
      const publishSpy = jest.spyOn(context.redis, 'publish');

      await fleetResolvers.Mutation.emergencyStop(
        null,
        { fleetId: testFleetId },
        context
      );

      expect(publishSpy).toHaveBeenCalledWith(
        'fleet:emergency_stop',
        expect.stringContaining(testFleetId)
      );

      publishSpy.mockRestore();
    });
  });

  describe('Fleet Type Resolvers', () => {
    test('Fleet.robots returns robots for fleet', async () => {
      const fleet = { id: testFleetId };
      const result = await fleetResolvers.Fleet.robots(
        fleet,
        {},
        context
      );

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    test('Fleet.locus returns locus when set', async () => {
      // Create locus
      const locusResult = await testEnv.db.query(`
        INSERT INTO loci (id, name, description)
        VALUES (
          gen_random_uuid(),
          'Test Locus',
          'Test locus description'
        )
        RETURNING id
      `);
      const locusId = locusResult.rows[0].id;

      // Update fleet with locus
      await testEnv.db.query(
        'UPDATE fleets SET locus_id = $1 WHERE id = $2',
        [locusId, testFleetId]
      );

      const fleet = { id: testFleetId, locus_id: locusId };
      const result = await fleetResolvers.Fleet.locus(
        fleet,
        {},
        context
      );

      expect(result).toBeDefined();
      expect(result.id).toBe(locusId);
    });

    test('Fleet.locus returns null when not set', async () => {
      const fleet = { id: testFleetId, locus_id: null };
      const result = await fleetResolvers.Fleet.locus(
        fleet,
        {},
        context
      );

      expect(result).toBeNull();
    });

    test('Robot.streamUrl generates stream URL', async () => {
      const robot = {
        id: testRobotId,
        name: 'Test Robot',
      };

      const result = await fleetResolvers.Robot.streamUrl(
        robot,
        {},
        context
      );

      expect(result).toBeDefined();
      expect(result).toContain('embed');
    });
  });
});

