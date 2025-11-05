"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsaacSimResolver = void 0;
const type_graphql_1 = require("type-graphql");
const isaacSim_1 = require("../types/isaacSim");
const isaac_sim_aws_bridge_1 = require("../../anvil-sim/src/isaac_sim_aws_bridge");
let IsaacSimResolver = class IsaacSimResolver {
    constructor() {
        // Initialize AWS bridge with environment variable
        const awsPublicIp = process.env.AWS_ISAAC_SIM_IP || 'localhost';
        this.awsBridge = new isaac_sim_aws_bridge_1.IsaacSimAwsBridge(awsPublicIp);
    }
    async createIsaacSimSession(robotConfig, context) {
        try {
            console.log('Creating Isaac Sim session for user:', context.user?.id);
            // Validate user authentication
            if (!context.user) {
                throw new Error('Authentication required');
            }
            // Create session on AWS Isaac Sim
            const sessionData = await this.awsBridge.createSession(robotConfig, context.user.id);
            if (sessionData.status !== 'ready') {
                throw new Error(`Failed to create Isaac Sim session: ${sessionData.error || 'Unknown error'}`);
            }
            // Load robot into the session
            const loadResult = await this.awsBridge.loadRobot(sessionData.session_id, robotConfig);
            if (!loadResult.success) {
                throw new Error(`Failed to load robot: ${loadResult.error}`);
            }
            // Return session information
            return {
                sessionId: sessionData.session_id,
                userId: context.user.id,
                robotName: robotConfig.name,
                webrtcUrl: sessionData.webrtc_url,
                status: 'ready',
                createdAt: new Date(sessionData.created_at),
                robotLoaded: true,
                awsPublicIp: process.env.AWS_ISAAC_SIM_IP || 'localhost'
            };
        }
        catch (error) {
            console.error('Failed to create Isaac Sim session:', error);
            throw new Error(`Isaac Sim session creation failed: ${error.message}`);
        }
    }
    async updateIsaacSimJoints(sessionId, jointStates, context) {
        try {
            // Validate user authentication
            if (!context.user) {
                throw new Error('Authentication required');
            }
            // Parse joint states (assuming format: "jointName:value")
            const jointStatesDict = {};
            for (const jointState of jointStates) {
                const [name, value] = jointState.split(':');
                jointStatesDict[name] = parseFloat(value);
            }
            // Update joints in Isaac Sim
            const result = await this.awsBridge.updateJointStates(sessionId, jointStatesDict);
            if (!result.success) {
                throw new Error(`Failed to update joints: ${result.error}`);
            }
            return true;
        }
        catch (error) {
            console.error('Failed to update Isaac Sim joints:', error);
            throw new Error(`Joint update failed: ${error.message}`);
        }
    }
    async updateIsaacSimCamera(sessionId, cameraConfig, context) {
        try {
            // Validate user authentication
            if (!context.user) {
                throw new Error('Authentication required');
            }
            // Update camera in Isaac Sim
            const result = await this.awsBridge.updateCamera(sessionId, cameraConfig);
            if (!result.success) {
                throw new Error(`Failed to update camera: ${result.error}`);
            }
            return true;
        }
        catch (error) {
            console.error('Failed to update Isaac Sim camera:', error);
            throw new Error(`Camera update failed: ${error.message}`);
        }
    }
    async getIsaacSimSession(sessionId, context) {
        try {
            // Validate user authentication
            if (!context.user) {
                throw new Error('Authentication required');
            }
            // Get session status from AWS Isaac Sim
            const sessionData = await this.awsBridge.getSessionStatus(sessionId);
            if (sessionData.error) {
                throw new Error(`Session not found: ${sessionData.error}`);
            }
            // Verify user owns this session
            if (sessionData.user_id !== context.user.id) {
                throw new Error('Access denied: Session belongs to different user');
            }
            return {
                sessionId: sessionData.session_id,
                userId: sessionData.user_id,
                robotName: sessionData.robot_config?.name || 'Unknown',
                webrtcUrl: sessionData.webrtc_url,
                status: sessionData.status,
                createdAt: new Date(sessionData.created_at),
                robotLoaded: sessionData.robot_loaded || false,
                awsPublicIp: process.env.AWS_ISAAC_SIM_IP || 'localhost'
            };
        }
        catch (error) {
            console.error('Failed to get Isaac Sim session:', error);
            throw new Error(`Session retrieval failed: ${error.message}`);
        }
    }
    async getIsaacSimSessions(context) {
        try {
            // Validate user authentication
            if (!context.user) {
                throw new Error('Authentication required');
            }
            // Get all active sessions
            const activeSessions = this.awsBridge.getActiveSessions();
            // Filter sessions for current user
            const userSessions = activeSessions
                .filter(session => session.user_id === context.user.id)
                .map(session => ({
                sessionId: session.session_id,
                userId: session.user_id,
                robotName: session.robot_config?.name || 'Unknown',
                webrtcUrl: session.webrtc_url,
                status: session.status,
                createdAt: new Date(session.created_at),
                robotLoaded: session.robot_loaded || false,
                awsPublicIp: process.env.AWS_ISAAC_SIM_IP || 'localhost'
            }));
            return userSessions;
        }
        catch (error) {
            console.error('Failed to get Isaac Sim sessions:', error);
            throw new Error(`Sessions retrieval failed: ${error.message}`);
        }
    }
    async destroyIsaacSimSession(sessionId, context) {
        try {
            // Validate user authentication
            if (!context.user) {
                throw new Error('Authentication required');
            }
            // Verify user owns this session
            const sessionData = await this.awsBridge.getSessionStatus(sessionId);
            if (sessionData.error) {
                throw new Error(`Session not found: ${sessionData.error}`);
            }
            if (sessionData.user_id !== context.user.id) {
                throw new Error('Access denied: Session belongs to different user');
            }
            // Destroy session on AWS Isaac Sim
            const result = await this.awsBridge.destroySession(sessionId);
            if (!result.success) {
                throw new Error(`Failed to destroy session: ${result.error}`);
            }
            return true;
        }
        catch (error) {
            console.error('Failed to destroy Isaac Sim session:', error);
            throw new Error(`Session destruction failed: ${error.message}`);
        }
    }
    async getIsaacSimHealth(context) {
        try {
            // Check AWS Isaac Sim health
            const healthData = await this.awsBridge.healthCheck();
            return {
                healthy: healthData.healthy || false,
                awsPublicIp: process.env.AWS_ISAAC_SIM_IP || 'localhost',
                webrtcAccessible: healthData.webrtc_accessible || false,
                activeSessions: this.awsBridge.getActiveSessions().length,
                lastChecked: new Date(),
                details: healthData
            };
        }
        catch (error) {
            console.error('Failed to check Isaac Sim health:', error);
            return {
                healthy: false,
                awsPublicIp: process.env.AWS_ISAAC_SIM_IP || 'localhost',
                webrtcAccessible: false,
                activeSessions: 0,
                lastChecked: new Date(),
                details: { error: error.message }
            };
        }
    }
    async getIsaacSimWebRTCUrl(sessionId, context) {
        try {
            // Validate user authentication
            if (!context.user) {
                throw new Error('Authentication required');
            }
            // Get WebRTC URL for session
            const webrtcUrl = this.awsBridge.getWebrtcUrl(sessionId);
            if (!webrtcUrl) {
                throw new Error('Session not found or WebRTC URL not available');
            }
            return webrtcUrl;
        }
        catch (error) {
            console.error('Failed to get Isaac Sim WebRTC URL:', error);
            throw new Error(`WebRTC URL retrieval failed: ${error.message}`);
        }
    }
};
exports.IsaacSimResolver = IsaacSimResolver;
__decorate([
    (0, type_graphql_1.Mutation)(() => isaacSim_1.IsaacSimSession),
    __param(0, (0, type_graphql_1.Arg)('robotConfig')),
    __param(1, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [isaacSim_1.IsaacSimSessionInput, Object]),
    __metadata("design:returntype", Promise)
], IsaacSimResolver.prototype, "createIsaacSimSession", null);
__decorate([
    (0, type_graphql_1.Mutation)(() => Boolean),
    __param(0, (0, type_graphql_1.Arg)('sessionId')),
    __param(1, (0, type_graphql_1.Arg)('jointStates', () => [String])),
    __param(2, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Array, Object]),
    __metadata("design:returntype", Promise)
], IsaacSimResolver.prototype, "updateIsaacSimJoints", null);
__decorate([
    (0, type_graphql_1.Mutation)(() => Boolean),
    __param(0, (0, type_graphql_1.Arg)('sessionId')),
    __param(1, (0, type_graphql_1.Arg)('cameraConfig')),
    __param(2, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], IsaacSimResolver.prototype, "updateIsaacSimCamera", null);
__decorate([
    (0, type_graphql_1.Query)(() => isaacSim_1.IsaacSimSession),
    __param(0, (0, type_graphql_1.Arg)('sessionId')),
    __param(1, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], IsaacSimResolver.prototype, "getIsaacSimSession", null);
__decorate([
    (0, type_graphql_1.Query)(() => [isaacSim_1.IsaacSimSession]),
    __param(0, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], IsaacSimResolver.prototype, "getIsaacSimSessions", null);
__decorate([
    (0, type_graphql_1.Mutation)(() => Boolean),
    __param(0, (0, type_graphql_1.Arg)('sessionId')),
    __param(1, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], IsaacSimResolver.prototype, "destroyIsaacSimSession", null);
__decorate([
    (0, type_graphql_1.Query)(() => isaacSim_1.IsaacSimHealthStatus),
    __param(0, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], IsaacSimResolver.prototype, "getIsaacSimHealth", null);
__decorate([
    (0, type_graphql_1.Query)(() => String),
    __param(0, (0, type_graphql_1.Arg)('sessionId')),
    __param(1, (0, type_graphql_1.Ctx)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], IsaacSimResolver.prototype, "getIsaacSimWebRTCUrl", null);
exports.IsaacSimResolver = IsaacSimResolver = __decorate([
    (0, type_graphql_1.Resolver)(),
    __metadata("design:paramtypes", [])
], IsaacSimResolver);
