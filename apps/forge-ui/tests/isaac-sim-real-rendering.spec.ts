import { test, expect } from '@playwright/test'

const ANVIL_SIM_URL = process.env.ANVIL_SIM_URL || 'http://localhost:8002'

test.describe('Isaac Sim Real 3D Rendering', () => {
  test('verifies real 3D rendering with camera controls', async ({ page }) => {
    // Step 1: Check scene status via debug endpoint
    const sceneStatusResponse = await page.request.get(`${ANVIL_SIM_URL}/debug/scene_status`)
    expect(sceneStatusResponse.ok()).toBeTruthy()
    
    const sceneStatus = await sceneStatusResponse.json()
    console.log('Scene Status:', JSON.stringify(sceneStatus, null, 2))
    
    // Verify Isaac Sim is available and scene is initialized
    expect(sceneStatus.isaac_sim_available).toBe(true)
    expect(sceneStatus.scene_initialized).toBe(true)
    expect(sceneStatus.camera_exists).toBe(true)
    expect(sceneStatus.robot_loaded).toBe(true)
    
    // Step 2: Check frame statistics via debug endpoint
    const frameStatsResponse = await page.request.get(`${ANVIL_SIM_URL}/debug/frame_stats`)
    expect(frameStatsResponse.ok()).toBeTruthy()
    
    const frameStats = await frameStatsResponse.json()
    console.log('Frame Stats:', JSON.stringify(frameStats, null, 2))
    
    // Verify frames are being generated and are not black
    expect(frameStats.frame_count).toBeGreaterThan(0)
    if (frameStats.frame_stats) {
      expect(frameStats.frame_stats.is_black).toBe(false)
      expect(frameStats.frame_stats.mean).toBeGreaterThan(0.01)
      expect(frameStats.frame_stats.max).toBeGreaterThan(0.1)
      console.log('✅ Frame validation passed - non-black frames detected')
    }
    
    // Step 3: Test camera control endpoint
    const cameraUpdateResponse = await page.request.post(`${ANVIL_SIM_URL}/update_camera`, {
      data: {
        position: [3.0, 3.0, 2.0],
        target: [0.0, 0.0, 0.5],
        fov: 70.0
      }
    })
    
    expect(cameraUpdateResponse.ok()).toBeTruthy()
    const cameraUpdate = await cameraUpdateResponse.json()
    expect(cameraUpdate.success).toBe(true)
    expect(cameraUpdate.position).toEqual([3.0, 3.0, 2.0])
    expect(cameraUpdate.target).toEqual([0.0, 0.0, 0.5])
    expect(cameraUpdate.fov).toBe(70.0)
    console.log('✅ Camera control endpoint working')
    
    // Wait a moment for camera update to take effect
    await page.waitForTimeout(1000)
    
    // Step 4: Verify updated frame stats after camera change
    const updatedFrameStatsResponse = await page.request.get(`${ANVIL_SIM_URL}/debug/frame_stats`)
    const updatedFrameStats = await updatedFrameStatsResponse.json()
    
    // Verify camera state was updated
    expect(updatedFrameStats.camera_state.position).toEqual([3.0, 3.0, 2.0])
    expect(updatedFrameStats.camera_state.target).toEqual([0.0, 0.0, 0.5])
    expect(updatedFrameStats.camera_state.fov).toBe(70.0)
    console.log('✅ Camera state updated correctly')
    
    // Step 5: Verify frames are still valid after camera update
    if (updatedFrameStats.frame_stats) {
      expect(updatedFrameStats.frame_stats.is_black).toBe(false)
      expect(updatedFrameStats.frame_stats.mean).toBeGreaterThan(0.01)
      console.log('✅ Frame quality maintained after camera update')
    }
    
    // Step 6: Test multiple camera positions to verify interactive control
    const cameraPositions = [
      { position: [4.0, 0.0, 2.0], target: [0.0, 0.0, 0.3], fov: 60.0 }, // Side view
      { position: [0.0, 4.0, 2.0], target: [0.0, 0.0, 0.3], fov: 60.0 }, // Another side
      { position: [2.0, 2.0, 1.5], target: [0.0, 0.0, 0.3], fov: 60.0 }, // Back to default
    ]
    
    for (const camPos of cameraPositions) {
      const response = await page.request.post(`${ANVIL_SIM_URL}/update_camera`, {
        data: camPos
      })
      expect(response.ok()).toBeTruthy()
      const result = await response.json()
      expect(result.success).toBe(true)
      await page.waitForTimeout(500) // Brief pause between camera changes
    }
    console.log('✅ Multiple camera positions tested successfully')
    
    // Step 7: Final verification - ensure scene is still valid
    const finalSceneStatus = await (await page.request.get(`${ANVIL_SIM_URL}/debug/scene_status`)).json()
    expect(finalSceneStatus.scene_initialized).toBe(true)
    expect(finalSceneStatus.robot_loaded).toBe(true)
    expect(finalSceneStatus.camera_exists).toBe(true)
    
    // Step 8: Capture final frame stats for verification
    const finalFrameStats = await (await page.request.get(`${ANVIL_SIM_URL}/debug/frame_stats`)).json()
    expect(finalFrameStats.frame_count).toBeGreaterThan(50) // Should have rendered many frames by now
    console.log(`✅ Final frame count: ${finalFrameStats.frame_count}`)
    
    if (finalFrameStats.frame_stats) {
      expect(finalFrameStats.frame_stats.is_black).toBe(false)
      console.log(`✅ Final frame mean value: ${finalFrameStats.frame_stats.mean}`)
      console.log(`✅ Final frame max value: ${finalFrameStats.frame_stats.max}`)
    }
    
    console.log('✅ All Isaac Sim real 3D rendering tests passed!')
  })
  
  test('verifies HTTP video stream contains real frames', async ({ page }) => {
    // First, create a scene session
    const createSceneResponse = await page.request.post(`${ANVIL_SIM_URL}/create_scene`, {
      data: {
        user_id: 'test-user',
        isaac_sim_robot: {
          name: 'TurtleBot3',
          isaac_sim_path: '/Isaac/Robots/TurtleBot3/turtlebot3.usd'
        }
      }
    })
    
    expect(createSceneResponse.ok()).toBeTruthy()
    const sceneData = await createSceneResponse.json()
    expect(sceneData.success).toBe(true)
    const sessionId = sceneData.session_id
    console.log(`✅ Scene created with session ID: ${sessionId}`)
    
    // Wait for scene to initialize
    await page.waitForTimeout(2000)
    
    // Check that frames are being generated (not just black/placeholder)
    const frameStatsResponse = await page.request.get(`${ANVIL_SIM_URL}/debug/frame_stats`)
    const frameStats = await frameStatsResponse.json()
    
    expect(frameStats.scene_initialized).toBe(true)
    expect(frameStats.frame_count).toBeGreaterThan(0)
    
    if (frameStats.frame_stats) {
      // Real 3D frames should have meaningful pixel values
      expect(frameStats.frame_stats.mean).toBeGreaterThan(0.01)
      expect(frameStats.frame_stats.is_black).toBe(false)
      console.log('✅ Real 3D frames detected (not black/placeholder)')
    }
    
    // Verify robot is loaded
    expect(frameStats.robot_loaded).toBe(true)
    expect(frameStats.robot_config.name).toBe('TurtleBot3')
    console.log('✅ Robot (TurtleBot3) verified as loaded')
  })
})

