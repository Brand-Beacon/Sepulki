"use strict";
/**
 * Telemetry Generator Type Definitions
 * Comprehensive types for realistic robot telemetry simulation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FailureType = exports.RobotActivity = exports.ScenarioType = void 0;
/**
 * Scenario types for different robot fleet operations
 */
var ScenarioType;
(function (ScenarioType) {
    ScenarioType["LAWN_MOWING"] = "LAWN_MOWING";
    ScenarioType["WAREHOUSE_LOGISTICS"] = "WAREHOUSE_LOGISTICS";
    ScenarioType["AGRICULTURE"] = "AGRICULTURE";
    ScenarioType["CUSTOM"] = "CUSTOM";
})(ScenarioType || (exports.ScenarioType = ScenarioType = {}));
/**
 * Robot activity states with realistic transitions
 */
var RobotActivity;
(function (RobotActivity) {
    RobotActivity["IDLE"] = "IDLE";
    RobotActivity["TRAVELING"] = "TRAVELING";
    RobotActivity["WORKING"] = "WORKING";
    RobotActivity["CHARGING"] = "CHARGING";
    RobotActivity["RETURNING_TO_BASE"] = "RETURNING_TO_BASE";
    RobotActivity["ERROR"] = "ERROR";
    RobotActivity["MAINTENANCE"] = "MAINTENANCE";
})(RobotActivity || (exports.RobotActivity = RobotActivity = {}));
/**
 * Types of failures that can be injected
 */
var FailureType;
(function (FailureType) {
    FailureType["BATTERY_DRAIN"] = "BATTERY_DRAIN";
    FailureType["CONNECTION_LOSS"] = "CONNECTION_LOSS";
    FailureType["SENSOR_ERROR"] = "SENSOR_ERROR";
    FailureType["MOTOR_OVERHEATING"] = "MOTOR_OVERHEATING";
    FailureType["GPS_DRIFT"] = "GPS_DRIFT";
    FailureType["SOFTWARE_CRASH"] = "SOFTWARE_CRASH";
    FailureType["OBSTACLE_COLLISION"] = "OBSTACLE_COLLISION";
    FailureType["COMMUNICATION_LAG"] = "COMMUNICATION_LAG"; // High latency
})(FailureType || (exports.FailureType = FailureType = {}));
