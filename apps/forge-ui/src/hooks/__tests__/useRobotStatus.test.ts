// Unit tests for useRobotStatus hook
// Tests robot status subscription and state management

import { renderHook, waitFor } from '@testing-library/react';
import { useRobotStatus } from '../useRobotStatus';
import { useSubscription } from '@apollo/client/react';
import { ROBOT_STATUS_SUBSCRIPTION } from '@/lib/graphql/subscriptions';

// Mock Apollo Client
jest.mock('@apollo/client', () => ({
  useSubscription: jest.fn(),
}));

// Mock GraphQL subscriptions
jest.mock('@/lib/graphql/subscriptions', () => ({
  ROBOT_STATUS_SUBSCRIPTION: 'subscription robotStatus($robotId: String!) { robotStatus(robotId: $robotId) { ... } }',
}));

const mockUseSubscription = useSubscription as jest.MockedFunction<typeof useSubscription>;

describe('useRobotStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns initial null robot', () => {
    mockUseSubscription.mockReturnValue({
      data: undefined,
      loading: false,
      error: undefined,
    } as any);

    const { result } = renderHook(() => useRobotStatus('robot-123'));

    expect(result.current.robot).toBeNull();
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeUndefined();
  });

  test('subscribes to robot status with correct variables', () => {
    mockUseSubscription.mockReturnValue({
      data: undefined,
      loading: false,
      error: undefined,
    } as any);

    renderHook(() => useRobotStatus('robot-123'));

    expect(mockUseSubscription).toHaveBeenCalledWith(
      ROBOT_STATUS_SUBSCRIPTION,
      expect.objectContaining({
        variables: { robotId: 'robot-123' },
        skip: false,
      })
    );
  });

  test('skips subscription when robotId is empty', () => {
    mockUseSubscription.mockReturnValue({
      data: undefined,
      loading: false,
      error: undefined,
    } as any);

    renderHook(() => useRobotStatus(''));

    expect(mockUseSubscription).toHaveBeenCalledWith(
      ROBOT_STATUS_SUBSCRIPTION,
      expect.objectContaining({
        skip: true,
      })
    );
  });

  test('updates robot when subscription data arrives', async () => {
    const mockData = {
      robotStatus: {
        id: 'robot-123',
        name: 'Test Robot',
        status: 'IDLE',
        batteryLevel: 85,
        healthScore: 92,
        lastSeen: new Date(),
        pose: { x: 0, y: 0, z: 0 },
      },
    };

    mockUseSubscription.mockReturnValue({
      data: mockData,
      loading: false,
      error: undefined,
    } as any);

    const { result } = renderHook(() => useRobotStatus('robot-123'));

    await waitFor(() => {
      expect(result.current.robot).toBeDefined();
    });

    expect(result.current.robot).toEqual(mockData.robotStatus);
  });

  test('handles subscription errors', () => {
    const mockError = new Error('Subscription failed');

    mockUseSubscription.mockReturnValue({
      data: undefined,
      loading: false,
      error: mockError,
    } as any);

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useRobotStatus('robot-123'));

    expect(result.current.error).toEqual(mockError);

    consoleSpy.mockRestore();
  });

  test('handles loading state', () => {
    mockUseSubscription.mockReturnValue({
      data: undefined,
      loading: true,
      error: undefined,
    } as any);

    const { result } = renderHook(() => useRobotStatus('robot-123'));

    expect(result.current.loading).toBe(true);
  });

  test('handles null robot status', () => {
    mockUseSubscription.mockReturnValue({
      data: {
        robotStatus: null,
      },
      loading: false,
      error: undefined,
    } as any);

    const { result } = renderHook(() => useRobotStatus('robot-123'));

    expect(result.current.robot).toBeNull();
  });
});

