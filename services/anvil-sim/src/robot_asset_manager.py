#!/usr/bin/env python3
"""
Robot Asset Manager for Isaac Sim
Manages robot assets (URDF, meshes, textures) on AWS and converts them for Isaac Sim
"""

import os
import sys
import logging
import hashlib
import json
import shutil
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
import tempfile
import requests
from datetime import datetime

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RobotAssetManager:
    """Manages robot assets for Isaac Sim deployment."""
    
    def __init__(self, aws_public_ip: str, asset_base_path: str = "/assets"):
        """
        Initialize the robot asset manager.
        
        Args:
            aws_public_ip: Public IP of the AWS Isaac Sim instance
            asset_base_path: Base path for storing assets on AWS
        """
        self.aws_public_ip = aws_public_ip
        self.asset_base_path = Path(asset_base_path)
        self.temp_dir = None
        
        # Create asset directories
        self._create_asset_directories()
    
    def _create_asset_directories(self):
        """Create necessary asset directories."""
        directories = [
            "robots",
            "meshes", 
            "textures",
            "materials",
            "scenes",
            "cache"
        ]
        
        for directory in directories:
            dir_path = self.asset_base_path / directory
            dir_path.mkdir(parents=True, exist_ok=True)
            logger.info(f"Created asset directory: {dir_path}")
    
    def upload_robot_assets(self, robot_config: Dict[str, Any]) -> Dict[str, str]:
        """
        Upload robot assets to AWS Isaac Sim instance.
        
        Args:
            robot_config: Robot configuration with URDF and asset paths
            
        Returns:
            Dictionary with uploaded asset paths
        """
        logger.info(f"Uploading robot assets for: {robot_config.get('name', 'unknown')}")
        
        uploaded_assets = {}
        
        try:
            # Create robot-specific directory
            robot_name = robot_config.get('name', 'robot')
            robot_dir = self.asset_base_path / "robots" / robot_name
            robot_dir.mkdir(parents=True, exist_ok=True)
            
            # Upload URDF file
            if 'urdf_path' in robot_config:
                urdf_path = self._upload_file(
                    robot_config['urdf_path'], 
                    robot_dir / f"{robot_name}.urdf"
                )
                uploaded_assets['urdf'] = str(urdf_path)
            
            # Upload mesh files
            if 'meshes' in robot_config:
                mesh_paths = []
                for mesh_path in robot_config['meshes']:
                    mesh_dest = robot_dir / "meshes" / os.path.basename(mesh_path)
                    mesh_dest.parent.mkdir(parents=True, exist_ok=True)
                    uploaded_mesh = self._upload_file(mesh_path, mesh_dest)
                    mesh_paths.append(str(uploaded_mesh))
                uploaded_assets['meshes'] = mesh_paths
            
            # Upload texture files
            if 'textures' in robot_config:
                texture_paths = []
                for texture_path in robot_config['textures']:
                    texture_dest = robot_dir / "textures" / os.path.basename(texture_path)
                    texture_dest.parent.mkdir(parents=True, exist_ok=True)
                    uploaded_texture = self._upload_file(texture_path, texture_dest)
                    texture_paths.append(str(uploaded_texture))
                uploaded_assets['textures'] = texture_paths
            
            # Create robot metadata
            metadata = {
                "name": robot_name,
                "uploaded_at": datetime.utcnow().isoformat(),
                "assets": uploaded_assets,
                "config": robot_config
            }
            
            metadata_path = robot_dir / "metadata.json"
            with open(metadata_path, 'w') as f:
                json.dump(metadata, f, indent=2)
            
            uploaded_assets['metadata'] = str(metadata_path)
            
            logger.info(f"Robot assets uploaded successfully: {robot_name}")
            return uploaded_assets
            
        except Exception as e:
            logger.error(f"Failed to upload robot assets: {e}")
            raise
    
    def _upload_file(self, source_path: str, dest_path: Path) -> Path:
        """
        Upload a single file to AWS.
        
        Args:
            source_path: Source file path
            dest_path: Destination path on AWS
            
        Returns:
            Path to uploaded file
        """
        try:
            # For now, we'll copy locally (in real implementation, use SCP/SFTP)
            if os.path.exists(source_path):
                shutil.copy2(source_path, dest_path)
                logger.info(f"Uploaded file: {source_path} -> {dest_path}")
                return dest_path
            else:
                raise FileNotFoundError(f"Source file not found: {source_path}")
                
        except Exception as e:
            logger.error(f"Failed to upload file {source_path}: {e}")
            raise
    
    def convert_robot_for_isaac_sim(self, robot_config: Dict[str, Any]) -> str:
        """
        Convert robot assets to Isaac Sim format.
        
        Args:
            robot_config: Robot configuration
            
        Returns:
            Path to converted USD file
        """
        from urdf_to_usd_converter import create_converter
        
        logger.info(f"Converting robot for Isaac Sim: {robot_config.get('name', 'unknown')}")
        
        try:
            # Upload assets first
            uploaded_assets = self.upload_robot_assets(robot_config)
            
            # Get URDF path
            urdf_path = uploaded_assets.get('urdf')
            if not urdf_path:
                raise ValueError("No URDF file found in uploaded assets")
            
            # Create converter (assume Isaac Sim is available on AWS)
            converter = create_converter(isaac_sim_available=True)
            
            # Convert URDF to USD
            robot_name = robot_config.get('name', 'robot')
            usd_path = self.asset_base_path / "scenes" / f"{robot_name}.usd"
            
            converted_path = converter.convert(
                urdf_path=urdf_path,
                output_usd_path=str(usd_path),
                robot_name=robot_name,
                config=robot_config.get('isaac_sim_config', {})
            )
            
            # Validate conversion
            if converter.validate_usd(converted_path):
                logger.info(f"Robot conversion successful: {converted_path}")
                return converted_path
            else:
                raise RuntimeError("USD file validation failed")
                
        except Exception as e:
            logger.error(f"Failed to convert robot for Isaac Sim: {e}")
            raise
    
    def load_robot_in_isaac_sim(self, robot_config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Load robot into Isaac Sim instance.
        
        Args:
            robot_config: Robot configuration
            
        Returns:
            Loading result information
        """
        logger.info(f"Loading robot in Isaac Sim: {robot_config.get('name', 'unknown')}")
        
        try:
            # Convert robot to USD format
            usd_path = self.convert_robot_for_isaac_sim(robot_config)
            
            # Send load command to Isaac Sim
            load_result = self._send_load_command_to_isaac_sim(usd_path, robot_config)
            
            return {
                "success": True,
                "usd_path": usd_path,
                "robot_name": robot_config.get('name', 'robot'),
                "load_result": load_result,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to load robot in Isaac Sim: {e}")
            return {
                "success": False,
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
    
    def _send_load_command_to_isaac_sim(self, usd_path: str, robot_config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Send robot load command to Isaac Sim instance.
        
        Args:
            usd_path: Path to USD file
            robot_config: Robot configuration
            
        Returns:
            Load command result
        """
        try:
            # Prepare load command
            load_command = {
                "action": "load_robot",
                "usd_path": usd_path,
                "robot_config": robot_config,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            # Send HTTP request to Isaac Sim API
            api_url = f"http://{self.aws_public_ip}:8000/load-robot"
            
            response = requests.post(
                api_url,
                json=load_command,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                logger.info(f"Robot load command successful: {result}")
                return result
            else:
                raise RuntimeError(f"Isaac Sim API error: {response.status_code} - {response.text}")
                
        except Exception as e:
            logger.error(f"Failed to send load command to Isaac Sim: {e}")
            raise
    
    def get_robot_list(self) -> List[Dict[str, Any]]:
        """
        Get list of available robots.
        
        Returns:
            List of robot information
        """
        robots = []
        
        try:
            robots_dir = self.asset_base_path / "robots"
            
            if robots_dir.exists():
                for robot_dir in robots_dir.iterdir():
                    if robot_dir.is_dir():
                        metadata_path = robot_dir / "metadata.json"
                        if metadata_path.exists():
                            with open(metadata_path, 'r') as f:
                                metadata = json.load(f)
                                robots.append(metadata)
                        else:
                            # Basic info without metadata
                            robots.append({
                                "name": robot_dir.name,
                                "uploaded_at": None,
                                "assets": {},
                                "config": {}
                            })
            
            logger.info(f"Found {len(robots)} robots")
            return robots
            
        except Exception as e:
            logger.error(f"Failed to get robot list: {e}")
            return []
    
    def cleanup_robot_assets(self, robot_name: str) -> bool:
        """
        Clean up robot assets.
        
        Args:
            robot_name: Name of robot to clean up
            
        Returns:
            True if successful, False otherwise
        """
        try:
            robot_dir = self.asset_base_path / "robots" / robot_name
            
            if robot_dir.exists():
                shutil.rmtree(robot_dir)
                logger.info(f"Cleaned up robot assets: {robot_name}")
                return True
            else:
                logger.warning(f"Robot directory not found: {robot_dir}")
                return False
                
        except Exception as e:
            logger.error(f"Failed to cleanup robot assets: {e}")
            return False
    
    def get_asset_info(self, asset_path: str) -> Dict[str, Any]:
        """
        Get information about an asset.
        
        Args:
            asset_path: Path to asset
            
        Returns:
            Asset information
        """
        info = {
            "path": asset_path,
            "exists": False,
            "size": 0,
            "modified": None,
            "type": "unknown"
        }
        
        try:
            if os.path.exists(asset_path):
                info["exists"] = True
                info["size"] = os.path.getsize(asset_path)
                info["modified"] = os.path.getmtime(asset_path)
                
                # Determine file type
                ext = Path(asset_path).suffix.lower()
                if ext == '.urdf':
                    info["type"] = "urdf"
                elif ext in ['.dae', '.stl', '.obj', '.ply']:
                    info["type"] = "mesh"
                elif ext in ['.png', '.jpg', '.jpeg', '.tga']:
                    info["type"] = "texture"
                elif ext == '.usd':
                    info["type"] = "usd"
                else:
                    info["type"] = "other"
            
            return info
            
        except Exception as e:
            logger.error(f"Failed to get asset info: {e}")
            return info


def create_asset_manager(aws_public_ip: str) -> RobotAssetManager:
    """
    Factory function to create a robot asset manager.
    
    Args:
        aws_public_ip: Public IP of AWS Isaac Sim instance
        
    Returns:
        RobotAssetManager instance
    """
    return RobotAssetManager(aws_public_ip)


# Example usage
if __name__ == "__main__":
    # Test the asset manager
    asset_manager = create_asset_manager("localhost")  # Replace with actual AWS IP
    
    # Example robot configuration
    robot_config = {
        "name": "test_robot",
        "urdf_path": "test_robot.urdf",
        "meshes": ["mesh1.stl", "mesh2.obj"],
        "textures": ["texture1.png"],
        "isaac_sim_config": {
            "merge_fixed_joints": False,
            "fix_base": True
        }
    }
    
    try:
        # Load robot in Isaac Sim
        result = asset_manager.load_robot_in_isaac_sim(robot_config)
        print(f"Load result: {result}")
        
        # Get robot list
        robots = asset_manager.get_robot_list()
        print(f"Available robots: {robots}")
        
    except Exception as e:
        print(f"Asset management failed: {e}")

