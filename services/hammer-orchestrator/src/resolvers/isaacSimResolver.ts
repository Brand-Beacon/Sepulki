import { Resolver, Mutation, Query, Arg, Ctx } from 'type-graphql';
import { IsaacSimSession, IsaacSimSessionInput, IsaacSimHealthStatus } from '../types/isaacSim';
import { Context } from '../context';
import { IsaacSimAwsBridge } from '../../anvil-sim/src/isaac_sim_aws_bridge';

@Resolver()
export class IsaacSimResolver {
  private awsBridge: IsaacSimAwsBridge;

  constructor() {
    // Initialize AWS bridge with environment variable
    const awsPublicIp = process.env.AWS_ISAAC_SIM_IP || 'localhost';
    this.awsBridge = new IsaacSimAwsBridge(awsPublicIp);
  }

  @Mutation(() => IsaacSimSession)
  async createIsaacSimSession(
    @Arg('robotConfig') robotConfig: IsaacSimSessionInput,
    @Ctx() context: Context
  ): Promise<IsaacSimSession> {
    try {
      console.log('Creating Isaac Sim session for user:', context.user?.id);
      
      // Validate user authentication
      if (!context.user) {
        throw new Error('Authentication required');
      }

      // Create session on AWS Isaac Sim
      const sessionData = await this.awsBridge.createSession(
        robotConfig,
        context.user.id
      );

      if (sessionData.status !== 'ready') {
        throw new Error(`Failed to create Isaac Sim session: ${sessionData.error || 'Unknown error'}`);
      }

      // Load robot into the session
      const loadResult = await this.awsBridge.loadRobot(
        sessionData.session_id,
        robotConfig
      );

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

    } catch (error) {
      console.error('Failed to create Isaac Sim session:', error);
      throw new Error(`Isaac Sim session creation failed: ${error.message}`);
    }
  }

  @Mutation(() => Boolean)
  async updateIsaacSimJoints(
    @Arg('sessionId') sessionId: string,
    @Arg('jointStates', () => [String]) jointStates: string[],
    @Ctx() context: Context
  ): Promise<boolean> {
    try {
      // Validate user authentication
      if (!context.user) {
        throw new Error('Authentication required');
      }

      // Parse joint states (assuming format: "jointName:value")
      const jointStatesDict: Record<string, number> = {};
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

    } catch (error) {
      console.error('Failed to update Isaac Sim joints:', error);
      throw new Error(`Joint update failed: ${error.message}`);
    }
  }

  @Mutation(() => Boolean)
  async updateIsaacSimCamera(
    @Arg('sessionId') sessionId: string,
    @Arg('cameraConfig') cameraConfig: any,
    @Ctx() context: Context
  ): Promise<boolean> {
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

    } catch (error) {
      console.error('Failed to update Isaac Sim camera:', error);
      throw new Error(`Camera update failed: ${error.message}`);
    }
  }

  @Query(() => IsaacSimSession)
  async getIsaacSimSession(
    @Arg('sessionId') sessionId: string,
    @Ctx() context: Context
  ): Promise<IsaacSimSession> {
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

    } catch (error) {
      console.error('Failed to get Isaac Sim session:', error);
      throw new Error(`Session retrieval failed: ${error.message}`);
    }
  }

  @Query(() => [IsaacSimSession])
  async getIsaacSimSessions(
    @Ctx() context: Context
  ): Promise<IsaacSimSession[]> {
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

    } catch (error) {
      console.error('Failed to get Isaac Sim sessions:', error);
      throw new Error(`Sessions retrieval failed: ${error.message}`);
    }
  }

  @Mutation(() => Boolean)
  async destroyIsaacSimSession(
    @Arg('sessionId') sessionId: string,
    @Ctx() context: Context
  ): Promise<boolean> {
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

    } catch (error) {
      console.error('Failed to destroy Isaac Sim session:', error);
      throw new Error(`Session destruction failed: ${error.message}`);
    }
  }

  @Query(() => IsaacSimHealthStatus)
  async getIsaacSimHealth(
    @Ctx() context: Context
  ): Promise<IsaacSimHealthStatus> {
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

    } catch (error) {
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

  @Query(() => String)
  async getIsaacSimWebRTCUrl(
    @Arg('sessionId') sessionId: string,
    @Ctx() context: Context
  ): Promise<string> {
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

    } catch (error) {
      console.error('Failed to get Isaac Sim WebRTC URL:', error);
      throw new Error(`WebRTC URL retrieval failed: ${error.message}`);
    }
  }
}





