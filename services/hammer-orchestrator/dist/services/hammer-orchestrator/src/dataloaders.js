"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupDataLoaders = setupDataLoaders;
const dataloader_1 = __importDefault(require("dataloader"));
function setupDataLoaders(db) {
    // Sepulka loaders
    const sepulkaLoader = new dataloader_1.default(async (ids) => {
        const query = 'SELECT * FROM sepulkas WHERE id = ANY($1)';
        const result = await db.query(query, [ids]);
        const sepulkaMap = new Map(result.rows.map(row => [row.id, row]));
        return ids.map(id => sepulkaMap.get(id) || null);
    });
    // Alloy loaders
    const alloyLoader = new dataloader_1.default(async (ids) => {
        const query = 'SELECT * FROM alloys WHERE id = ANY($1)';
        const result = await db.query(query, [ids]);
        const alloyMap = new Map(result.rows.map(row => [row.id, row]));
        return ids.map(id => alloyMap.get(id) || null);
    });
    const alloysBySepulkaLoader = new dataloader_1.default(async (sepulkaIds) => {
        const query = `
      SELECT a.*, sa.sepulka_id 
      FROM alloys a 
      JOIN sepulka_alloys sa ON a.id = sa.alloy_id 
      WHERE sa.sepulka_id = ANY($1)
    `;
        const result = await db.query(query, [sepulkaIds]);
        const alloyMap = new Map();
        sepulkaIds.forEach(id => alloyMap.set(id, []));
        result.rows.forEach(row => {
            const sepulkaAlloys = alloyMap.get(row.sepulka_id) || [];
            sepulkaAlloys.push(row);
            alloyMap.set(row.sepulka_id, sepulkaAlloys);
        });
        return sepulkaIds.map(id => alloyMap.get(id) || []);
    });
    // Pattern loader
    const patternLoader = new dataloader_1.default(async (ids) => {
        const query = 'SELECT * FROM patterns WHERE id = ANY($1)';
        const result = await db.query(query, [ids]);
        const patternMap = new Map(result.rows.map(row => [row.id, row]));
        return ids.map(id => patternMap.get(id) || null);
    });
    // Fleet loaders
    const fleetLoader = new dataloader_1.default(async (ids) => {
        const query = 'SELECT * FROM fleets WHERE id = ANY($1)';
        const result = await db.query(query, [ids]);
        const fleetMap = new Map(result.rows.map(row => [row.id, row]));
        return ids.map(id => fleetMap.get(id) || null);
    });
    const robotsByFleetLoader = new dataloader_1.default(async (fleetIds) => {
        const query = 'SELECT * FROM robots WHERE fleet_id = ANY($1)';
        const result = await db.query(query, [fleetIds]);
        const robotMap = new Map();
        fleetIds.forEach(id => robotMap.set(id, []));
        result.rows.forEach(row => {
            const fleetRobots = robotMap.get(row.fleet_id) || [];
            fleetRobots.push(row);
            robotMap.set(row.fleet_id, fleetRobots);
        });
        return fleetIds.map(id => robotMap.get(id) || []);
    });
    // Robot loader
    const robotLoader = new dataloader_1.default(async (ids) => {
        const query = 'SELECT * FROM robots WHERE id = ANY($1)';
        const result = await db.query(query, [ids]);
        const robotMap = new Map(result.rows.map(row => [row.id, row]));
        return ids.map(id => robotMap.get(id) || null);
    });
    // Task loaders
    const taskLoader = new dataloader_1.default(async (ids) => {
        const query = 'SELECT * FROM tasks WHERE id = ANY($1)';
        const result = await db.query(query, [ids]);
        const taskMap = new Map(result.rows.map(row => [row.id, row]));
        return ids.map(id => taskMap.get(id) || null);
    });
    const tasksByFleetLoader = new dataloader_1.default(async (fleetIds) => {
        const query = `
      SELECT t.*, tr.fleet_id 
      FROM tasks t 
      JOIN task_robots tr ON t.id = tr.task_id 
      JOIN robots r ON tr.robot_id = r.id 
      WHERE r.fleet_id = ANY($1)
    `;
        const result = await db.query(query, [fleetIds]);
        const taskMap = new Map();
        fleetIds.forEach(id => taskMap.set(id, []));
        result.rows.forEach(row => {
            const fleetTasks = taskMap.get(row.fleet_id) || [];
            fleetTasks.push(row);
            taskMap.set(row.fleet_id, fleetTasks);
        });
        return fleetIds.map(id => taskMap.get(id) || []);
    });
    // Smith loader
    const smithLoader = new dataloader_1.default(async (ids) => {
        const query = 'SELECT * FROM smiths WHERE id = ANY($1)';
        const result = await db.query(query, [ids]);
        const smithMap = new Map(result.rows.map(row => [row.id, row]));
        return ids.map(id => smithMap.get(id) || null);
    });
    // Factory Floor loaders
    const factoryFloorLoader = new dataloader_1.default(async (ids) => {
        const query = 'SELECT * FROM factory_floors WHERE id = ANY($1)';
        const result = await db.query(query, [ids]);
        const floorMap = new Map(result.rows.map(row => [row.id, row]));
        return ids.map(id => floorMap.get(id) || null);
    });
    const robotsByFactoryFloorLoader = new dataloader_1.default(async (floorIds) => {
        const query = 'SELECT * FROM robots WHERE factory_floor_id = ANY($1) ORDER BY name ASC';
        const result = await db.query(query, [floorIds]);
        const robotMap = new Map();
        floorIds.forEach(id => robotMap.set(id, []));
        result.rows.forEach(row => {
            const floorRobots = robotMap.get(row.factory_floor_id) || [];
            floorRobots.push(row);
            robotMap.set(row.factory_floor_id, floorRobots);
        });
        return floorIds.map(id => robotMap.get(id) || []);
    });
    return {
        sepulka: sepulkaLoader,
        alloy: alloyLoader,
        alloysBySepulka: alloysBySepulkaLoader,
        pattern: patternLoader,
        fleet: fleetLoader,
        robotsByFleet: robotsByFleetLoader,
        robot: robotLoader,
        task: taskLoader,
        tasksByFleet: tasksByFleetLoader,
        smith: smithLoader,
        factoryFloor: factoryFloorLoader,
        robotsByFactoryFloor: robotsByFactoryFloorLoader,
    };
}
