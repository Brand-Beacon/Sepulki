// Unit tests for catalog utility functions
// Tests catalog fetching and selection logic

import { fetchCatalog, selectFromCatalog } from '../catalog';

// Mock fetch globally
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('catalog utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
  });

  describe('fetchCatalog', () => {
    test('fetches catalog items successfully', async () => {
      const mockCatalog = {
        items: [
          {
            id: 'test-item-1',
            slug: 'external',
            name: 'External Component',
            heroGlb: ['robot_dog_unitree_go2.glb', 'other_robot.glb'],
          },
          {
            id: 'test-item-2',
            slug: 'sample-arm-01',
            name: 'Sample Arm',
            urdf: ['arm.urdf'],
          },
        ],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockCatalog,
      } as Response);

      const result = await fetchCatalog();

      expect(result).toEqual(mockCatalog.items);
      expect(mockFetch).toHaveBeenCalledWith('/api/catalog', {
        cache: 'no-store',
      });
    });

    test('returns empty array on fetch failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      const result = await fetchCatalog();

      expect(result).toEqual([]);
    });

    test('returns empty array on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await fetchCatalog();

      expect(result).toEqual([]);
    });

    test('handles malformed response gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ invalid: 'data' }),
      } as Response);

      const result = await fetchCatalog();

      // Should handle gracefully, might return empty array or partial data
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('selectFromCatalog', () => {
    const mockCatalog = [
      {
        id: 'external',
        slug: 'external',
        name: 'External Component',
        heroGlb: [
          'robot_dog_unitree_go2.glb',
          'unitree_other.glb',
          'non_unitree.glb',
        ],
      },
      {
        id: 'sample-arm',
        slug: 'sample-arm-01',
        name: 'Sample Arm',
        urdf: ['arm.urdf', 'arm2.urdf'],
      },
    ];

    describe('unitree-dog preset', () => {
      test('selects unitree dog from catalog', () => {
        const result = selectFromCatalog(mockCatalog, 'unitree-dog');

        expect(result.heroCandidates).toBeDefined();
        expect(result.heroCandidates).toContain('robot_dog_unitree_go2.glb');
      });

      test('prioritizes robot_dog_unitree_go2', () => {
        const result = selectFromCatalog(mockCatalog, 'unitree-dog');

        expect(result.heroCandidates?.[0]).toBe('robot_dog_unitree_go2.glb');
      });

      test('includes all unitree models', () => {
        const result = selectFromCatalog(mockCatalog, 'unitree-dog');

        expect(result.heroCandidates).toContain('unitree_other.glb');
      });

      test('returns empty array when external component not found', () => {
        const result = selectFromCatalog([], 'unitree-dog');

        expect(result.heroCandidates).toBeUndefined();
      });

      test('handles catalog without heroGlb', () => {
        const catalogWithoutHero = [
          {
            id: 'external',
            slug: 'external',
            name: 'External Component',
          },
        ];

        const result = selectFromCatalog(catalogWithoutHero, 'unitree-dog');

        expect(result.heroCandidates).toBeUndefined();
      });
    });

    describe('industrial-arm preset', () => {
      test('selects arm URDF from catalog', () => {
        const result = selectFromCatalog(mockCatalog, 'industrial-arm');

        expect(result.urdf).toBe('arm.urdf');
      });

      test('returns first URDF when multiple available', () => {
        const result = selectFromCatalog(mockCatalog, 'industrial-arm');

        expect(result.urdf).toBe('arm.urdf');
      });

      test('returns undefined when sample-arm not found', () => {
        const result = selectFromCatalog([], 'industrial-arm');

        expect(result.urdf).toBeUndefined();
      });

      test('handles catalog without URDF', () => {
        const catalogWithoutUrdf = [
          {
            id: 'sample-arm',
            slug: 'sample-arm-01',
            name: 'Sample Arm',
          },
        ];

        const result = selectFromCatalog(catalogWithoutUrdf, 'industrial-arm');

        expect(result.urdf).toBeUndefined();
      });
    });

    describe('sample-arm preset', () => {
      test('selects arm URDF for sample-arm preset', () => {
        const result = selectFromCatalog(mockCatalog, 'sample-arm');

        expect(result.urdf).toBe('arm.urdf');
      });
    });
  });
});

