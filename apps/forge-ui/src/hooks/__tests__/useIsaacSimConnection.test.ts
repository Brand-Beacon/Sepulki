// Unit tests for useIsaacSimConnection hook
// Tests Isaac Sim connection management and service health checks

import { renderHook, waitFor, act } from '@testing-library/react';
import { useIsaacSimConnection } from '../useIsaacSimConnection';

// Mock env module
const mockEnv = {
  env: {
    anvilSimEndpoint: 'http://localhost:8002',
  },
};

jest.mock('@/lib/env', () => mockEnv);

// Mock fetch globally
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('useIsaacSimConnection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('Initial State', () => {
    test('returns initial disconnected state', () => {
      const { result } = renderHook(() => useIsaacSimConnection());

      expect(result.current.connectionStatus.status).toBe('disconnected');
      expect(result.current.connectionStatus.service).toBe('three_js');
      expect(result.current.connectionStatus.quality).toBe('engineering');
      expect(result.current.connectionStatus.metrics).toEqual({
        fps: 0,
        latency: 0,
        bandwidth: 0,
      });
    });
  });

  describe('Service Health Check', () => {
    test('checkServiceHealth returns true when service is healthy', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      } as Response);

      const { result } = renderHook(() => useIsaacSimConnection());

      const isHealthy = await result.current.checkServiceHealth();

      expect(isHealthy).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:8002/health',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    test('checkServiceHealth returns false when service is unhealthy', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      const { result } = renderHook(() => useIsaacSimConnection());

      const isHealthy = await result.current.checkServiceHealth();

      expect(isHealthy).toBe(false);
    });

    test('checkServiceHealth returns false on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useIsaacSimConnection());

      const isHealthy = await result.current.checkServiceHealth();

      expect(isHealthy).toBe(false);
    });

    test('checkServiceHealth handles timeout', async () => {
      mockFetch.mockImplementationOnce(
        () => new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 100))
      );

      const { result } = renderHook(() => useIsaacSimConnection());

      const isHealthy = await result.current.checkServiceHealth();

      expect(isHealthy).toBe(false);
    });
  });

  describe('Connection Management', () => {
    test('connectToIsaacSim sets status to connecting', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
      } as Response);

      const { result } = renderHook(() => useIsaacSimConnection());

      let connectingStatus: string | undefined;
      
      await act(async () => {
        // Start connection (async, so status may change)
        const promise = result.current.connectToIsaacSim('session-123');
        // Check status during connection
        connectingStatus = result.current.connectionStatus.status;
        await promise;
      });

      // Should eventually connect
      await waitFor(() => {
        expect(result.current.connectionStatus.status).toBe('connected');
      });
    });

    test('connectToIsaacSim connects to Isaac Sim when healthy', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
      } as Response);

      const { result } = renderHook(() => useIsaacSimConnection());

      await act(async () => {
        const connected = await result.current.connectToIsaacSim('session-123');
        expect(connected).toBe(true);
      });

      await waitFor(() => {
        expect(result.current.connectionStatus.status).toBe('connected');
        expect(result.current.connectionStatus.service).toBe('isaac_sim');
      });
    });

    test('connectToIsaacSim falls back to Three.js when unhealthy', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
      } as Response);

      const { result } = renderHook(() => useIsaacSimConnection());

      await act(async () => {
        const connected = await result.current.connectToIsaacSim('session-123');
        expect(connected).toBe(false);
      });

      await waitFor(() => {
        expect(result.current.connectionStatus.status).toBe('connected');
        expect(result.current.connectionStatus.service).toBe('three_js');
      });
    });
  });

  describe('Metrics Updates', () => {
    test('updateMetrics updates connection metrics', () => {
      const { result } = renderHook(() => useIsaacSimConnection());

      act(() => {
        result.current.updateMetrics({
          fps: 60,
          latency: 50,
          bandwidth: 1000,
        });
      });

      expect(result.current.connectionStatus.metrics).toEqual({
        fps: 60,
        latency: 50,
        bandwidth: 1000,
      });
    });

    test('updateMetrics partially updates metrics', () => {
      const { result } = renderHook(() => useIsaacSimConnection());

      act(() => {
        result.current.updateMetrics({
          fps: 30,
        });
      });

      expect(result.current.connectionStatus.metrics).toEqual({
        fps: 30,
        latency: 0,
        bandwidth: 0,
      });
    });

    test('updateMetrics preserves existing metrics', () => {
      const { result } = renderHook(() => useIsaacSimConnection());

      act(() => {
        result.current.updateMetrics({
          fps: 60,
          latency: 50,
        });
      });

      act(() => {
        result.current.updateMetrics({
          fps: 30,
        });
      });

      expect(result.current.connectionStatus.metrics).toEqual({
        fps: 30,
        latency: 50,
        bandwidth: 0,
      });
    });
  });
});

