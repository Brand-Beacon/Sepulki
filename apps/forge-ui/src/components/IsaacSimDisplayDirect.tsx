'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Zap, AlertCircle, Maximize, Minimize, Eye, ExternalLink } from 'lucide-react'
import type { RobotSpec } from '@/types/robot'

interface IsaacSimDisplayDirectProps {
  spec?: RobotSpec
  environment?: 'warehouse' | 'factory' | 'lab' | 'outdoor'
  qualityProfile?: 'demo' | 'engineering' | 'certification'
  enablePhysics?: boolean
  className?: string
}

export function IsaacSimDisplayDirect({
  spec,
  environment = 'warehouse',
  qualityProfile = 'engineering',
  enablePhysics = true,
  className = ''
}: IsaacSimDisplayDirectProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'error'>('connecting')

  const containerRef = useRef<HTMLDivElement>(null)

  // Get Isaac Sim configuration from environment
  const isaacSimIP = process.env.NEXT_PUBLIC_ISAAC_SIM_IP || '18.234.83.45'
  const isaacSimPort = process.env.NEXT_PUBLIC_ISAAC_SIM_PORT || '8211'
  const webrtcClientPort = '8889' // Separate port for the WebRTC client HTML (nginx serving Omniverse client)
  
  // Direct WebRTC URL to Isaac Sim - using the Omniverse WebRTC client
  const webrtcUrl = `http://${isaacSimIP}:${webrtcClientPort}/?server=${isaacSimIP}`

  // Check connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Simple fetch to check if Isaac Sim is reachable
        const response = await fetch(`http://${isaacSimIP}:${isaacSimPort}`, { 
          method: 'HEAD',
          mode: 'no-cors'
        })
        setConnectionState('connected')
      } catch (error) {
        console.error('Isaac Sim connection check failed:', error)
        setConnectionState('error')
      }
    }

    // Delay to allow Isaac Sim to fully initialize
    const timer = setTimeout(checkConnection, 2000)
    return () => clearTimeout(timer)
  }, [isaacSimIP, isaacSimPort])

  // Fullscreen functionality
  const toggleFullscreen = async () => {
    if (!containerRef.current) return

    try {
      if (!isFullscreen) {
        if (containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen()
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen()
        }
      }
    } catch (error) {
      console.error('Fullscreen toggle failed:', error)
    }
  }

  // Open WebRTC client in new window
  const openWebRTCClient = () => {
    window.open(webrtcUrl, '_blank', 'width=1200,height=800')
  }

  // Fullscreen event listeners
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)
    document.addEventListener('mozfullscreenchange', handleFullscreenChange)
    document.addEventListener('msfullscreenchange', handleFullscreenChange)

    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isFullscreen) {
        toggleFullscreen()
      }
    }

    document.addEventListener('keydown', handleKeyPress)
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange)
      document.removeEventListener('msfullscreenchange', handleFullscreenChange)
      document.removeEventListener('keydown', handleKeyPress)
    }
  }, [isFullscreen, toggleFullscreen])

  // Error state
  if (connectionState === 'error') {
    return (
      <div 
        data-testid="isaac-sim-display"
        className={`bg-gray-900 rounded-lg flex items-center justify-center ${className}`}
      >
        <div className="text-center text-white max-w-md mx-auto p-6">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <div className="text-xl font-medium mb-2">Isaac Sim Service Offline</div>
          <div className="text-sm text-gray-300 mb-6">
            Failed to connect to Isaac Sim service at {isaacSimIP}:{isaacSimPort}
          </div>
          <div className="text-left bg-gray-800 rounded-lg p-3 mb-4 font-mono text-xs">
            Isaac Sim IP: {isaacSimIP}<br/>
            Port: {isaacSimPort}<br/>
            WebRTC URL: {webrtcUrl}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm font-medium"
          >
            Retry Connection
          </button>
        </div>
      </div>
    )
  }

  // Connected state - Isaac Sim WebRTC iframe
  return (
    <div 
      ref={containerRef}
      data-testid="isaac-sim-display"
      className={`relative bg-black overflow-hidden ${
        isFullscreen 
          ? 'fixed inset-0 z-50' 
          : `rounded-lg ${className}`
      }`}
    >
      {/* Isaac Sim WebRTC Client iframe */}
      <iframe
        src={webrtcUrl}
        className="w-full h-full border-0"
        title="Isaac Sim WebRTC Stream"
        allow="camera; microphone; autoplay; encrypted-media; fullscreen"
        sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-presentation allow-top-navigation"
      />

      {/* Isaac Sim Status HUD */}
      {showControls && (
        <div className="absolute top-4 left-4 z-30">
          <div className="bg-black/95 backdrop-blur-sm rounded-xl p-4 border border-yellow-500/30 shadow-2xl">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <Zap className="w-5 h-5 text-yellow-500" />
              <span className="text-white font-bold">NVIDIA Isaac Sim</span>
            </div>
            
            <div className="text-sm text-gray-300 space-y-1">
              <div className="flex justify-between">
                <span>Robot:</span>
                <span className="text-cyan-400 font-semibold">{spec?.name || 'Loading...'}</span>
              </div>
              <div className="flex justify-between">
                <span>Environment:</span>
                <span className="text-cyan-400 font-semibold">{environment}</span>
              </div>
              <div className="flex justify-between">
                <span>Quality:</span>
                <span className="text-cyan-400 font-semibold">{qualityProfile}</span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <span className="text-green-400 font-semibold">Connected</span>
              </div>
            </div>

            {enablePhysics && (
              <div className="mt-3 pt-3 border-t border-gray-600">
                <div className="flex items-center text-yellow-400 text-xs">
                  <Zap className="w-3 h-3 mr-2" />
                  <span>PhysX 5.1 Active</span>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Real-time physics • Camera controls • WebRTC streaming
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Control Panel */}
      {showControls && (
        <div className="absolute top-4 right-4 z-30">
          <div className="bg-black/95 backdrop-blur-sm rounded-xl p-4 space-y-3 border border-gray-600/50">
            <div className="text-white text-sm font-bold mb-2">Isaac Sim Controls</div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => setShowControls(!showControls)}
                className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-all"
                title="Toggle controls"
              >
                <Eye className="w-4 h-4" />
              </button>

              <button
                onClick={openWebRTCClient}
                className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-all"
                title="Open in new window"
              >
                <ExternalLink className="w-4 h-4" />
              </button>

              <button
                onClick={toggleFullscreen}
                className="p-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white transition-all"
                title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Isaac Sim Branding */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
        <div className="bg-gradient-to-r from-green-600 to-blue-600 px-4 py-1 rounded-full">
          <div className="text-white text-xs font-bold">
            Powered by NVIDIA Isaac Sim • {isaacSimIP}:{isaacSimPort}
          </div>
        </div>
      </div>
    </div>
  )
}

