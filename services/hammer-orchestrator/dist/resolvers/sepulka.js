"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sepulkaResolvers = void 0;
const context_1 = require("../context");
const errors_1 = require("../errors");
const shared_types_1 = require("@sepulki/shared-types");
exports.sepulkaResolvers = {
    Query: {
        async sepulkas(parent, args, context) {
            await (0, context_1.requirePermission)(context, shared_types_1.Permission.VIEW_CATALOG);
            const { filter, limit = 50, offset = 0 } = args;
            let query = 'SELECT * FROM sepulkas WHERE 1=1';
            const params = [];
            let paramIndex = 1;
            // Apply filters
            if (filter?.status) {
                query += ` AND status = $${paramIndex}`;
                params.push(filter.status);
                paramIndex++;
            }
            if (filter?.createdBy) {
                query += ` AND created_by = $${paramIndex}`;
                params.push(filter.createdBy);
                paramIndex++;
            }
            // Apply pagination
            query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
            params.push(limit, offset);
            try {
                const result = await context.db.query(query, params);
                return result.rows;
            }
            catch (error) {
                throw new errors_1.ServiceError('database', `Failed to fetch sepulkas: ${error}`);
            }
        },
        async sepulka(parent, { id }, context) {
            await (0, context_1.requirePermission)(context, shared_types_1.Permission.VIEW_CATALOG);
            const sepulka = await context.dataloaders.sepulka.load(id);
            if (!sepulka) {
                throw new errors_1.NotFoundError('Sepulka', id);
            }
            return sepulka;
        },
    },
    Mutation: {
        async forgeSepulka(parent, { input }, context) {
            const { smith } = await (0, context_1.requirePermission)(context, shared_types_1.Permission.FORGE_SEPULKA);
            const { name, description, patternId, alloyIds, parameters } = input;
            // Validate input
            if (!name || name.trim().length === 0) {
                throw new errors_1.ValidationError('Sepulka name is required', 'name');
            }
            if (!alloyIds || alloyIds.length === 0) {
                throw new errors_1.ValidationError('At least one alloy is required', 'alloyIds');
            }
            try {
                // Use direct queries with automatic transaction handling
                const sepulkaResult = await context.db.query(`
          INSERT INTO sepulkas (name, description, pattern_id, status, created_by, parameters)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING *
        `, [
                    name,
                    description,
                    patternId,
                    'FORGING',
                    smith.id,
                    parameters || {}
                ]);
                const sepulka = sepulkaResult.rows[0];
                // Associate alloys
                for (const alloyId of alloyIds) {
                    await context.db.query('INSERT INTO sepulka_alloys (sepulka_id, alloy_id) VALUES ($1, $2)', [sepulka.id, alloyId]);
                }
                // Clear cache (if dataloaders exist)
                if (context.dataloaders?.sepulka?.clear) {
                    context.dataloaders.sepulka.clear(sepulka.id);
                }
                return {
                    sepulka,
                    errors: []
                };
            }
            catch (error) {
                throw new errors_1.ServiceError('database', `Failed to forge sepulka: ${error}`);
            }
        },
        async castIngot(parent, { sepulkaId }, context) {
            // Validate UUID format
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(sepulkaId)) {
                throw new errors_1.ValidationError('Invalid UUID format');
            }
            const { smith } = await (0, context_1.requirePermission)(context, shared_types_1.Permission.CAST_INGOT);
            try {
                // Verify sepulka exists and load with alloys
                const sepulkaQuery = await context.db.query(`
          SELECT s.*, COUNT(sa.alloy_id) as alloy_count
          FROM sepulkas s
          LEFT JOIN sepulka_alloys sa ON s.id = sa.sepulka_id
          WHERE s.id = $1
          GROUP BY s.id, s.name, s.description, s.status, s.pattern_id, s.parameters, s.created_by, s.created_at, s.updated_at, s.version
        `, [sepulkaId]);
                if (sepulkaQuery.rows.length === 0) {
                    throw new errors_1.NotFoundError('Sepulka', sepulkaId);
                }
                const sepulka = sepulkaQuery.rows[0];
                // Validate sepulka status
                if (sepulka.status !== 'CAST_READY') {
                    throw new errors_1.ValidationError(`Sepulka must be in CAST_READY status, currently: ${sepulka.status}`);
                }
                // Validate sepulka completeness - must have alloys
                if (parseInt(sepulka.alloy_count) === 0) {
                    throw new errors_1.ValidationError('Sepulka is incomplete');
                }
                // Check for existing ingots to determine version
                const existingIngotsQuery = await context.db.query('SELECT COUNT(*) as ingot_count FROM ingots WHERE sepulka_id = $1', [sepulkaId]);
                const ingotCount = parseInt(existingIngotsQuery.rows[0].ingot_count);
                const patchVersion = ingotCount; // 1.0.0, 1.0.1, 1.0.2, etc.
                const version = `1.0.${patchVersion}`;
                // Update sepulka status to CASTING
                await context.db.query('UPDATE sepulkas SET status = $1, updated_at = NOW() WHERE id = $2', ['CASTING', sepulkaId]);
                // Create ingot record with version
                const buildHash = `build_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
                const ingotResult = await context.db.query(`
          INSERT INTO ingots (sepulka_id, version, status, build_hash, created_by)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *
        `, [sepulkaId, version, 'BUILDING', buildHash, smith.id]);
                const ingot = ingotResult.rows[0];
                // Create audit trail
                await context.db.query(`
          INSERT INTO audit_stamps (entity_type, entity_id, action, actor_id, metadata)
          VALUES ($1, $2, $3, $4, $5)
        `, [
                    'ingot',
                    ingot.id,
                    'CAST',
                    smith.id,
                    JSON.stringify({
                        sepulka_id: sepulkaId,
                        build_hash: buildHash,
                        version: version
                    })
                ]);
                // Trigger foundry build process via Redis
                await context.redis.setex(`foundry:build:${ingot.id}`, 3600, // 1 hour expiry
                JSON.stringify({
                    ingotId: ingot.id,
                    sepulkaId: sepulkaId,
                    buildHash: buildHash,
                    version: version,
                    requestedBy: smith.id,
                    requestedAt: new Date().toISOString()
                }));
                // Clear cache (if dataloaders exist)
                if (context.dataloaders?.sepulka?.clear) {
                    context.dataloaders.sepulka.clear(sepulkaId);
                }
                return {
                    ingot: {
                        ...ingot,
                        artifacts: [] // Initially empty, populated by foundry
                    },
                    errors: []
                };
            }
            catch (error) {
                if (error instanceof errors_1.NotFoundError || error instanceof errors_1.ValidationError) {
                    throw error;
                }
                throw new errors_1.ServiceError('database', `Failed to cast ingot: ${error}`);
            }
        },
        async deleteSepulka(parent, { id }, context) {
            const { smith } = await (0, context_1.requirePermission)(context, shared_types_1.Permission.DELETE_SEPULKA);
            // Validate UUID format
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(id)) {
                throw new errors_1.ValidationError('Invalid UUID format');
            }
            try {
                // Check if sepulka exists and user owns it
                const sepulkaQuery = await context.db.query('SELECT * FROM sepulkas WHERE id = $1 AND created_by = $2', [id, smith.id]);
                if (sepulkaQuery.rows.length === 0) {
                    throw new errors_1.NotFoundError('Sepulka', id);
                }
                const sepulka = sepulkaQuery.rows[0];
                // Check if sepulka can be deleted (not if it has active ingots)
                const activeIngotsQuery = await context.db.query('SELECT COUNT(*) as count FROM ingots WHERE sepulka_id = $1 AND status IN ($2, $3)', [id, 'BUILDING', 'DEPLOYING']);
                const activeIngots = parseInt(activeIngotsQuery.rows[0].count);
                if (activeIngots > 0) {
                    throw new errors_1.ValidationError('Cannot delete sepulka with active builds or deployments');
                }
                // Delete sepulka and related data
                await context.db.query('BEGIN');
                try {
                    // Delete sepulka-alloy associations
                    await context.db.query('DELETE FROM sepulka_alloys WHERE sepulka_id = $1', [id]);
                    // Delete completed ingots (if any)
                    await context.db.query('DELETE FROM ingots WHERE sepulka_id = $1', [id]);
                    // Delete audit stamps
                    await context.db.query('DELETE FROM audit_stamps WHERE entity_type = $1 AND entity_id = $2', ['sepulka', id]);
                    // Delete the sepulka itself
                    await context.db.query('DELETE FROM sepulkas WHERE id = $1', [id]);
                    await context.db.query('COMMIT');
                    // Clear cache
                    if (context.dataloaders?.sepulka?.clear) {
                        context.dataloaders.sepulka.clear(id);
                    }
                    return {
                        success: true,
                        errors: []
                    };
                }
                catch (error) {
                    await context.db.query('ROLLBACK');
                    throw error;
                }
            }
            catch (error) {
                if (error instanceof errors_1.NotFoundError || error instanceof errors_1.ValidationError) {
                    throw error;
                }
                throw new errors_1.ServiceError('database', `Failed to delete sepulka: ${error}`);
            }
        },
        async temperIngot(parent, { ingotId, input }, context) {
            const { smith } = await (0, context_1.requirePermission)(context, shared_types_1.Permission.TEMPER_INGOT);
            // TODO: Implement tempering logic
            // This would integrate with the optimization service
            throw new errors_1.ServiceError('temper', 'Tempering service not yet implemented');
        },
        async quenchToFleet(parent, { ingotId, fleetId, rolloutPercent = 100 }, context) {
            const { smith } = await (0, context_1.requirePermission)(context, shared_types_1.Permission.QUENCH_TO_FLEET);
            // TODO: Implement deployment logic
            // This would coordinate with the deployment service
            throw new errors_1.ServiceError('deployment', 'Deployment service not yet implemented');
        }
    },
    Sepulka: {
        // Field mapping for snake_case to camelCase
        createdAt: (parent) => parent.created_at,
        updatedAt: (parent) => parent.updated_at,
        async pattern(parent, args, context) {
            if (!parent.pattern_id)
                return null;
            return await context.dataloaders.pattern.load(parent.pattern_id);
        },
        async alloys(parent, args, context) {
            return await context.dataloaders.alloysBySepulka.load(parent.id);
        },
        async ingots(parent, args, context) {
            const result = await context.db.query('SELECT * FROM ingots WHERE sepulka_id = $1 ORDER BY created_at DESC', [parent.id]);
            return result.rows;
        },
        async createdBy(parent, args, context) {
            return await context.dataloaders.smith.load(parent.created_by);
        }
    },
    Ingot: {
        // Field mapping for snake_case to camelCase
        sepulkaId: (parent) => parent.sepulka_id,
        buildHash: (parent) => parent.build_hash,
        createdAt: (parent) => parent.created_at,
        async artifacts(parent, args, context) {
            // For now, return empty array as artifacts are generated during foundry process
            // In production, this would query the artifact storage system
            return [];
        }
    }
};
