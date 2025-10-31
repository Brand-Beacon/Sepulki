'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Loader2, Zap, AlertCircle, Pause, Play, RotateCcw, Camera, Maximize, Minimize, Eye, Move, Target, ExternalLink } from 'lucide-react'
import type { RobotSpec } from '@/types/robot'
import { env } from '@/lib/env'

interface RobotConfig {
  selectedRobot?: any // IsaacSimRobot type
  isaacSimPath?: string
  robotName?: string
  physicsConfig?: any
}

interface IsaacSimDisplayProps {
  spec?: RobotSpec
  urdf?: string | URL
  environment?: 'warehouse' | 'factory' | 'lab' | 'outdoor'
  qualityProfile?: 'demo' | 'engineering' | 'certification'
  enablePhysics?: boolean
  userId?: string
  robotConfig?: RobotConfig
  onJointControl?: (jointStates: Record<string, number>) => void
  onError?: (error: Error | string) => void
  className?: string
}

export function IsaacSimDisplay({
  spec,
  urdf,
  environment = 'warehouse',
  qualityProfile = 'engineering',
  enablePhysics = true,
  userId = 'anonymous',
  robotConfig,
  onJointControl,
  onError,
  className = ''
}: IsaacSimDisplayProps) {
  const [connectionState, setConnectionState] = useState<'checking' | 'connecting' | 'connected' | 'error'>('checking')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [webrtcUrl, setWebrtcUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [sessionInfo, setSessionInfo] = useState<any>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const initRef = useRef(false)

  // Initialize Isaac Sim session and get WebRTC URL
  useEffect(() => {
    if (initRef.current) return
    initRef.current = true

    const initialize = async () => {
      try {
        setConnectionState('connecting')
        setLoading(true)
        setError(null)
        
        console.log('🎬 Initializing Isaac Sim session...')
        
        // Create Isaac Sim session via GraphQL
        const sessionResponse = await fetch('/api/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `
              mutation CreateIsaacSimSession($robotConfig: IsaacSimSessionInput!) {
                createIsaacSimSession(robotConfig: $robotConfig) {
                  sessionId
                  webrtcUrl
                  status
                  robotName
                  awsPublicIp
                  robotLoaded
                }
              }
            `,
            variables: {
              robotConfig: {
                name: robotConfig?.robotName || spec?.name || 'demo-robot',
                urdfPath: typeof urdf === 'string' ? urdf : urdf?.toString(),
                environment,
                qualityProfile,
                isaacSimConfig: JSON.stringify(robotConfig?.physicsConfig || {})
              }
            }
          })
        })

        if (!sessionResponse.ok) {
          throw new Error('Failed to create Isaac Sim session')
        }

        const sessionData = await sessionResponse.json()
        
        if (sessionData.errors) {
          throw new Error(sessionData.errors[0].message)
        }

        const session = sessionData.data.createIsaacSimSession
        setSessionId(session.sessionId)
        setWebrtcUrl(session.webrtcUrl)
        setSessionInfo(session)
        
        // Store session ID for robot changes
        localStorage.setItem('isaac_sim_session_id', session.sessionId)
        
        console.log('✅ Isaac Sim session created:', session.sessionId)
        console.log('🌐 WebRTC URL:', session.webrtcUrl)

        setConnectionState('connected')
        setLoading(false)
        
      } catch (error) {
        console.error('❌ Isaac Sim session creation failed:', error)
        setConnectionState('error')
        setError(error.message)
        setLoading(false)
        onError?.(error as Error)
      }
    }

    initialize()

    return () => {
      // Cleanup session when component unmounts
      if (sessionId) {
        fetch('/api/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: `
              mutation DestroyIsaacSimSession($sessionId: String!) {
                destroyIsaacSimSession(sessionId: $sessionId)
              }
            `,
            variables: { sessionId }
          })
        }).catch(console.error)
      }
    }
  }, [])

  // Joint control functions
  const handleJointChange = async (jointName: string, value: number) => {
    if (!sessionId) return

    try {
      // Send joint update via GraphQL
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            mutation UpdateIsaacSimJoints($sessionId: String!, $jointStates: [String!]!) {
              updateIsaacSimJoints(sessionId: $sessionId, jointStates: $jointStates)
            }
          `,
          variables: {
            sessionId,
            jointStates: [`${jointName}:${value}`]
          }
        })
      })

      if (response.ok) {
        console.log('🤖 Joint control sent to Isaac Sim:', jointName, value)
        onJointControl?.({ [jointName]: value })
      }
    } catch (error) {
      console.error('❌ Failed to send joint control:', error)
    }
  }

  // Camera control functions (for future use with Isaac Sim API)
  const handleCameraChange = async (cameraConfig: any) => {
    if (!sessionId) return

    try {
      const response = await fetch('/api/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `
            mutation UpdateIsaacSimCamera($sessionId: String!, $cameraConfig: JSON!) {
              updateIsaacSimCamera(sessionId: $sessionId, cameraConfig: $cameraConfig)
            }
          `,
          variables: {
            sessionId,
            cameraConfig
          }
        })
      })

      if (response.ok) {
        console.log('📹 Camera control sent to Isaac Sim:', cameraConfig)
      }
    } catch (error) {
      console.error('❌ Failed to send camera control:', error)
    }
  }

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
      console.error('❌ Fullscreen toggle failed:', error)
    }
  }

  // Open WebRTC client in new window
  const openWebRTCClient = () => {
    if (webrtcUrl) {
      window.open(webrtcUrl, '_blank', 'width=1200,height=800')
    }
  }

  // Fullscreen event listeners
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange)

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange)
    }
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'f' || event.key === 'F') {
        event.preventDefault()
        toggleFullscreen()
      }
      if (event.key === 'Escape' && isFullscreen) {
        event.preventDefault()
        toggleFullscreen()
      }
    }

    document.addEventListener('keydown', handleKeyPress)
    return () => document.removeEventListener('keydown', handleKeyPress)
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
            {error || 'Failed to connect to Isaac Sim service. Please check AWS deployment.'}
          </div>
          <div className="text-left bg-gray-800 rounded-lg p-3 mb-4 font-mono text-xs">
            AWS IP: {process.env.NEXT_PUBLIC_AWS_ISAAC_SIM_IP || 'Not configured'}
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

  // Loading state
  if (loading) {
    return (
      <div className={`bg-gray-900 rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-center text-white max-w-md mx-auto p-6">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <div className="text-xl font-medium mb-2">Initializing Isaac Sim</div>
          <div className="text-sm text-gray-300">
            Creating session and loading robot model...
          </div>
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
      {webrtcUrl && (
        <iframe
          ref={iframeRef}
          src={webrtcUrl}
          className="w-full h-full border-0"
          title="Isaac Sim WebRTC Stream"
          allow="camera; microphone; autoplay; encrypted-media; fullscreen"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-presentation allow-top-navigation"
        />
      )}

      {/* Fallback message if no WebRTC URL */}
      {!webrtcUrl && connectionState === 'connected' && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="bg-black/80 text-white p-6 rounded-lg text-center">
            <div className="text-xl font-medium mb-2">Isaac Sim Ready</div>
            <div className="text-sm text-gray-300 mb-4">
              WebRTC client URL not available. Please check session configuration.
            </div>
            <button
              onClick={openWebRTCClient}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg"
            >
              Open in New Window
            </button>
          </div>
        </div>
      )}

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
                <span className="text-cyan-400 font-semibold">{sessionInfo?.robotName || 'Loading...'}</span>
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
                <span>Session:</span>
                <span className="text-purple-400 font-mono text-xs">{sessionId?.slice(-8) || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <span className="text-green-400 font-semibold">✅ Connected</span>
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
            Powered by NVIDIA Isaac Sim
          </div>
        </div>
      </div>
    </div>
  )
}