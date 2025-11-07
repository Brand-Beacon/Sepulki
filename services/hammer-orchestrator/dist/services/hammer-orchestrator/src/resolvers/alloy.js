"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.alloyResolvers = void 0;
const context_1 = require("../context");
const errors_1 = require("../errors");
const shared_types_1 = require("@sepulki/shared-types");
exports.alloyResolvers = {
    Query: {
        async alloys(parent, args, context) {
            await (0, context_1.requirePermission)(context, shared_types_1.Permission.VIEW_CATALOG);
            const { filter, limit = 50, offset = 0 } = args;
            let query = 'SELECT * FROM alloys WHERE 1=1';
            const params = [];
            let paramIndex = 1;
            // Apply filters
            if (filter?.type) {
                query += ` AND type = $${paramIndex}`;
                params.push(filter.type);
                paramIndex++;
            }
            if (filter?.tags && filter.tags.length > 0) {
                query += ` AND tags && $${paramIndex}`;
                params.push(filter.tags);
                paramIndex++;
            }
            // Apply pagination
            query += ` ORDER BY name ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
            params.push(limit, offset);
            try {
                const result = await context.db.query(query, params);
                return result.rows;
            }
            catch (error) {
                throw new errors_1.ServiceError('database', `Failed to fetch alloys: ${error}`);
            }
        },
        async alloy(parent, { id }, context) {
            await (0, context_1.requirePermission)(context, shared_types_1.Permission.VIEW_CATALOG);
            const alloy = await context.dataloaders.alloy.load(id);
            if (!alloy) {
                throw new errors_1.NotFoundError('Alloy', id);
            }
            return alloy;
        },
        async patterns(parent, args, context) {
            await (0, context_1.requirePermission)(context, shared_types_1.Permission.VIEW_CATALOG);
            const { category, limit = 50, offset = 0 } = args;
            let query = 'SELECT * FROM patterns WHERE 1=1';
            const params = [];
            let paramIndex = 1;
            if (category) {
                query += ` AND category = $${paramIndex}`;
                params.push(category);
                paramIndex++;
            }
            query += ` ORDER BY name ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
            params.push(limit, offset);
            try {
                const result = await context.db.query(query, params);
                return result.rows;
            }
            catch (error) {
                throw new errors_1.ServiceError('database', `Failed to fetch patterns: ${error}`);
            }
        },
        async pattern(parent, { id }, context) {
            await (0, context_1.requirePermission)(context, shared_types_1.Permission.VIEW_CATALOG);
            const pattern = await context.dataloaders.pattern.load(id);
            if (!pattern) {
                throw new errors_1.NotFoundError('Pattern', id);
            }
            return pattern;
        }
    },
    Alloy: {
    // Alloy fields are mostly self-contained
    // Add any computed fields or relations here if needed
    }
};
