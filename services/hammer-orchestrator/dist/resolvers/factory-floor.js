"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.factoryFloorResolvers = void 0;
const context_1 = require("../context");
const errors_1 = require("../errors");
const shared_types_1 = require("@sepulki/shared-types");
const fileStorage_1 = require("../services/fileStorage");
const fileStorage = new fileStorage_1.FileStorageService();
exports.factoryFloorResolvers = {
    Query: {
        async factoryFloors(parent, args, context) {
            await (0, context_1.requirePermission)(context, shared_types_1.Permission.VIEW_FLEET);
            const { limit = 50, offset = 0 } = args;
            try {
                const query = `
          SELECT * FROM factory_floors 
          ORDER BY created_at DESC 
          LIMIT $1 OFFSET $2
        `;
                const result = await context.db.query(query, [limit, offset]);
                return result.rows;
            }
            catch (error) {
                throw new errors_1.ServiceError('database', `Failed to fetch factory floors: ${error}`);
            }
        },
        async factoryFloor(parent, { id }, context) {
            await (0, context_1.requirePermission)(context, shared_types_1.Permission.VIEW_FLEET);
            try {
                const query = 'SELECT * FROM factory_floors WHERE id = $1';
                const result = await context.db.query(query, [id]);
                if (result.rows.length === 0) {
                    throw new errors_1.NotFoundError('FactoryFloor', id);
                }
                return result.rows[0];
            }
            catch (error) {
                if (error instanceof errors_1.NotFoundError) {
                    throw error;
                }
                throw new errors_1.ServiceError('database', `Failed to fetch factory floor: ${error}`);
            }
        },
    },
    Mutation: {
        async createFactoryFloor(parent, args, context) {
            const { smith } = await (0, context_1.requirePermission)(context, shared_types_1.Permission.MANAGE_FLEET);
            const { input, blueprintFile } = args;
            const { name, description, widthMeters, heightMeters, scaleFactor, originX = 0, originY = 0 } = input;
            // Validate input
            if (!name || name.trim().length === 0) {
                throw new errors_1.ValidationError('Factory floor name is required', 'name');
            }
            if (!widthMeters || widthMeters <= 0) {
                throw new errors_1.ValidationError('Width must be greater than 0', 'widthMeters');
            }
            if (!heightMeters || heightMeters <= 0) {
                throw new errors_1.ValidationError('Height must be greater than 0', 'heightMeters');
            }
            if (!scaleFactor || scaleFactor <= 0) {
                throw new errors_1.ValidationError('Scale factor must be greater than 0', 'scaleFactor');
            }
            if (!blueprintFile) {
                throw new errors_1.ValidationError('Blueprint file is required', 'blueprintFile');
            }
            try {
                // Start transaction
                const client = await context.db.connect();
                await client.query('BEGIN');
                try {
                    // Upload blueprint file
                    const fileName = blueprintFile.filename || `blueprint_${Date.now()}.png`;
                    const uploadResult = await fileStorage.uploadFile(blueprintFile, fileName, 'blueprint');
                    // Determine blueprint type from file extension
                    const fileExt = fileName.toLowerCase().split('.').pop() || '';
                    let blueprintType;
                    if (['png', 'jpg', 'jpeg'].includes(fileExt)) {
                        blueprintType = 'IMAGE';
                    }
                    else if (fileExt === 'pdf') {
                        blueprintType = 'PDF';
                    }
                    else {
                        blueprintType = 'IMAGE'; // Default
                    }
                    // Create factory floor record
                    const insertQuery = `
            INSERT INTO factory_floors (
              name, description, blueprint_url, blueprint_type,
              width_meters, height_meters, scale_factor,
              origin_x, origin_y, created_by
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
          `;
                    const floorResult = await client.query(insertQuery, [
                        name,
                        description || null,
                        uploadResult.url,
                        blueprintType,
                        widthMeters,
                        heightMeters,
                        scaleFactor,
                        originX,
                        originY,
                        smith.id
                    ]);
                    await client.query('COMMIT');
                    const factoryFloor = floorResult.rows[0];
                    return {
                        factoryFloor,
                        errors: []
                    };
                }
                catch (error) {
                    await client.query('ROLLBACK');
                    throw error;
                }
                finally {
                    client.release();
                }
            }
            catch (error) {
                if (error instanceof errors_1.ValidationError) {
                    throw error;
                }
                throw new errors_1.ServiceError('database', `Failed to create factory floor: ${error}`);
            }
        },
        async updateFactoryFloor(parent, args, context) {
            const { smith } = await (0, context_1.requirePermission)(context, shared_types_1.Permission.MANAGE_FLEET);
            const { id, input, blueprintFile } = args;
            try {
                // Get existing floor
                const existingQuery = 'SELECT * FROM factory_floors WHERE id = $1';
                const existingResult = await context.db.query(existingQuery, [id]);
                if (existingResult.rows.length === 0) {
                    throw new errors_1.NotFoundError('FactoryFloor', id);
                }
                const existingFloor = existingResult.rows[0];
                // Start transaction
                const client = await context.db.connect();
                await client.query('BEGIN');
                try {
                    let blueprintUrl = existingFloor.blueprint_url;
                    let blueprintType = existingFloor.blueprint_type;
                    // Upload new blueprint if provided
                    if (blueprintFile) {
                        const fileName = blueprintFile.filename || `blueprint_${Date.now()}.png`;
                        const uploadResult = await fileStorage.uploadFile(blueprintFile, fileName, 'blueprint', undefined, undefined, id);
                        blueprintUrl = uploadResult.url;
                        // Determine blueprint type
                        const fileExt = fileName.toLowerCase().split('.').pop() || '';
                        if (['png', 'jpg', 'jpeg'].includes(fileExt)) {
                            blueprintType = 'IMAGE';
                        }
                        else if (fileExt === 'pdf') {
                            blueprintType = 'PDF';
                        }
                        else {
                            blueprintType = 'IMAGE';
                        }
                    }
                    // Build update query dynamically
                    const updates = [];
                    const params = [];
                    let paramIndex = 1;
                    if (input?.name !== undefined) {
                        updates.push(`name = $${paramIndex}`);
                        params.push(input.name);
                        paramIndex++;
                    }
                    if (input?.description !== undefined) {
                        updates.push(`description = $${paramIndex}`);
                        params.push(input.description);
                        paramIndex++;
                    }
                    if (blueprintFile) {
                        updates.push(`blueprint_url = $${paramIndex}`);
                        params.push(blueprintUrl);
                        paramIndex++;
                        updates.push(`blueprint_type = $${paramIndex}`);
                        params.push(blueprintType);
                        paramIndex++;
                    }
                    if (input?.widthMeters !== undefined) {
                        if (input.widthMeters <= 0) {
                            throw new errors_1.ValidationError('Width must be greater than 0', 'widthMeters');
                        }
                        updates.push(`width_meters = $${paramIndex}`);
                        params.push(input.widthMeters);
                        paramIndex++;
                    }
                    if (input?.heightMeters !== undefined) {
                        if (input.heightMeters <= 0) {
                            throw new errors_1.ValidationError('Height must be greater than 0', 'heightMeters');
                        }
                        updates.push(`height_meters = $${paramIndex}`);
                        params.push(input.heightMeters);
                        paramIndex++;
                    }
                    if (input?.scaleFactor !== undefined) {
                        if (input.scaleFactor <= 0) {
                            throw new errors_1.ValidationError('Scale factor must be greater than 0', 'scaleFactor');
                        }
                        updates.push(`scale_factor = $${paramIndex}`);
                        params.push(input.scaleFactor);
                        paramIndex++;
                    }
                    if (input?.originX !== undefined) {
                        updates.push(`origin_x = $${paramIndex}`);
                        params.push(input.originX);
                        paramIndex++;
                    }
                    if (input?.originY !== undefined) {
                        updates.push(`origin_y = $${paramIndex}`);
                        params.push(input.originY);
                        paramIndex++;
                    }
                    if (updates.length === 0) {
                        // No updates provided, just return existing floor
                        await client.query('COMMIT');
                        client.release();
                        return {
                            factoryFloor: existingFloor,
                            errors: []
                        };
                    }
                    // Add updated_at
                    updates.push(`updated_at = NOW()`);
                    // Add id to params
                    params.push(id);
                    const updateQuery = `
            UPDATE factory_floors 
            SET ${updates.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING *
          `;
                    const result = await client.query(updateQuery, params);
                    await client.query('COMMIT');
                    return {
                        factoryFloor: result.rows[0],
                        errors: []
                    };
                }
                catch (error) {
                    await client.query('ROLLBACK');
                    throw error;
                }
                finally {
                    client.release();
                }
            }
            catch (error) {
                if (error instanceof errors_1.NotFoundError || error instanceof errors_1.ValidationError) {
                    throw error;
                }
                throw new errors_1.ServiceError('database', `Failed to update factory floor: ${error}`);
            }
        },
        async deleteFactoryFloor(parent, { id }, context) {
            await (0, context_1.requirePermission)(context, shared_types_1.Permission.MANAGE_FLEET);
            try {
                // Check if floor exists
                const checkQuery = 'SELECT id FROM factory_floors WHERE id = $1';
                const checkResult = await context.db.query(checkQuery, [id]);
                if (checkResult.rows.length === 0) {
                    throw new errors_1.NotFoundError('FactoryFloor', id);
                }
                // Delete floor (CASCADE will handle robot references via ON DELETE SET NULL)
                const deleteQuery = 'DELETE FROM factory_floors WHERE id = $1';
                await context.db.query(deleteQuery, [id]);
                return true;
            }
            catch (error) {
                if (error instanceof errors_1.NotFoundError) {
                    throw error;
                }
                throw new errors_1.ServiceError('database', `Failed to delete factory floor: ${error}`);
            }
        },
        async assignRobotToFloor(parent, args, context) {
            await (0, context_1.requirePermission)(context, shared_types_1.Permission.MANAGE_FLEET);
            const { robotId, floorId, position } = args;
            try {
                // Verify robot exists
                const robotQuery = 'SELECT * FROM robots WHERE id = $1';
                const robotResult = await context.db.query(robotQuery, [robotId]);
                if (robotResult.rows.length === 0) {
                    throw new errors_1.NotFoundError('Robot', robotId);
                }
                // Verify floor exists (if provided)
                if (floorId) {
                    const floorQuery = 'SELECT * FROM factory_floors WHERE id = $1';
                    const floorResult = await context.db.query(floorQuery, [floorId]);
                    if (floorResult.rows.length === 0) {
                        throw new errors_1.NotFoundError('FactoryFloor', floorId);
                    }
                }
                // Update robot with floor assignment
                const updateQuery = `
          UPDATE robots 
          SET 
            factory_floor_id = $1,
            floor_position_x = $2,
            floor_position_y = $3,
            floor_position_theta = $4,
            floor_rotation_degrees = $5,
            updated_at = NOW()
          WHERE id = $6
          RETURNING *
        `;
                const positionX = position?.positionX ?? null;
                const positionY = position?.positionY ?? null;
                const positionTheta = position?.positionTheta ?? 0;
                const rotationDegrees = position?.rotationDegrees ?? 0;
                const result = await context.db.query(updateQuery, [
                    floorId || null,
                    positionX,
                    positionY,
                    positionTheta,
                    rotationDegrees,
                    robotId
                ]);
                // Clear cache
                context.dataloaders.robot.clear(robotId);
                return result.rows[0];
            }
            catch (error) {
                if (error instanceof errors_1.NotFoundError) {
                    throw error;
                }
                throw new errors_1.ServiceError('database', `Failed to assign robot to floor: ${error}`);
            }
        },
        async updateRobotFloorPosition(parent, args, context) {
            await (0, context_1.requirePermission)(context, shared_types_1.Permission.MANAGE_FLEET);
            const { robotId, position } = args;
            if (!position) {
                throw new errors_1.ValidationError('Position is required', 'position');
            }
            try {
                // Verify robot exists and is assigned to a floor
                const robotQuery = 'SELECT * FROM robots WHERE id = $1';
                const robotResult = await context.db.query(robotQuery, [robotId]);
                if (robotResult.rows.length === 0) {
                    throw new errors_1.NotFoundError('Robot', robotId);
                }
                const robot = robotResult.rows[0];
                if (!robot.factory_floor_id) {
                    throw new errors_1.ValidationError('Robot is not assigned to a factory floor', 'robotId');
                }
                // Update robot position
                const updateQuery = `
          UPDATE robots 
          SET 
            floor_position_x = $1,
            floor_position_y = $2,
            floor_position_theta = $3,
            floor_rotation_degrees = $4,
            updated_at = NOW()
          WHERE id = $5
          RETURNING *
        `;
                const result = await context.db.query(updateQuery, [
                    position.positionX,
                    position.positionY,
                    position.positionTheta ?? 0,
                    position.rotationDegrees ?? 0,
                    robotId
                ]);
                // Clear cache
                context.dataloaders.robot.clear(robotId);
                return result.rows[0];
            }
            catch (error) {
                if (error instanceof errors_1.NotFoundError || error instanceof errors_1.ValidationError) {
                    throw error;
                }
                throw new errors_1.ServiceError('database', `Failed to update robot floor position: ${error}`);
            }
        },
        async updateRobotMobility(parent, args, context) {
            await (0, context_1.requirePermission)(context, shared_types_1.Permission.MANAGE_FLEET);
            const { robotId, isMobile } = args;
            try {
                // Verify robot exists
                const robotQuery = 'SELECT * FROM robots WHERE id = $1';
                const robotResult = await context.db.query(robotQuery, [robotId]);
                if (robotResult.rows.length === 0) {
                    throw new errors_1.NotFoundError('Robot', robotId);
                }
                // Update robot mobility
                const updateQuery = `
          UPDATE robots 
          SET is_mobile = $1, updated_at = NOW()
          WHERE id = $2
          RETURNING *
        `;
                const result = await context.db.query(updateQuery, [isMobile, robotId]);
                // Clear cache
                context.dataloaders.robot.clear(robotId);
                return result.rows[0];
            }
            catch (error) {
                if (error instanceof errors_1.NotFoundError) {
                    throw error;
                }
                throw new errors_1.ServiceError('database', `Failed to update robot mobility: ${error}`);
            }
        },
    },
    FactoryFloor: {
        async robots(parent, args, context) {
            try {
                return await context.dataloaders.robotsByFactoryFloor.load(parent.id);
            }
            catch (error) {
                throw new errors_1.ServiceError('database', `Failed to fetch robots for factory floor: ${error}`);
            }
        },
        async createdBy(parent, args, context) {
            try {
                return await context.dataloaders.smith.load(parent.created_by);
            }
            catch (error) {
                throw new errors_1.ServiceError('database', `Failed to fetch creator for factory floor: ${error}`);
            }
        },
    },
};
