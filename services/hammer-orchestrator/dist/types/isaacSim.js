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
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsaacSimJointState = exports.IsaacSimCameraConfig = exports.IsaacSimHealthStatus = exports.IsaacSimSessionInput = exports.IsaacSimSession = void 0;
const type_graphql_1 = require("type-graphql");
const scalars_1 = require("./scalars");
let IsaacSimSession = class IsaacSimSession {
};
exports.IsaacSimSession = IsaacSimSession;
__decorate([
    (0, type_graphql_1.Field)(),
    __metadata("design:type", String)
], IsaacSimSession.prototype, "sessionId", void 0);
__decorate([
    (0, type_graphql_1.Field)(),
    __metadata("design:type", String)
], IsaacSimSession.prototype, "userId", void 0);
__decorate([
    (0, type_graphql_1.Field)(),
    __metadata("design:type", String)
], IsaacSimSession.prototype, "robotName", void 0);
__decorate([
    (0, type_graphql_1.Field)(),
    __metadata("design:type", String)
], IsaacSimSession.prototype, "webrtcUrl", void 0);
__decorate([
    (0, type_graphql_1.Field)(),
    __metadata("design:type", String)
], IsaacSimSession.prototype, "status", void 0);
__decorate([
    (0, type_graphql_1.Field)(() => scalars_1.DateScalar),
    __metadata("design:type", Date)
], IsaacSimSession.prototype, "createdAt", void 0);
__decorate([
    (0, type_graphql_1.Field)(),
    __metadata("design:type", Boolean)
], IsaacSimSession.prototype, "robotLoaded", void 0);
__decorate([
    (0, type_graphql_1.Field)(),
    __metadata("design:type", String)
], IsaacSimSession.prototype, "awsPublicIp", void 0);
exports.IsaacSimSession = IsaacSimSession = __decorate([
    (0, type_graphql_1.ObjectType)()
], IsaacSimSession);
let IsaacSimSessionInput = class IsaacSimSessionInput {
};
exports.IsaacSimSessionInput = IsaacSimSessionInput;
__decorate([
    (0, type_graphql_1.Field)(),
    __metadata("design:type", String)
], IsaacSimSessionInput.prototype, "name", void 0);
__decorate([
    (0, type_graphql_1.Field)({ nullable: true }),
    __metadata("design:type", String)
], IsaacSimSessionInput.prototype, "urdfPath", void 0);
__decorate([
    (0, type_graphql_1.Field)(() => [String], { nullable: true }),
    __metadata("design:type", Array)
], IsaacSimSessionInput.prototype, "meshes", void 0);
__decorate([
    (0, type_graphql_1.Field)(() => [String], { nullable: true }),
    __metadata("design:type", Array)
], IsaacSimSessionInput.prototype, "textures", void 0);
__decorate([
    (0, type_graphql_1.Field)({ nullable: true }),
    __metadata("design:type", String)
], IsaacSimSessionInput.prototype, "isaacSimConfig", void 0);
__decorate([
    (0, type_graphql_1.Field)({ nullable: true }),
    __metadata("design:type", String)
], IsaacSimSessionInput.prototype, "environment", void 0);
__decorate([
    (0, type_graphql_1.Field)({ nullable: true }),
    __metadata("design:type", String)
], IsaacSimSessionInput.prototype, "qualityProfile", void 0);
exports.IsaacSimSessionInput = IsaacSimSessionInput = __decorate([
    (0, type_graphql_1.InputType)()
], IsaacSimSessionInput);
let IsaacSimHealthStatus = class IsaacSimHealthStatus {
};
exports.IsaacSimHealthStatus = IsaacSimHealthStatus;
__decorate([
    (0, type_graphql_1.Field)(),
    __metadata("design:type", Boolean)
], IsaacSimHealthStatus.prototype, "healthy", void 0);
__decorate([
    (0, type_graphql_1.Field)(),
    __metadata("design:type", String)
], IsaacSimHealthStatus.prototype, "awsPublicIp", void 0);
__decorate([
    (0, type_graphql_1.Field)(),
    __metadata("design:type", Boolean)
], IsaacSimHealthStatus.prototype, "webrtcAccessible", void 0);
__decorate([
    (0, type_graphql_1.Field)(() => type_graphql_1.Int),
    __metadata("design:type", Number)
], IsaacSimHealthStatus.prototype, "activeSessions", void 0);
__decorate([
    (0, type_graphql_1.Field)(() => scalars_1.DateScalar),
    __metadata("design:type", Date)
], IsaacSimHealthStatus.prototype, "lastChecked", void 0);
__decorate([
    (0, type_graphql_1.Field)({ nullable: true }),
    __metadata("design:type", String)
], IsaacSimHealthStatus.prototype, "details", void 0);
exports.IsaacSimHealthStatus = IsaacSimHealthStatus = __decorate([
    (0, type_graphql_1.ObjectType)()
], IsaacSimHealthStatus);
let IsaacSimCameraConfig = class IsaacSimCameraConfig {
};
exports.IsaacSimCameraConfig = IsaacSimCameraConfig;
__decorate([
    (0, type_graphql_1.Field)(() => [Number]),
    __metadata("design:type", Array)
], IsaacSimCameraConfig.prototype, "position", void 0);
__decorate([
    (0, type_graphql_1.Field)(() => [Number]),
    __metadata("design:type", Array)
], IsaacSimCameraConfig.prototype, "target", void 0);
__decorate([
    (0, type_graphql_1.Field)(),
    __metadata("design:type", Number)
], IsaacSimCameraConfig.prototype, "fov", void 0);
__decorate([
    (0, type_graphql_1.Field)({ nullable: true }),
    __metadata("design:type", Number)
], IsaacSimCameraConfig.prototype, "nearClip", void 0);
__decorate([
    (0, type_graphql_1.Field)({ nullable: true }),
    __metadata("design:type", Number)
], IsaacSimCameraConfig.prototype, "farClip", void 0);
exports.IsaacSimCameraConfig = IsaacSimCameraConfig = __decorate([
    (0, type_graphql_1.InputType)()
], IsaacSimCameraConfig);
let IsaacSimJointState = class IsaacSimJointState {
};
exports.IsaacSimJointState = IsaacSimJointState;
__decorate([
    (0, type_graphql_1.Field)(),
    __metadata("design:type", String)
], IsaacSimJointState.prototype, "jointName", void 0);
__decorate([
    (0, type_graphql_1.Field)(),
    __metadata("design:type", Number)
], IsaacSimJointState.prototype, "value", void 0);
exports.IsaacSimJointState = IsaacSimJointState = __decorate([
    (0, type_graphql_1.InputType)()
], IsaacSimJointState);
