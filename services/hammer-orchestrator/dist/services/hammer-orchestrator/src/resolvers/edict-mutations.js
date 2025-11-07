"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.edictMutations = void 0;
const context_1 = require("../context");
const errors_1 = require("../errors");
const shared_types_1 = require("@sepulki/shared-types");
/**
 * Edict (Policy) System Mutations
 *
 * Implements the policy management system for robot fleet governance.
 * Edicts define rules, constraints, and safety policies that can be
 * applied to fleets, robots, or locations.
 */
/**
 * Validates edict rules JSON structure
 */
function validateEdictRules(rules) {
    if (!rules || typeof rules !== 'object') {
        throw new errors_1.ValidationError('Rules must be a valid JSON object', 'rules');
    }
    // Check for required rule structure
    if (!rules.condition) {
        throw new errors_1.ValidationError('Rules must include a condition object', 'rules.condition');
    }
    if (!rules.actions || !Array.isArray(rules.actions)) {
        throw new errors_1.ValidationError('Rules must include an actions array', 'rules.actions');
    }
    // Validate condition structure
    const condition = rules.condition;
    if (!condition.type || !condition.operator || !Array.isArray(condition.rules)) {
        throw new errors_1.ValidationError('Condition must have type, operator, and rules array', 'rules.condition');
    }
    // Validate actions
    for (const action of rules.actions) {
        if (!action.type || !action.parameters || typeof action.immediate !== 'boolean') {
            throw new errors_1.ValidationError('Each action must have type, parameters, and immediate flag', 'rules.actions');
        }
    }
}
/**
 * Validates appliesTo constraints structure
 */
