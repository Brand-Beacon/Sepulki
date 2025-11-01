// Unit tests for task resolvers
// Tests task queries, mutations, and type resolvers

import { testEnv, createAuthenticatedContext } from '../setup';
import { taskResolvers } from '../../src/resolvers/task';
import { NotFoundError, ValidationError } from '../../src/errors';
import { TaskStatus, TaskPriority } from '@sepulki/shared-types';

describe('Task Resolvers', () => {
  let testFleetId: string;
  let testRobotId: string;
  let testTaskId: string;
  let context: any;

  beforeEach(async () => {
    await testEnv.cleanDatabase();
    await testEnv.seedTestData();
    context = await createAuthenticatedContext();

    // Create test fleet
    const fleetResult = await testEnv.db.query(`
      INSERT INTO fleets (id, name, description, status)
      VALUES (
        gen_random_uuid(),
        'Test Fleet',
        'Test fleet description',
        'ACTIVE'
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

    // Create test task
    const taskResult = await testEnv.db.query(`
      INSERT INTO tasks (id, name, description, type, status, priority, created_by)
      VALUES (
        gen_random_uuid(),
        'Test Task',
        'Test task description',
        'PICK_AND_PLACE',
        $1,
        $2,
        $3
      )
      RETURNING id
    `, [TaskStatus.PENDING, TaskPriority.NORMAL, context.smith.id]);
    testTaskId = taskResult.rows[0].id;
  });

  describe('Query: tasks', () => {
    test('returns list of tasks', async () => {
      const result = await taskResolvers.Query.tasks(
        null,
        {},
        context
      );

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    test('filters tasks by status', async () => {
      const result = await taskResolvers.Query.tasks(
        null,
        {
          filter: { status: TaskStatus.PENDING },
        },
        context
      );

      expect(result.every((task: any) => task.status === TaskStatus.PENDING)).toBe(true);
    });

    test('filters tasks by type', async () => {
      const result = await taskResolvers.Query.tasks(
        null,
        {
          filter: { type: 'PICK_AND_PLACE' },
        },
        context
      );

      expect(result.every((task: any) => task.type === 'PICK_AND_PLACE')).toBe(true);
    });

    test('filters tasks by priority', async () => {
      const result = await taskResolvers.Query.tasks(
        null,
        {
          filter: { priority: TaskPriority.NORMAL },
        },
        context
      );

      expect(result.every((task: any) => task.priority === TaskPriority.NORMAL)).toBe(true);
    });

    test('applies pagination', async () => {
      const result = await taskResolvers.Query.tasks(
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

  describe('Query: task', () => {
    test('returns task by id', async () => {
      const result = await taskResolvers.Query.task(
        null,
        { id: testTaskId },
        context
      );

      expect(result).toBeDefined();
      expect(result.id).toBe(testTaskId);
      expect(result.name).toBe('Test Task');
    });

    test('throws NotFoundError for non-existent task', async () => {
      await expect(
        taskResolvers.Query.task(
          null,
          { id: 'non-existent-id' },
          context
        )
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('Query: runs', () => {
    test('returns list of runs', async () => {
      // Create a run
      await testEnv.db.query(`
        INSERT INTO runs (id, task_id, robot_id, status)
        VALUES (
          gen_random_uuid(),
          $1,
          $2,
          'RUNNING'
        )
      `, [testTaskId, testRobotId]);

      const result = await taskResolvers.Query.runs(
        null,
        {},
        context
      );

      expect(Array.isArray(result)).toBe(true);
    });

    test('filters runs by taskId', async () => {
      await testEnv.db.query(`
        INSERT INTO runs (id, task_id, robot_id, status)
        VALUES (
          gen_random_uuid(),
          $1,
          $2,
          'RUNNING'
        )
      `, [testTaskId, testRobotId]);

      const result = await taskResolvers.Query.runs(
        null,
        { taskId: testTaskId },
        context
      );

      expect(result.every((run: any) => run.task_id === testTaskId)).toBe(true);
    });

    test('filters runs by robotId', async () => {
      await testEnv.db.query(`
        INSERT INTO runs (id, task_id, robot_id, status)
        VALUES (
          gen_random_uuid(),
          $1,
          $2,
          'RUNNING'
        )
      `, [testTaskId, testRobotId]);

      const result = await taskResolvers.Query.runs(
        null,
        { robotId: testRobotId },
        context
      );

      expect(result.every((run: any) => run.robot_id === testRobotId)).toBe(true);
    });
  });

  describe('Mutation: dispatchTask', () => {
    test('creates and assigns task to available robot', async () => {
      const input = {
        fleetId: testFleetId,
        input: {
          name: 'New Task',
          description: 'Task description',
          type: 'PICK_AND_PLACE',
          parameters: { target: 'location-a' },
          priority: TaskPriority.NORMAL,
        },
      };

      const result = await taskResolvers.Mutation.dispatchTask(
        null,
        input,
        context
      );

      expect(result.task).toBeDefined();
      expect(result.task.name).toBe('New Task');
      expect(result.task.status).toBe(TaskStatus.ASSIGNED);
      expect(result.assignments).toBeDefined();
      expect(result.assignments.length).toBeGreaterThan(0);
    });

    test('throws ValidationError for missing task name', async () => {
      const input = {
        fleetId: testFleetId,
        input: {
          name: '',
          type: 'PICK_AND_PLACE',
        },
      };

      await expect(
        taskResolvers.Mutation.dispatchTask(
          null,
          input,
          context
        )
      ).rejects.toThrow(ValidationError);
    });

    test('throws ValidationError for missing task type', async () => {
      const input = {
        fleetId: testFleetId,
        input: {
          name: 'New Task',
        },
      };

      await expect(
        taskResolvers.Mutation.dispatchTask(
          null,
          input,
          context
        )
      ).rejects.toThrow(ValidationError);
    });

    test('throws ValidationError when no robots available', async () => {
      // Set all robots to unavailable status
      await testEnv.db.query(
        'UPDATE robots SET status = $1 WHERE fleet_id = $2',
        ['MAINTENANCE', testFleetId]
      );

      const input = {
        fleetId: testFleetId,
        input: {
          name: 'New Task',
          type: 'PICK_AND_PLACE',
        },
      };

      await expect(
        taskResolvers.Mutation.dispatchTask(
          null,
          input,
          context
        )
      ).rejects.toThrow(ValidationError);
    });

    test('updates robot status to WORKING when assigned', async () => {
      const input = {
        fleetId: testFleetId,
        input: {
          name: 'New Task',
          type: 'PICK_AND_PLACE',
        },
      };

      await taskResolvers.Mutation.dispatchTask(
        null,
        input,
        context
      );

      const robot = await testEnv.db.query(
        'SELECT status FROM robots WHERE id = $1',
        [testRobotId]
      );
      expect(robot.rows[0].status).toBe('WORKING');
    });

    test('publishes task assignment event', async () => {
      const publishSpy = jest.spyOn(context.redis, 'publish');

      const input = {
        fleetId: testFleetId,
        input: {
          name: 'New Task',
          type: 'PICK_AND_PLACE',
        },
      };

      await taskResolvers.Mutation.dispatchTask(
        null,
        input,
        context
      );

      expect(publishSpy).toHaveBeenCalledWith(
        'task:assigned',
        expect.stringContaining('taskId')
      );

      publishSpy.mockRestore();
    });
  });

  describe('Mutation: cancelTask', () => {
    test('cancels pending task', async () => {
      const result = await taskResolvers.Mutation.cancelTask(
        null,
        { taskId: testTaskId },
        context
      );

      expect(result.status).toBe(TaskStatus.CANCELLED);
    });

    test('cancels assigned task', async () => {
      await testEnv.db.query(
        'UPDATE tasks SET status = $1 WHERE id = $2',
        [TaskStatus.ASSIGNED, testTaskId]
      );

      const result = await taskResolvers.Mutation.cancelTask(
        null,
        { taskId: testTaskId },
        context
      );

      expect(result.status).toBe(TaskStatus.CANCELLED);
    });

    test('throws NotFoundError for non-existent task', async () => {
      await expect(
        taskResolvers.Mutation.cancelTask(
          null,
          { taskId: 'non-existent-id' },
          context
        )
      ).rejects.toThrow(NotFoundError);
    });

    test('frees up assigned robots', async () => {
      // Assign robot to task
      await testEnv.db.query(`
        INSERT INTO task_robots (task_id, robot_id, assigned_at)
        VALUES ($1, $2, NOW())
      `, [testTaskId, testRobotId]);

      await testEnv.db.query(
        'UPDATE robots SET status = $1 WHERE id = $2',
        ['WORKING', testRobotId]
      );

      await taskResolvers.Mutation.cancelTask(
        null,
        { taskId: testTaskId },
        context
      );

      const robot = await testEnv.db.query(
        'SELECT status FROM robots WHERE id = $1',
        [testRobotId]
      );
      expect(robot.rows[0].status).toBe('IDLE');
    });

    test('publishes cancellation event', async () => {
      const publishSpy = jest.spyOn(context.redis, 'publish');

      await taskResolvers.Mutation.cancelTask(
        null,
        { taskId: testTaskId },
        context
      );

      expect(publishSpy).toHaveBeenCalledWith(
        'task:cancelled',
        expect.stringContaining(testTaskId)
      );

      publishSpy.mockRestore();
    });
  });

  describe('Task Type Resolvers', () => {
    test('Task.assignedRobots returns assigned robots', async () => {
      await testEnv.db.query(`
        INSERT INTO task_robots (task_id, robot_id, assigned_at)
        VALUES ($1, $2, NOW())
      `, [testTaskId, testRobotId]);

      const task = { id: testTaskId };
      const result = await taskResolvers.Task.assignedRobots(
        task,
        {},
        context
      );

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    test('Task.runs returns runs for task', async () => {
      await testEnv.db.query(`
        INSERT INTO runs (id, task_id, robot_id, status)
        VALUES (
          gen_random_uuid(),
          $1,
          $2,
          'RUNNING'
        )
      `, [testTaskId, testRobotId]);

      const task = { id: testTaskId };
      const result = await taskResolvers.Task.runs(
        task,
        {},
        context
      );

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });
});

