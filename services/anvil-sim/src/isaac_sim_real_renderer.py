#!/usr/bin/env python3
"""
Real Isaac Sim Renderer - Uses actual Isaac Sim
Provides photorealistic 3D robot simulation with advanced lighting and materials.
"""

import asyncio
import logging
import time
from typing import Dict, Any, Optional, Tuple
import numpy as np
import sys
import os

# Add Isaac Sim to Python path - use environment variable or default path
isaac_sim_base = os.getenv("ISAAC_SIM_BASE", "/home/shadeform/isaac-sim/isaac-sim-2023.1.1")
if os.path.exists(isaac_sim_base):
    sys.path.insert(0, isaac_sim_base)
else:
    # Try Docker container path
    docker_path = "/isaac-sim"
    if os.path.exists(docker_path):
        isaac_sim_base = docker_path
        sys.path.insert(0, isaac_sim_base)

# Also add the Isaac Sim extensions and modules from the correct location
sys.path.insert(0, os.path.join(isaac_sim_base, "kit", "exts"))
sys.path.insert(0, os.path.join(isaac_sim_base, "kit", "extscore"))
sys.path.insert(0, os.path.join(isaac_sim_base, "kit", "kernel"))
sys.path.insert(0, os.path.join(isaac_sim_base, "exts"))

# Isaac Sim imports
try:
    from omni.isaac.kit import SimulationApp
    from omni.isaac.core import World, SimulationContext
    from omni.isaac.core.robots import Robot
    from omni.isaac.core.utils.extensions import enable_extension
    from omni.isaac.core.utils.stage import create_new_stage
    from omni.isaac.sensor import Camera
    try:
        from omni.isaac.core.utils.prims import create_prim
        CREATE_PRIM_AVAILABLE = True
    except ImportError:
        CREATE_PRIM_AVAILABLE = False
        print("⚠️  create_prim not available, scene setup will be limited")
    from omni.isaac.core.materials import PhysicsMaterial
    ISAAC_SIM_AVAILABLE = True
    print("✅ Isaac Sim modules loaded successfully")
except ImportError as e:
    ISAAC_SIM_AVAILABLE = False
    CREATE_PRIM_AVAILABLE = False
    print(f"⚠️  Isaac Sim modules not available: {e}")
    print("   This is expected if Isaac Sim is not installed or not in PATH")

import structlog

logger = structlog.get_logger(__name__)