function validateAppliesTo(appliesTo) {
    if (!appliesTo || typeof appliesTo !== 'object') {
        throw new errors_1.ValidationError('appliesTo must be a valid JSON object', 'appliesTo');
    }
    // Validate array fields if present
    const arrayFields = ['fleets', 'robots', 'locations', 'taskTypes', 'alloys'];
    for (const field of arrayFields) {
        if (appliesTo[field] !== undefined && !Array.isArray(appliesTo[field])) {
            throw new errors_1.ValidationError(`appliesTo.${field} must be an array`, `appliesTo.${field}`);
        }
    }
}
exports.edictMutations = {
    /**
     * Add a new edict (policy) to the system
     *
     * @param input - Edict configuration including name, type, rules, severity, and constraints
     * @returns The newly created edict
     */
    async addEdict(parent, { input }, context) {
        // Require MANAGE_EDICTS permission
        const { smith } = await (0, context_1.requirePermission)(context, shared_types_1.Permission.MANAGE_EDICTS);
        // Validate input
        if (!input.name || input.name.trim().length === 0) {
            throw new errors_1.ValidationError('Edict name is required', 'name');
        }
        if (!Object.values(shared_types_1.EdictType).includes(input.type)) {
            throw new errors_1.ValidationError(`Invalid edict type: ${input.type}`, 'type');
        }
        if (!Object.values(shared_types_1.EdictSeverity).includes(input.severity)) {
            throw new errors_1.ValidationError(`Invalid severity level: ${input.severity}`, 'severity');
        }
        // Validate rules JSON structure
        validateEdictRules(input.rules);
        // Validate appliesTo if provided
        const appliesTo = input.appliesTo || {};
        validateAppliesTo(appliesTo);
        try {
            // Insert edict into database
            const query = `
        INSERT INTO edicts (
          name,
          description,
          type,
          rules,
          severity,
          active,
          applies_to,
          created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
            const result = await context.db.query(query, [
                input.name,
                input.description || null,
                input.type,
                JSON.stringify(input.rules),
                input.severity,
                input.active !== undefined ? input.active : true,
                JSON.stringify(appliesTo),
                smith.id
            ]);
            const edict = result.rows[0];
            // Log audit trail
            await context.db.query(`INSERT INTO audit_log (
          smith_id,
          action,
          resource_type,
          resource_id,
          details
        ) VALUES ($1, $2, $3, $4, $5)`, [
                smith.id,
                'CREATE_EDICT',
                'edict',
                edict.id,
                JSON.stringify({
                    name: edict.name,
                    type: edict.type,
                    severity: edict.severity
                })
            ]);
            return edict;
        }
        catch (error) {
            console.error('Failed to create edict:', error);
            throw new errors_1.ServiceError('database', `Failed to create edict: ${error}`);
        }
    },
    /**
     * Update an existing edict
     *
     * @param id - Edict ID to update
     * @param input - Updated edict fields
     * @returns The updated edict
     */
    async updateEdict(parent, { id, input }, context) {
        // Require MANAGE_EDICTS permission
        const { smith } = await (0, context_1.requirePermission)(context, shared_types_1.Permission.MANAGE_EDICTS);
        // Fetch existing edict
        const existingQuery = await context.db.query('SELECT * FROM edicts WHERE id = $1', [id]);
        if (existingQuery.rows.length === 0) {
            throw new errors_1.NotFoundError('Edict', id);
        }
        const existingEdict = existingQuery.rows[0];
        // Check if user has permission to update this edict
        // Admins can update any edict, others can only update their own
        if (smith.role !== 'ADMIN' && existingEdict.created_by !== smith.id) {
            throw new errors_1.AuthorizationError('You do not have permission to update this edict');
        }
        // Validate updated fields
        if (input.type && !Object.values(shared_types_1.EdictType).includes(input.type)) {
            throw new errors_1.ValidationError(`Invalid edict type: ${input.type}`, 'type');
        }
        if (input.severity && !Object.values(shared_types_1.EdictSeverity).includes(input.severity)) {
            throw new errors_1.ValidationError(`Invalid severity level: ${input.severity}`, 'severity');
        }
        if (input.rules) {
            validateEdictRules(input.rules);
        }
        if (input.appliesTo) {
            validateAppliesTo(input.appliesTo);
        }
        try {
            // Check if any active violations would be affected
            const violationsQuery = await context.db.query(`SELECT COUNT(*) as count
         FROM policy_violations
         WHERE edict_id = $1 AND resolved = false`, [id]);
            const activeViolations = parseInt(violationsQuery.rows[0].count);
            // Build update query dynamically based on provided fields
            const updateFields = [];
            const updateValues = [];
            let paramIndex = 1;
            if (input.name !== undefined) {
                updateFields.push(`name = $${paramIndex}`);
                updateValues.push(input.name);
                paramIndex++;
            }
            if (input.description !== undefined) {
                updateFields.push(`description = $${paramIndex}`);
                updateValues.push(input.description);
                paramIndex++;
            }
            if (input.type !== undefined) {
                updateFields.push(`type = $${paramIndex}`);
                updateValues.push(input.type);
                paramIndex++;
            }
            if (input.rules !== undefined) {
                updateFields.push(`rules = $${paramIndex}::jsonb`);
                updateValues.push(JSON.stringify(input.rules));
                paramIndex++;
            }
            if (input.severity !== undefined) {
                updateFields.push(`severity = $${paramIndex}`);
                updateValues.push(input.severity);
                paramIndex++;
            }
            if (input.appliesTo !== undefined) {
                updateFields.push(`applies_to = $${paramIndex}::jsonb`);
                updateValues.push(JSON.stringify(input.appliesTo));
                paramIndex++;
            }
            if (input.active !== undefined) {
                updateFields.push(`active = $${paramIndex}`);
                updateValues.push(input.active);
                paramIndex++;
            }
            // Always update updated_at timestamp
            updateFields.push(`updated_at = NOW()`);
            // Add ID for WHERE clause
            updateValues.push(id);
            const updateQuery = `
        UPDATE edicts
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;
            const result = await context.db.query(updateQuery, updateValues);
            const updatedEdict = result.rows[0];
            // Log audit trail
            await context.db.query(`INSERT INTO audit_log (
          smith_id,
          action,
          resource_type,
          resource_id,
          details
        ) VALUES ($1, $2, $3, $4, $5)`, [
                smith.id,
                'UPDATE_EDICT',
                'edict',
                id,
                JSON.stringify({
                    changes: input,
                    activeViolations
                })
            ]);
            return updatedEdict;
        }
        catch (error) {
            if (error instanceof errors_1.NotFoundError || error instanceof errors_1.ValidationError || error instanceof errors_1.AuthorizationError) {
                throw error;
            }
            console.error('Failed to update edict:', error);
            throw new errors_1.ServiceError('database', `Failed to update edict: ${error}`);
        }
    },
    /**
     * Deactivate an edict
     *
     * Sets active flag to false and resolves any active violations
     *
     * @param id - Edict ID to deactivate
     * @param reason - Optional reason for deactivation
     * @returns The deactivated edict
     */
    async deactivateEdict(parent, { id, reason }, context) {
        // Require MANAGE_EDICTS permission
        const { smith } = await (0, context_1.requirePermission)(context, shared_types_1.Permission.MANAGE_EDICTS);
        // Fetch existing edict
        const existingQuery = await context.db.query('SELECT * FROM edicts WHERE id = $1', [id]);
        if (existingQuery.rows.length === 0) {
            throw new errors_1.NotFoundError('Edict', id);
        }
        const existingEdict = existingQuery.rows[0];
        // Check permissions
        if (smith.role !== 'ADMIN' && existingEdict.created_by !== smith.id) {
            throw new errors_1.AuthorizationError('You do not have permission to deactivate this edict');
        }
        try {
            // Start transaction
            const client = await context.db.connect();
            try {
                await client.query('BEGIN');
                // Deactivate the edict
                const updateQuery = `
          UPDATE edicts
          SET active = false,
              applies_to = '{}'::jsonb,
              updated_at = NOW()
          WHERE id = $1
          RETURNING *
        `;
                const result = await client.query(updateQuery, [id]);
                const deactivatedEdict = result.rows[0];
                // Resolve all active violations for this edict
                const resolveViolationsQuery = `
          UPDATE policy_violations
          SET resolved = true,
              resolved_by = $1,
              resolved_at = NOW()
          WHERE edict_id = $2 AND resolved = false
          RETURNING id
        `;
                const violationsResult = await client.query(resolveViolationsQuery, [
                    smith.id,
                    id
                ]);
                const resolvedViolationIds = violationsResult.rows.map(row => row.id);
                // Log audit trail
                await client.query(`INSERT INTO audit_log (
            smith_id,
            action,
            resource_type,
            resource_id,
            details
          ) VALUES ($1, $2, $3, $4, $5)`, [
                    smith.id,
                    'DEACTIVATE_EDICT',
                    'edict',
                    id,
                    JSON.stringify({
                        reason: reason || 'No reason provided',
                        resolvedViolations: resolvedViolationIds.length,
                        edictName: deactivatedEdict.name
                    })
                ]);
                await client.query('COMMIT');
                return deactivatedEdict;
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
            if (error instanceof errors_1.NotFoundError || error instanceof errors_1.AuthorizationError) {
                throw error;
            }
            console.error('Failed to deactivate edict:', error);
            throw new errors_1.ServiceError('database', `Failed to deactivate edict: ${error}`);
        }
    },
    /**
     * Recall a fleet to a previous ingot version
     *
     * Rolls back all robots in a fleet to a specified ingot version.
     * This is useful for emergency rollbacks or when issues are discovered
     * with a newer version.
     *
     * @param fleetId - Fleet to recall
     * @param toVersion - Ingot version to roll back to
     * @returns Updated fleet with deployment information
     */
    async recallFleet(parent, { fleetId, toVersion }, context) {
        // Require RECALL_FLEET permission
        const { smith } = await (0, context_1.requirePermission)(context, shared_types_1.Permission.RECALL_FLEET);
        // Validate fleet exists
        const fleet = await context.dataloaders.fleet.load(fleetId);
        if (!fleet) {
            throw new errors_1.NotFoundError('Fleet', fleetId);
        }
        try {
            // Start transaction
            const client = await context.db.connect();
            try {
                await client.query('BEGIN');
                // Find the target ingot version for this fleet
                // Get the first robot in the fleet to determine sepulka
                const robotsQuery = await client.query('SELECT id, sepulka_id, current_ingot_id FROM robots WHERE fleet_id = $1 LIMIT 1', [fleetId]);
                if (robotsQuery.rows.length === 0) {
                    throw new errors_1.ValidationError('Fleet has no robots', 'fleetId');
                }
                const firstRobot = robotsQuery.rows[0];
                const sepulkaId = firstRobot.sepulka_id;
                // Find the ingot with the specified version for this sepulka
                const ingotQuery = await client.query(`SELECT id, version, status
           FROM ingots
           WHERE sepulka_id = $1 AND version = $2
           ORDER BY created_at DESC
           LIMIT 1`, [sepulkaId, toVersion]);
                if (ingotQuery.rows.length === 0) {
                    throw new errors_1.NotFoundError('Ingot version', toVersion);
                }
                const targetIngot = ingotQuery.rows[0];
                // Validate ingot is deployable
                if (!['READY', 'TEMPERED', 'DEPLOYED'].includes(targetIngot.status)) {
                    throw new errors_1.ValidationError(`Cannot recall to ingot with status: ${targetIngot.status}`, 'toVersion');
                }
                // Determine if this is a rollback by checking if robots currently have a different version
                const currentVersionQuery = await client.query(`SELECT DISTINCT i.version
           FROM robots r
           JOIN ingots i ON r.current_ingot_id = i.id
           WHERE r.fleet_id = $1`, [fleetId]);
                const isRollback = currentVersionQuery.rows.length > 0 &&
                    currentVersionQuery.rows[0].version !== toVersion;
                // Get all robots in fleet
                const allRobotsQuery = await client.query('SELECT id, name, sepulka_id FROM robots WHERE fleet_id = $1', [fleetId]);
                const robots = allRobotsQuery.rows;
                const successfulUpdates = [];
                const failedUpdates = [];
                // Update each robot to the target ingot
                for (const robot of robots) {
                    try {
                        // For robots with different sepulkas, find their corresponding ingot version
                        let robotTargetIngotId = targetIngot.id;
                        if (robot.sepulka_id !== sepulkaId) {
                            const robotIngotQuery = await client.query(`SELECT id FROM ingots
                 WHERE sepulka_id = $1 AND version = $2
                 ORDER BY created_at DESC
                 LIMIT 1`, [robot.sepulka_id, toVersion]);
                            if (robotIngotQuery.rows.length === 0) {
                                throw new Error(`No ingot found for version ${toVersion}`);
                            }
                            robotTargetIngotId = robotIngotQuery.rows[0].id;
                        }
                        // Update robot's current ingot
                        await client.query(`UPDATE robots
               SET current_ingot_id = $1, updated_at = NOW()
               WHERE id = $2`, [robotTargetIngotId, robot.id]);
                        successfulUpdates.push(robot.id);
                    }
                    catch (error) {
                        console.error(`Failed to update robot ${robot.id}:`, error);
                        failedUpdates.push({
                            robotId: robot.id,
                            error: error instanceof Error ? error.message : 'Unknown error'
                        });
                    }
                }
                // Create a simple deployment record (no history table yet)
                // In the future, this could be stored in a deployment_history table
                const deploymentTimestamp = new Date();
                // Log audit trail
                await client.query(`INSERT INTO audit_log (
            smith_id,
            action,
            resource_type,
            resource_id,
            details
          ) VALUES ($1, $2, $3, $4, $5)`, [
                    smith.id,
                    'RECALL_FLEET',
                    'fleet',
                    fleetId,
                    JSON.stringify({
                        toVersion,
                        targetIngotId: targetIngot.id,
                        successfulUpdates: successfulUpdates.length,
                        failedUpdates: failedUpdates.length,
                        failures: failedUpdates
                    })
                ]);
                await client.query('COMMIT');
                // Clear caches
                context.dataloaders.fleet.clear(fleetId);
                successfulUpdates.forEach(robotId => {
                    context.dataloaders.robot.clear(robotId);
                });
                // Return deployment payload
                return {
                    deployment: {
                        id: `deployment-${fleetId}-${targetIngot.id}-${Date.now()}`,
                        ingotId: targetIngot.id,
                        fleetId: fleetId,
                        status: failedUpdates.length > 0 ? 'PARTIAL' : 'COMPLETED',
                        rolloutPercent: 100,
                        createdAt: deploymentTimestamp
                    },
                    errors: failedUpdates.map(failure => ({
                        code: 'ROBOT_UPDATE_FAILED',
                        message: `Failed to update robot ${failure.robotId}: ${failure.error}`,
                        field: 'robotId'
                    }))
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
            if (error instanceof errors_1.NotFoundError || error instanceof errors_1.ValidationError || error instanceof errors_1.AuthorizationError) {
                throw error;
            }
            console.error('Failed to recall fleet:', error);
            throw new errors_1.ServiceError('database', `Failed to recall fleet: ${error}`);
        }
    }
};
