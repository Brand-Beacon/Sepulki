import type { Context } from '../context';
import { requirePermission } from '../context';
import { NotFoundError, ServiceError, ValidationError } from '../errors';
import { Permission, RobotStatus, PatternCategory } from '@sepulki/shared-types';

// Helper function to convert GPS coordinates to local coordinates (meters)
function gpsToLocalCoordinates(
  gpsLat: number,
  gpsLng: number,
  locusLat: number,
  locusLng: number
): { x: number; y: number; z: number } {
  // Convert degrees to meters
  // 1 degree latitude ≈ 111,000 meters
  // 1 degree longitude ≈ 111,000 * cos(latitude) meters
  const latToMeters = 111000;
  const lngToMeters = 111000 * Math.cos(locusLat * Math.PI / 180);
  
  const offsetLat = gpsLat - locusLat;
  const offsetLng = gpsLng - locusLng;
  
  const x = offsetLng * lngToMeters; // East/West offset in meters
  const y = offsetLat * latToMeters; // North/South offset in meters
  const z = 0; // Altitude handled separately if needed
  
  return { x, y, z };
}

export const fleetResolvers = {
  Query: {
    async fleets(parent: any, args: any, context: Context) {
      await requirePermission(context, Permission.VIEW_FLEET);
      
      const { filter, limit = 50, offset = 0 } = args;
      let query = 'SELECT * FROM fleets WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      // Apply filters
      if (filter?.status) {
        query += ` AND status = $${paramIndex}`;
        params.push(filter.status);
        paramIndex++;
      }

      if (filter?.locusId) {
        query += ` AND locus_id = $${paramIndex}`;
        params.push(filter.locusId);
        paramIndex++;
      }

      // Apply pagination
      query += ` ORDER BY name ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      try {
        const result = await context.db.query(query, params);
        return result.rows;
      } catch (error) {
        throw new ServiceError('database', `Failed to fetch fleets: ${error}`);
      }
    },

    async fleet(parent: any, { id }: { id: string }, context: Context) {
      await requirePermission(context, Permission.VIEW_FLEET);
      
      const fleet = await context.dataloaders.fleet.load(id);
      if (!fleet) {
        throw new NotFoundError('Fleet', id);
      }
      return fleet;
    },

    async robots(parent: any, args: any, context: Context) {
      await requirePermission(context, Permission.VIEW_ROBOTS);
      
      const { fleetId, status, limit = 50, offset = 0 } = args;
      let query = 'SELECT * FROM robots WHERE 1=1';
      const params: any[] = [];
      let paramIndex = 1;

      if (fleetId) {
        query += ` AND fleet_id = $${paramIndex}`;
        params.push(fleetId);
        paramIndex++;
      }

      if (status) {
        query += ` AND status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      query += ` ORDER BY name ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      try {
        const result = await context.db.query(query, params);
        return result.rows;
      } catch (error) {
        throw new ServiceError('database', `Failed to fetch robots: ${error}`);
      }
    },

    async robot(parent: any, { id }: { id: string }, context: Context) {
      await requirePermission(context, Permission.VIEW_ROBOTS);
      
      const robot = await context.dataloaders.robot.load(id);
      if (!robot) {
        throw new NotFoundError('Robot', id);
      }
      return robot;
    }
  },

  Mutation: {
    async updateRobotStatus(parent: any, { robotId, status }: any, context: Context) {
      await requirePermission(context, Permission.MANAGE_ROBOTS);
      
      if (!Object.values(RobotStatus).includes(status)) {
        throw new ValidationError(`Invalid robot status: ${status}`, 'status');
      }

      try {
        const result = await context.db.query(
          `UPDATE robots 
           SET status = $1, updated_at = NOW() 
           WHERE id = $2 
           RETURNING *`,
          [status, robotId]
        );

        if (result.rows.length === 0) {
          throw new NotFoundError('Robot', robotId);
        }

        const robot = result.rows[0];

        // Clear cache
        context.dataloaders.robot.clear(robotId);

        // Publish status change
        await context.redis.publish('robot:status', JSON.stringify({
          robotId,
          status,
          timestamp: new Date().toISOString()
        }));

        return robot;
      } catch (error) {
        throw new ServiceError('database', `Failed to update robot status: ${error}`);
      }
    },

    async emergencyStop(parent: any, { fleetId }: { fleetId: string }, context: Context) {
      await requirePermission(context, Permission.EMERGENCY_STOP);

      try {
        // Update all robots in fleet to MAINTENANCE status
        const result = await context.db.query(
          `UPDATE robots 
           SET status = 'MAINTENANCE', updated_at = NOW() 
           WHERE fleet_id = $1 
           RETURNING *`,
          [fleetId]
        );

        // Update fleet status
        await context.db.query(
          `UPDATE fleets 
           SET status = 'MAINTENANCE', updated_at = NOW() 
           WHERE id = $1`,
          [fleetId]
        );

        // Cancel all active tasks for this fleet
        await context.db.query(
          `UPDATE tasks 
           SET status = 'CANCELLED', updated_at = NOW() 
           WHERE id IN (
             SELECT DISTINCT t.id 
             FROM tasks t 
             JOIN task_robots tr ON t.id = tr.task_id 
             JOIN robots r ON tr.robot_id = r.id 
             WHERE r.fleet_id = $1 AND t.status IN ('PENDING', 'ASSIGNED', 'IN_PROGRESS')
           )`,
          [fleetId]
        );

        // Clear caches
        context.dataloaders.fleet.clear(fleetId);
        result.rows.forEach(robot => {
          context.dataloaders.robot.clear(robot.id);
        });

        // Publish emergency stop event
        await context.redis.publish('fleet:emergency_stop', JSON.stringify({
          fleetId,
          timestamp: new Date().toISOString(),
          affectedRobots: result.rows.length
        }));

        // Get updated fleet
        const fleet = await context.dataloaders.fleet.load(fleetId);
        return fleet;
      } catch (error) {
        throw new ServiceError('database', `Failed to execute emergency stop: ${error}`);
      }
    },

    async updateFleetLocation(parent: any, { fleetId, coordinates }: { fleetId: string; coordinates: { latitude: number; longitude: number; altitude?: number } }, context: Context) {
      await requirePermission(context, Permission.MANAGE_FLEET);

      try {
        // Get fleet to find its locus_id (database row uses snake_case)
        const fleet = await context.dataloaders.fleet.load(fleetId);
        if (!fleet) {
          throw new NotFoundError('Fleet', fleetId);
        }

        const locusId = (fleet as any).locus_id;
        if (!locusId) {
          throw new ValidationError('Fleet does not have a locus assigned', 'locus_id');
        }

        // Update locus coordinates
        const coordinatesJson = JSON.stringify({
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          altitude: coordinates.altitude ?? null
        });

        const result = await context.db.query(
          `UPDATE loci 
           SET coordinates = $1::jsonb, updated_at = NOW() 
           WHERE id = $2 
           RETURNING *`,
          [coordinatesJson, locusId]
        );

        if (result.rows.length === 0) {
          throw new NotFoundError('Locus', locusId);
        }

        // Clear caches
        context.dataloaders.fleet.clear(fleetId);

        // Return updated fleet
        const updatedFleet = await context.dataloaders.fleet.load(fleetId);
        return updatedFleet;
      } catch (error) {
        if (error instanceof NotFoundError || error instanceof ValidationError) {
          throw error;
        }
        throw new ServiceError('database', `Failed to update fleet location: ${error}`);
      }
    },

    async updateRobotLocation(parent: any, { robotId, coordinates }: { robotId: string; coordinates: { latitude: number; longitude: number; altitude?: number } }, context: Context) {
      await requirePermission(context, Permission.MANAGE_FLEET);

      try {
        // Get robot to find its fleet (database row uses snake_case)
        const robot = await context.dataloaders.robot.load(robotId);
        if (!robot) {
          throw new NotFoundError('Robot', robotId);
        }

        const robotFleetId = (robot as any).fleet_id;
        // Get fleet and locus coordinates
        const fleet = await context.dataloaders.fleet.load(robotFleetId);
        if (!fleet) {
          throw new NotFoundError('Fleet', robotFleetId);
        }

        const locusId = (fleet as any).locus_id;
        if (!locusId) {
          throw new ValidationError('Fleet does not have a locus assigned', 'locus_id');
        }

        // Get locus coordinates
        const locusResult = await context.db.query(
          'SELECT coordinates FROM loci WHERE id = $1',
          [locusId]
        );

        if (locusResult.rows.length === 0 || !locusResult.rows[0].coordinates) {
          throw new ValidationError('Fleet locus does not have coordinates', 'locus');
        }

        const locusCoords = locusResult.rows[0].coordinates;
        const locusLat = locusCoords.latitude;
        const locusLng = locusCoords.longitude;

        // Convert GPS coordinates to local coordinates
        const localCoords = gpsToLocalCoordinates(
          coordinates.latitude,
          coordinates.longitude,
          locusLat,
          locusLng
        );

        // Get current last_pose or create default
        const currentLastPose = (robot as any).last_pose;
        const lastPose = {
          position: {
            x: localCoords.x,
            y: localCoords.y,
            z: localCoords.z
          },
          orientation: currentLastPose?.orientation || { w: 1, x: 0, y: 0, z: 0 },
          jointPositions: currentLastPose?.jointPositions || {},
          timestamp: new Date().toISOString()
        };

        const result = await context.db.query(
          `UPDATE robots 
           SET last_pose = $1::jsonb, updated_at = NOW() 
           WHERE id = $2 
           RETURNING *`,
          [JSON.stringify(lastPose), robotId]
        );

        if (result.rows.length === 0) {
          throw new NotFoundError('Robot', robotId);
        }

        // Clear cache
        context.dataloaders.robot.clear(robotId);

        return result.rows[0];
      } catch (error) {
        if (error instanceof NotFoundError || error instanceof ValidationError) {
          throw error;
        }
        throw new ServiceError('database', `Failed to update robot location: ${error}`);
      }
    }
  },

  Subscription: {
    // robotStatus subscription moved to subscriptions.ts
  },

  Fleet: {
    async locus(parent: any, args: any, context: Context) {
      if (!parent.locus_id) return null;
      
      const result = await context.db.query(
        'SELECT * FROM loci WHERE id = $1',
        [parent.locus_id]
      );
      return result.rows[0] || null;
    },

    async robots(parent: any, args: any, context: Context) {
      return await context.dataloaders.robotsByFleet.load(parent.id);
    },

    async activeTask(parent: any, args: any, context: Context) {
      if (!parent.active_task_id) return null;
      return await context.dataloaders.task.load(parent.active_task_id);
    },

    async constraints(parent: any, args: any, context: Context) {
      if (!parent.constraint_ids || parent.constraint_ids.length === 0) return [];
      
      const result = await context.db.query(
        'SELECT * FROM edicts WHERE id = ANY($1)',
        [parent.constraint_ids]
      );
      return result.rows;
    },

    async telemetry(parent: any, args: any, context: Context) {
      // TODO: Implement telemetry stream from Bellows service
      return {
        fleetId: parent.id,
        metrics: [],
        events: [],
        realTime: false
      };
    }
  },

  Robot: {
    // Map snake_case database columns to camelCase GraphQL fields
    sepulkaId: (parent: any) => parent.sepulka_id,
    fleetId: (parent: any) => parent.fleet_id,
    lastSeen: (parent: any) => parent.last_seen,
    batteryLevel: (parent: any) => parent.battery_level,
    healthScore: (parent: any) => parent.health_score,

    async currentIngot(parent: any, args: any, context: Context) {
      if (!parent.current_ingot_id) return null;
      
      const result = await context.db.query(
        'SELECT * FROM ingots WHERE id = $1',
        [parent.current_ingot_id]
      );
      return result.rows[0] || null;
    },

    async pose(parent: any, args: any, context: Context) {
      // TODO: Get latest pose from telemetry service
      if (!parent.last_pose) {
        return null;
      }

      const lastPose = parent.last_pose;
      const position = lastPose.position;
      
      // The database stores local coordinates (x, y, z) in meters relative to the fleet
      // We need to convert these to GPS coordinates using the fleet's location as base
      if (position && (position.x !== undefined || position.y !== undefined || position.z !== undefined)) {
        // Get fleet location to convert local coordinates to GPS
        const fleet = await context.dataloaders.fleet.load(parent.fleet_id);
        if (fleet && (fleet as any).locus_id) {
          const locusQuery = 'SELECT coordinates FROM loci WHERE id = $1';
          const locusResult = await context.db.query(locusQuery, [(fleet as any).locus_id]);
          
          if (locusResult.rows.length > 0 && locusResult.rows[0].coordinates) {
            const fleetCoords = locusResult.rows[0].coordinates;
            const fleetLat = fleetCoords.latitude;
            const fleetLng = fleetCoords.longitude;
            
            if (typeof fleetLat === 'number' && typeof fleetLng === 'number' &&
                !isNaN(fleetLat) && !isNaN(fleetLng)) {
              // Convert local coordinates (meters) to GPS offset
              // 1 degree latitude ≈ 111,000 meters
              // 1 degree longitude ≈ 111,000 * cos(latitude) meters
              const metersPerDegreeLat = 111000;
              const metersPerDegreeLng = 111000 * Math.cos(fleetLat * Math.PI / 180);
              
              const x = position.x ?? 0;
              const y = position.y ?? 0;
              const z = position.z ?? 0;
              
              // Calculate GPS coordinates from local offset
              const latitude = fleetLat + (y / metersPerDegreeLat);
              const longitude = fleetLng + (x / metersPerDegreeLng);
              const altitude = z; // Altitude stays in meters
              
              return {
                position: {
                  latitude,
                  longitude,
                  altitude,
                },
                orientation: lastPose.orientation || {},
                jointPositions: lastPose.jointPositions || null,
                timestamp: lastPose.timestamp || new Date().toISOString(),
              };
            }
          }
        }
        
        // Fallback: if we can't get fleet location, return null to avoid invalid coordinates
        return null;
      }

      // If position already has latitude/longitude (already in correct format)
      if (position && (position.latitude !== undefined || position.longitude !== undefined)) {
        return {
          position: {
            latitude: position.latitude ?? 0,
            longitude: position.longitude ?? 0,
            altitude: position.altitude ?? 0,
          },
          orientation: lastPose.orientation || {},
          jointPositions: lastPose.jointPositions || null,
          timestamp: lastPose.timestamp || new Date().toISOString(),
        };
      }

      // If pose structure is invalid, return null (pose is nullable)
      return null;
    },

    async streamUrl(parent: any, args: any, context: Context) {
      // Generate stream URL for robot
      // In production, this would connect to the robot's actual camera stream
      // For now, we'll use the video-stream-proxy service
      const proxyUrl = process.env.VIDEO_PROXY_URL || 'http://localhost:8889';
      const robotId = parent.id;
      const robotName = parent.name || 'robot';
      
      // Create a session ID for this robot's stream
      // In production, this would be managed per-robot and persist
      const sessionId = `robot_${robotId}_${Date.now()}`;
      
      // Return the embed URL for the stream
      return `${proxyUrl}/stream/${sessionId}/embed`;
    },

    async factoryFloor(parent: any, args: any, context: Context) {
      if (!parent.factory_floor_id) return null;
      
      try {
        const query = 'SELECT * FROM factory_floors WHERE id = $1';
        const result = await context.db.query(query, [parent.factory_floor_id]);
        return result.rows[0] || null;
      } catch (error) {
        throw new ServiceError('database', `Failed to fetch factory floor for robot: ${error}`);
      }
    },

    async floorPositionX(parent: any, args: any, context: Context) {
      return parent.floor_position_x ?? null;
    },

    async floorPositionY(parent: any, args: any, context: Context) {
      return parent.floor_position_y ?? null;
    },

    async floorPositionTheta(parent: any, args: any, context: Context) {
      return parent.floor_position_theta ?? null;
    },

    async isMobile(parent: any, args: any, context: Context) {
      // If manually set, return that value
      if (parent.is_mobile !== null && parent.is_mobile !== undefined) {
        return parent.is_mobile;
      }

      // Auto-detect from pattern category
      try {
        // Get sepulka to find pattern
        const sepulkaQuery = 'SELECT pattern_id FROM sepulkas WHERE id = $1';
        const sepulkaResult = await context.db.query(sepulkaQuery, [parent.sepulka_id]);
        
        if (sepulkaResult.rows.length === 0 || !sepulkaResult.rows[0].pattern_id) {
          return null; // Can't determine without pattern
        }

        // Get pattern category
        const patternQuery = 'SELECT category FROM patterns WHERE id = $1';
        const patternResult = await context.db.query(patternQuery, [sepulkaResult.rows[0].pattern_id]);
        
        if (patternResult.rows.length === 0) {
          return null; // Can't determine without pattern
        }

        const category = patternResult.rows[0].category;
        
        // Mobile categories
        const mobileCategories = ['MOBILE_ROBOT', 'HUMANOID', 'QUADRUPED', 'DRONE'];
        if (mobileCategories.includes(category)) {
          return true;
        }

        // Stationary categories
        if (category === 'INDUSTRIAL_ARM') {
          return false;
        }

        // CUSTOM or unknown - return null to indicate manual override needed
        return null;
      } catch (error) {
        console.error('Failed to auto-detect robot mobility:', error);
        return null;
      }
    },

    async floorRotationDegrees(parent: any, args: any, context: Context) {
      return parent.floor_rotation_degrees ?? null;
    }
  }
};