class IsaacSimRealRenderer:
    """Real Isaac Sim renderer with photorealistic 3D simulation."""
    
    # Class variable to track if SimulationApp has been initialized
    _app_initialized = False
    
    def __init__(self, width: int = 1920, height: int = 1080, max_fps: int = 30):
        self.width = width
        self.height = height
        self.max_fps = max_fps
        self.frame_count = 0
        self._last_frame_time = 0.0
        self._min_frame_interval = 1.0 / max_fps if max_fps > 0 else 0.0
        
        # Isaac Sim components
        self.app = None
        self.world = None
        self.camera = None
        self.robot = None
        self.scene_initialized = False
        
        # Current state
        self.camera_state = {
            'position': [2.0, 2.0, 1.5],  # Default camera position looking at robot
            'target': [0.0, 0.0, 0.3],    # Default target (robot base height)
            'fov': 60.0
        }
        
        self.joint_states = {
            'joint1': 0.0,
            'joint2': 0.0
        }
        
        self.robot_config = {
            'name': 'TurtleBot3',
            'isaac_sim_path': '/Isaac/Robots/TurtleBot3/turtlebot3.usd',
            'specifications': {}
        }
        
        self.robot_loaded = False
        
        # Try to initialize Isaac Sim
        try:
            self._initialize_isaac_sim()
        except Exception as e:
            logger.warning(f"Isaac Sim initialization failed, falling back to mock rendering: {e}")
            import traceback
            logger.error(f"Initialization traceback: {traceback.format_exc()}")
            self.scene_initialized = False
    
    def _initialize_isaac_sim(self):
        """Initialize Isaac Sim application and world."""
        if not ISAAC_SIM_AVAILABLE:
            logger.warning("Isaac Sim modules not available")
            self.scene_initialized = False
            return
            
        # Prevent multiple SimulationApp instances
        if IsaacSimRealRenderer._app_initialized:
            logger.warning("SimulationApp already initialized, reusing existing instance")
            return
            
        try:
            # Configure Isaac Sim for headless rendering with explicit rendering enabled
            config = {
                "headless": True,
                "width": self.width,
                "height": self.height,
                "renderer": "RayTracedLighting",  # Photorealistic rendering
                "livesync": False,  # Disable live sync for headless
            }
            
            self.app = SimulationApp(config)
            IsaacSimRealRenderer._app_initialized = True
            logger.info("🎬 Real Isaac Sim application initialized", config=config)
            
            # Enable required extensions
            enable_extension("omni.isaac.core")
            enable_extension("omni.isaac.sensor")
            logger.info("✅ Isaac Sim extensions enabled")
            
            # Create new stage
            create_new_stage()
            logger.info("✅ New USD stage created")
            
            # Initialize world with physics
            self.world = World(stage_units_in_meters=1.0)
            logger.info("🌍 Real Isaac Sim world created")
            
            # Setup scene (ground, lighting)
            self._setup_scene()
            
            # Load default robot (TurtleBot3) after scene setup
            self._load_default_robot()
            
            # Setup camera after robot is loaded
            self._setup_default_camera()
            
            # Run initial simulation steps to stabilize
            for _ in range(10):
                self.world.step(render=False)
                self.app.update()
            logger.info("✅ Initial simulation steps completed")
            
            self.scene_initialized = True
            logger.info("✅ Real Isaac Sim scene initialized successfully")
            
        except Exception as e:
            logger.error("❌ Failed to initialize real Isaac Sim", error=str(e))
            import traceback
            logger.error(f"Initialization traceback: {traceback.format_exc()}")
            self.scene_initialized = False
            if self.app:
                try:
                    self.app.close()
                except:
                    pass
                self.app = None
            IsaacSimRealRenderer._app_initialized = False
    
    def _setup_scene(self):
        """Setup the Isaac Sim scene with lighting, environment, and materials."""
        try:
            # Ensure stage exists
            from pxr import Usd, UsdGeom
            stage = Usd.Stage.GetCurrent()
            if not stage:
                logger.error("❌ No USD stage available for scene setup")
                return
            
            # Setup environment lighting
            self._setup_lighting()
            
            # Setup ground plane
            self._setup_ground()
            
            logger.info("🏗️ Real Isaac Sim scene setup completed")
            
        except Exception as e:
            logger.error("❌ Failed to setup Isaac Sim scene", error=str(e))
            import traceback
            logger.error(f"Scene setup traceback: {traceback.format_exc()}")
    
    def _setup_lighting(self):
        """Setup advanced lighting for photorealistic rendering."""
        if not CREATE_PRIM_AVAILABLE:
            logger.warning("⚠️ Skipping lighting setup - create_prim not available")
            # Try alternative method using pxr
            try:
                from pxr import UsdLux
                stage = Usd.Stage.GetCurrent()
                if stage:
                    dome_light = UsdLux.DomeLight.Define(stage, "/World/DomeLight")
                    dome_light.GetIntensityAttr().Set(1000.0)
                    dome_light.GetColorAttr().Set((1.0, 1.0, 1.0))
                    logger.info("💡 Real Isaac Sim lighting setup completed (pxr method)")
            except Exception as e2:
                logger.error("❌ Failed to setup lighting with pxr method", error=str(e2))
            return

        try:
            # Create dome light for environment lighting
            dome_light = create_prim(
                "/World/DomeLight",
                "DomeLight",
                position=[0, 0, 0],
                orientation=[0, 0, 0, 1]
            )

            # Configure dome light with higher intensity for headless rendering
            dome_light.GetAttribute("intensity").Set(1000.0)
            dome_light.GetAttribute("color").Set((1.0, 1.0, 1.0))

            logger.info("💡 Real Isaac Sim lighting setup completed")

        except Exception as e:
            logger.error("❌ Failed to setup lighting", error=str(e))
            import traceback
            logger.error(f"Lighting setup traceback: {traceback.format_exc()}")
    
    def _setup_ground(self):
        """Setup ground plane with realistic materials."""
        if not CREATE_PRIM_AVAILABLE:
            logger.warning("⚠️ Skipping ground setup - create_prim not available")
            # Try alternative method using pxr
            try:
                from pxr import UsdGeom
                stage = Usd.Stage.GetCurrent()
                if stage:
                    ground = UsdGeom.Xform.Define(stage, "/World/Ground")
                    plane = UsdGeom.Plane.Define(stage, "/World/Ground/Plane")
                    plane.GetSizeAttr().Set(10.0)
                    logger.info("🏞️ Real Isaac Sim ground plane setup completed (pxr method)")
            except Exception as e2:
                logger.error("❌ Failed to setup ground with pxr method", error=str(e2))
            return

        try:
            # Create ground plane
            ground = create_prim(
                "/World/Ground",
                "Xform",
                position=[0, 0, 0],
                scale=[10, 10, 1]
            )

            # Add ground mesh
            ground_mesh = create_prim(
                "/World/Ground/Mesh",
                "Plane",
                position=[0, 0, 0],
                scale=[10, 10, 1]
            )

            logger.info("🏞️ Real Isaac Sim ground plane setup completed")

        except Exception as e:
            logger.error("❌ Failed to setup ground", error=str(e))
            import traceback
            logger.error(f"Ground setup traceback: {traceback.format_exc()}")
    
    def _load_default_robot(self):
        """Load default robot (TurtleBot3) during initialization."""
        if not self.scene_initialized or not self.world:
            logger.warning("Cannot load default robot - scene not initialized")
            return False
        
        try:
            robot_path = self.robot_config.get('isaac_sim_path')
            robot_name = self.robot_config.get('name', 'TurtleBot3')
            
            if not robot_path:
                logger.warning("No robot path configured for default robot")
                return False
            
            # Try to load robot
            try:
                self.robot = self.world.scene.add(
                    Robot(
                        prim_path=f"/World/{robot_name}",
                        name=robot_name,
                        usd_path=robot_path
                    )
                )
                self.robot_loaded = True
                logger.info("🤖 Default robot loaded successfully", 
                           robot_name=robot_name, 
                           robot_path=robot_path)
                
                # Step world a few times to let robot settle
                for _ in range(5):
                    self.world.step(render=False)
                    self.app.update()
                    
                return True
            except Exception as load_error:
                logger.warning(f"Failed to load robot from {robot_path}: {load_error}")
                logger.info("Continuing without robot - camera will show empty scene")
                return False
                
        except Exception as e:
            logger.error("❌ Failed to load default robot", error=str(e))
            import traceback
            logger.error(f"Robot loading traceback: {traceback.format_exc()}")
            return False
    
    def _setup_default_camera(self):
        """Setup default camera after robot is loaded."""
        if not self.scene_initialized:
            logger.warning("Cannot setup default camera - scene not initialized")
            return False
        
        try:
            # Get default camera position/target/FOV from state
            position = self.camera_state['position']
            target = self.camera_state['target']
            fov = self.camera_state['fov']
            
            # Create camera
            self.camera = Camera(
                prim_path="/World/Camera",
                position=position,
                look_at=target,
                fov=fov,
                resolution=(self.width, self.height)
            )
            
            # Configure camera settings
            self.camera.set_resolution((self.width, self.height))
            self.camera.set_fov(fov)
            
            logger.info("📹 Default camera setup completed", 
                       position=position, 
                       target=target, 
                       fov=fov)
            
            # Step world to ensure camera is ready
            for _ in range(3):
                self.world.step(render=False)
                self.app.update()
            
            return True
            
        except Exception as e:
            logger.error("❌ Failed to setup default camera", error=str(e))
            import traceback
            logger.error(f"Camera setup traceback: {traceback.format_exc()}")
            return False
    
    async def load_robot(self, robot_config: Dict[str, Any]):
        """Load actual Isaac Sim robot model."""
        if not self.scene_initialized:
            logger.warning("Isaac Sim scene not initialized - cannot load robot")
            return False
        
        try:
            robot_name = robot_config.get('name', 'Default Robot')
            robot_path = robot_config.get('isaac_sim_path')
            
            if not robot_path:
                logger.warning("No Isaac Sim path provided for robot", robot_name=robot_name)
                return False
            
            # Remove existing robot if any
            if self.robot:
                self.world.scene.remove_object(self.robot)
            
            # Load robot from Isaac Sim assets
            self.robot = self.world.scene.add(
                Robot(
                    prim_path=f"/World/{robot_name}",
                    name=robot_name,
                    usd_path=robot_path
                )
            )
            
            self.robot_config.update(robot_config)
            logger.info("🤖 Real robot loaded successfully", 
                       robot_name=robot_name, 
                       robot_path=robot_path)
            
            return True
            
        except Exception as e:
            logger.error("❌ Failed to load real robot", 
                        robot_name=robot_config.get('name'),
                        error=str(e))
            return False
    
    async def setup_camera(self, position: list, target: list, fov: float):
        """Setup Isaac Sim camera with advanced rendering."""
        if not self.scene_initialized:
            logger.warning("Isaac Sim scene not initialized - cannot setup camera")
            return False
        
        try:
            # Remove existing camera if any
            if self.camera:
                self.world.scene.remove_object(self.camera)
            
            # Create camera
            self.camera = Camera(
                prim_path="/World/Camera",
                position=position,
                look_at=target,
                fov=fov,
                resolution=(self.width, self.height)
            )
            
            # Configure camera settings
            self.camera.set_resolution((self.width, self.height))
            self.camera.set_fov(fov)
            
            self.camera_state.update({
                'position': position,
                'target': target,
                'fov': fov
            })
            
            logger.info("📹 Real Isaac Sim camera setup completed", 
                       position=position, 
                       target=target, 
                       fov=fov)
            
            return True
            
        except Exception as e:
            logger.error("❌ Failed to setup real camera", error=str(e))
            return False
    
    async def update_joints(self, joint_states: Dict[str, float]):
        """Update robot joint states."""
        if not self.robot:
            logger.warning("No robot loaded - cannot update joints")
            return
        
        try:
            # Update joint states
            self.joint_states.update(joint_states)
            
            # Apply to robot articulation
            articulation = self.robot.get_articulation()
            joint_names = articulation.get_joint_names()
            
            for joint_name, angle in joint_states.items():
                if joint_name in joint_names:
                    articulation.set_joint_positions({joint_name: angle})
            
            logger.debug("🔧 Real joint states updated", joint_states=joint_states)
            
        except Exception as e:
            logger.error("❌ Failed to update real joints", error=str(e))
    
    async def render_frame(self) -> np.ndarray:
        """Render a photorealistic frame from Isaac Sim."""
        if not self.scene_initialized or not self.camera:
            logger.warning("Isaac Sim not ready - returning black frame",
                          scene_initialized=self.scene_initialized,
                          camera_exists=self.camera is not None)
            return np.zeros((self.height, self.width, 3), dtype=np.uint8)
        
        try:
            # Frame rate throttling - ensure we don't exceed max_fps
            import time
            current_time = time.time()
            time_since_last_frame = current_time - self._last_frame_time
            
            if self._min_frame_interval > 0 and time_since_last_frame < self._min_frame_interval:
                # Sleep to maintain frame rate (only if throttling enabled)
                await asyncio.sleep(self._min_frame_interval - time_since_last_frame)
                current_time = time.time()
            
            self._last_frame_time = current_time
            
            # Step simulation synchronously and update app for rendering
            self.world.step(render=True)
            self.app.update()
            
            # Capture frame from camera
            frame_data = self.camera.get_rgba()
            
            if frame_data is not None and frame_data.size > 0:
                # Validate frame data - check if it's not all black
                frame_mean = np.mean(frame_data)
                frame_max = np.max(frame_data)
                
                # Convert to BGR format for OpenCV compatibility
                # Frame data is RGBA float [0-1], convert to BGR uint8 [0-255]
                frame_rgb = frame_data[:, :, :3]  # Remove alpha channel
                frame_bgr = frame_rgb[:, :, ::-1]  # RGB to BGR
                frame_bgr = (frame_bgr * 255).astype(np.uint8)
                
                self.frame_count += 1
                
                # Log every 60 frames (once per second at 60 FPS)
                if self.frame_count % 60 == 0:
                    logger.info("🎬 Real Isaac Sim frame rendered", 
                               frame_count=self.frame_count,
                               robot_name=self.robot_config.get('name'),
                               frame_mean=frame_mean,
                               frame_max=frame_max,
                               frame_shape=frame_bgr.shape)
                
                return frame_bgr
            else:
                logger.warning("No frame data from real Isaac Sim camera or empty frame")
                return np.zeros((self.height, self.width, 3), dtype=np.uint8)
                
        except Exception as e:
            logger.error("❌ Failed to render real Isaac Sim frame", error=str(e))
            import traceback
            logger.error(f"Frame rendering traceback: {traceback.format_exc()}")
            return np.zeros((self.height, self.width, 3), dtype=np.uint8)
    
    def update_camera(self, position: list, target: list, fov: float):
        """Update camera parameters."""
        if not self.scene_initialized:
            logger.warning("Cannot update camera - scene not initialized")
            return False
        
        try:
            # Update camera state
            self.camera_state.update({
                'position': position,
                'target': target,
                'fov': fov
            })
            
            # Update camera if it exists
            if self.camera:
                try:
                    self.camera.set_position(position)
                    self.camera.set_look_at(target)
                    self.camera.set_fov(fov)
                    logger.info("📹 Real camera updated", position=position, target=target, fov=fov)
                    return True
                except Exception as e:
                    logger.error("Failed to update camera parameters", error=str(e))
                    # Try recreating camera if update fails
                    try:
                        self.camera = Camera(
                            prim_path="/World/Camera",
                            position=position,
                            look_at=target,
                            fov=fov,
                            resolution=(self.width, self.height)
                        )
                        logger.info("📹 Camera recreated with new parameters")
                        return True
                    except Exception as e2:
                        logger.error("Failed to recreate camera", error=str(e2))
                        return False
            else:
                # Create camera if it doesn't exist
                try:
                    self.camera = Camera(
                        prim_path="/World/Camera",
                        position=position,
                        look_at=target,
                        fov=fov,
                        resolution=(self.width, self.height)
                    )
                    logger.info("📹 Camera created with new parameters")
                    return True
                except Exception as e:
                    logger.error("Failed to create camera", error=str(e))
                    return False
                    
        except Exception as e:
            logger.error("❌ Failed to update camera", error=str(e))
            import traceback
            logger.error(f"Camera update traceback: {traceback.format_exc()}")
            return False
    
    def update_robot_config(self, robot_config: Dict[str, Any]):
        """Update robot configuration."""
        self.robot_config.update(robot_config)
        logger.info("🤖 Real robot configuration updated", 
                   robot_name=robot_config.get('name', 'Unknown'),
                   isaac_sim_path=robot_config.get('isaac_sim_path'))
    
    def cleanup(self):
        """Cleanup Isaac Sim resources."""
        try:
            if self.app:
                self.app.close()
                logger.info("🧹 Real Isaac Sim application closed")
        except Exception as e:
            logger.error("❌ Failed to cleanup real Isaac Sim", error=str(e))

# Global renderer instance
isaac_sim_real_renderer = IsaacSimRealRenderer()

def get_isaac_sim_real_renderer() -> IsaacSimRealRenderer:
    """Get the global real Isaac Sim renderer instance."""
    return isaac_sim_real_renderer