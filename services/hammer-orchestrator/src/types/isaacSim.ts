import { ObjectType, Field, InputType, Int } from 'type-graphql';
import { DateScalar } from './scalars';

@ObjectType()
export class IsaacSimSession {
  @Field()
  sessionId: string;

  @Field()
  userId: string;

  @Field()
  robotName: string;

  @Field()
  webrtcUrl: string;

  @Field()
  status: string;

  @Field(() => DateScalar)
  createdAt: Date;

  @Field()
  robotLoaded: boolean;

  @Field()
  awsPublicIp: string;
}

@InputType()
export class IsaacSimSessionInput {
  @Field()
  name: string;

  @Field({ nullable: true })
  urdfPath?: string;

  @Field(() => [String], { nullable: true })
  meshes?: string[];

  @Field(() => [String], { nullable: true })
  textures?: string[];

  @Field({ nullable: true })
  isaacSimConfig?: string; // JSON string

  @Field({ nullable: true })
  environment?: string;

  @Field({ nullable: true })
  qualityProfile?: string;
}

@ObjectType()
export class IsaacSimHealthStatus {
  @Field()
  healthy: boolean;

  @Field()
  awsPublicIp: string;

  @Field()
  webrtcAccessible: boolean;

  @Field(() => Int)
  activeSessions: number;

  @Field(() => DateScalar)
  lastChecked: Date;

  @Field({ nullable: true })
  details?: string; // JSON string
}

@InputType()
export class IsaacSimCameraConfig {
  @Field(() => [Number])
  position: number[]; // [x, y, z]

  @Field(() => [Number])
  target: number[]; // [x, y, z]

  @Field()
  fov: number;

  @Field({ nullable: true })
  nearClip?: number;

  @Field({ nullable: true })
  farClip?: number;
}

@InputType()
export class IsaacSimJointState {
  @Field()
  jointName: string;

  @Field()
  value: number;
}





