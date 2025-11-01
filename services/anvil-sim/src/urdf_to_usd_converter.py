#!/usr/bin/env python3
"""
URDF to USD Converter for Isaac Sim
Converts robot URDF files to USD format for loading into Isaac Sim
"""

import os
import sys
import logging
from pathlib import Path
from typing import Optional, Dict, Any, List
import tempfile
import shutil

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class UrdfToUsdConverter:
    """Converts URDF robot models to USD format for Isaac Sim."""
    
    def __init__(self, isaac_sim_available: bool = False):
        """
        Initialize the converter.
        
        Args:
            isaac_sim_available: Whether Isaac Sim modules are available
        """
        self.isaac_sim_available = isaac_sim_available
        self.temp_dir = None
        
        if isaac_sim_available:
            self._setup_isaac_sim_imports()
        else:
            logger.warning("Isaac Sim not available - using mock conversion")
    
    def _setup_isaac_sim_imports(self):
        """Setup Isaac Sim imports when available."""
        try:
            from pxr import Usd, UsdGeom, UsdPhysics
            from omni.isaac.urdf import _urdf
            from omni.isaac.core.utils.stage import create_new_stage
            
            self.Usd = Usd
            self.UsdGeom = UsdGeom
            self.UsdPhysics = UsdPhysics
            self._urdf = _urdf
            self.create_new_stage = create_new_stage
            
            logger.info("Isaac Sim imports successful")
            
        except ImportError as e:
            logger.error(f"Failed to import Isaac Sim modules: {e}")
            self.isaac_sim_available = False
    
    def convert(self, urdf_path: str, output_usd_path: str, 
                robot_name: str = "robot", 
                config: Optional[Dict[str, Any]] = None) -> str:
        """
        Convert URDF to USD format for Isaac Sim.
        
        Args:
            urdf_path: Path to URDF file
            output_usd_path: Path for output USD file
            robot_name: Name for the robot in USD
            config: Conversion configuration options
            
        Returns:
            Path to the converted USD file
        """
        logger.info(f"Converting URDF to USD: {urdf_path} -> {output_usd_path}")
        
        # Validate inputs
        if not os.path.exists(urdf_path):
            raise FileNotFoundError(f"URDF file not found: {urdf_path}")
        
        # Create output directory if it doesn't exist
        os.makedirs(os.path.dirname(output_usd_path), exist_ok=True)
        
        if self.isaac_sim_available:
            return self._convert_with_isaac_sim(urdf_path, output_usd_path, robot_name, config)
        else:
            return self._convert_mock(urdf_path, output_usd_path, robot_name, config)
    
    def _convert_with_isaac_sim(self, urdf_path: str, output_usd_path: str, 
                               robot_name: str, config: Optional[Dict[str, Any]]) -> str:
        """Convert using real Isaac Sim URDF import."""
        try:
            # Default configuration
            default_config = {
                "merge_fixed_joints": False,
                "fix_base": True,
                "import_inertia_tensor": True,
                "self_collision": False,
                "create_physics_scene": True,
                "default_drive_type": "position",
                "default_drive_strength": 1e7,
                "default_position_damping": 1e5
            }
            
            if config:
                default_config.update(config)
            
            # Create import configuration
            import_config = self._urdf.ImportConfig()
            import_config.merge_fixed_joints = default_config["merge_fixed_joints"]
            import_config.fix_base = default_config["fix_base"]
            import_config.import_inertia_tensor = default_config["import_inertia_tensor"]
            import_config.self_collision = default_config["self_collision"]
            import_config.create_physics_scene = default_config["create_physics_scene"]
            import_config.default_drive_type = default_config["default_drive_type"]
            import_config.default_drive_strength = default_config["default_drive_strength"]
            import_config.default_position_damping = default_config["default_position_damping"]
            
            # Create new USD stage
            stage = self.create_new_stage(output_usd_path)
            
            # Import URDF
            status, import_path = self._urdf.acquire_urdf_interface().import_robot(
                urdf_path,
                output_usd_path,
                import_config
            )
            
            if status:
                logger.info(f"URDF import successful: {import_path}")
                
                # Add robot metadata
                self._add_robot_metadata(stage, robot_name, urdf_path)
                
                # Save the stage
                stage.Save()
                
                return output_usd_path
            else:
                raise RuntimeError(f"URDF import failed: {import_path}")
                
        except Exception as e:
            logger.error(f"Isaac Sim URDF conversion failed: {e}")
            raise
    
    def _convert_mock(self, urdf_path: str, output_usd_path: str, 
                     robot_name: str, config: Optional[Dict[str, Any]]) -> str:
        """Create a mock USD file when Isaac Sim is not available."""
        logger.info("Creating mock USD file (Isaac Sim not available)")
        
        # Create a simple USD file with basic robot structure
        usd_content = f'''#usda 1.0
(
    defaultPrim = "{robot_name}"
    doc = "Mock USD file for {robot_name} (Isaac Sim not available)"
    upAxis = "Z"
)

def Xform "{robot_name}" (
    prepend apiSchemas = ["PhysicsRigidBodyAPI", "PhysxRigidBodyAPI"]
)
{{
    def Xform "base_link" (
        prepend apiSchemas = ["PhysicsRigidBodyAPI", "PhysxRigidBodyAPI"]
    )
    {{
        def Cylinder "base_geometry" (
            prepend apiSchemas = ["PhysicsCollisionAPI", "PhysxCollisionAPI"]
        )
        {{
            double3 xformOp:translate = (0, 0, 0.1)
            uniform token[] xformOpOrder = ["xformOp:translate"]
            double radius = 0.1
            double height = 0.2
        }}
    }}
    
    def Xform "joint_1" (
        prepend apiSchemas = ["PhysicsRevoluteJointAPI", "PhysxRevoluteJointAPI"]
    )
    {{
        double3 xformOp:translate = (0, 0, 0.2)
        uniform token[] xformOpOrder = ["xformOp:translate"]
    }}
    
    def Xform "joint_2" (
        prepend apiSchemas = ["PhysicsRevoluteJointAPI", "PhysxRevoluteJointAPI"]
    )
    {{
        double3 xformOp:translate = (0, 0, 0.4)
        uniform token[] xformOpOrder = ["xformOp:translate"]
    }}
}}
'''
        
        # Write the mock USD file
        with open(output_usd_path, 'w') as f:
            f.write(usd_content)
        
        logger.info(f"Mock USD file created: {output_usd_path}")
        return output_usd_path
    
    def _add_robot_metadata(self, stage, robot_name: str, urdf_path: str):
        """Add metadata to the USD stage."""
        try:
            # Get the default prim
            default_prim = stage.GetDefaultPrim()
            if default_prim:
                # Add custom attributes
                default_prim.SetMetadata("comment", f"Robot: {robot_name}")
                default_prim.SetMetadata("urdf_source", urdf_path)
                default_prim.SetMetadata("converter", "sepulki_urdf_to_usd")
                
                logger.info(f"Added metadata for robot: {robot_name}")
        except Exception as e:
            logger.warning(f"Failed to add metadata: {e}")
    
    def validate_usd(self, usd_path: str) -> bool:
        """
        Validate that the generated USD file is correct.
        
        Args:
            usd_path: Path to USD file to validate
            
        Returns:
            True if valid, False otherwise
        """
        if not os.path.exists(usd_path):
            logger.error(f"USD file not found: {usd_path}")
            return False
        
        try:
            if self.isaac_sim_available:
                # Use Isaac Sim to validate
                stage = self.Usd.Stage.Open(usd_path)
                if stage:
                    default_prim = stage.GetDefaultPrim()
                    if default_prim:
                        logger.info("USD file validation successful")
                        return True
                    else:
                        logger.error("USD file has no default prim")
                        return False
                else:
                    logger.error("Failed to open USD stage")
                    return False
            else:
                # Basic file validation
                with open(usd_path, 'r') as f:
                    content = f.read()
                    if '#usda' in content and 'def Xform' in content:
                        logger.info("USD file basic validation successful")
                        return True
                    else:
                        logger.error("USD file content validation failed")
                        return False
                        
        except Exception as e:
            logger.error(f"USD validation failed: {e}")
            return False
    
    def get_robot_info(self, usd_path: str) -> Dict[str, Any]:
        """
        Extract robot information from USD file.
        
        Args:
            usd_path: Path to USD file
            
        Returns:
            Dictionary with robot information
        """
        info = {
            "name": "unknown",
            "joints": [],
            "links": [],
            "materials": [],
            "file_size": 0,
            "created": None
        }
        
        try:
            if os.path.exists(usd_path):
                info["file_size"] = os.path.getsize(usd_path)
                info["created"] = os.path.getctime(usd_path)
            
            if self.isaac_sim_available:
                stage = self.Usd.Stage.Open(usd_path)
                if stage:
                    default_prim = stage.GetDefaultPrim()
                    if default_prim:
                        info["name"] = default_prim.GetName()
                        
                        # Traverse the stage to find joints and links
                        for prim in stage.Traverse():
                            if prim.IsA(self.UsdPhysics.RevoluteJoint):
                                info["joints"].append(prim.GetName())
                            elif prim.IsA(self.UsdGeom.Xform):
                                info["links"].append(prim.GetName())
            
            logger.info(f"Robot info extracted: {info['name']}, {len(info['joints'])} joints, {len(info['links'])} links")
            
        except Exception as e:
            logger.error(f"Failed to extract robot info: {e}")
        
        return info
    
    def cleanup(self):
        """Clean up temporary files."""
        if self.temp_dir and os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir)
            logger.info("Cleaned up temporary files")


def create_converter(isaac_sim_available: bool = False) -> UrdfToUsdConverter:
    """
    Factory function to create a URDF to USD converter.
    
    Args:
        isaac_sim_available: Whether Isaac Sim is available
        
    Returns:
        UrdfToUsdConverter instance
    """
    return UrdfToUsdConverter(isaac_sim_available)


# Example usage
if __name__ == "__main__":
    # Test the converter
    converter = create_converter(isaac_sim_available=False)  # Set to True when Isaac Sim is available
    
    # Example URDF file (you would provide a real one)
    urdf_path = "test_robot.urdf"
    usd_path = "test_robot.usd"
    
    try:
        # Convert URDF to USD
        result_path = converter.convert(urdf_path, usd_path, "test_robot")
        print(f"Conversion successful: {result_path}")
        
        # Validate the result
        if converter.validate_usd(result_path):
            print("USD file validation passed")
        else:
            print("USD file validation failed")
        
        # Get robot info
        info = converter.get_robot_info(result_path)
        print(f"Robot info: {info}")
        
    except Exception as e:
        print(f"Conversion failed: {e}")
    finally:
        converter.cleanup()

