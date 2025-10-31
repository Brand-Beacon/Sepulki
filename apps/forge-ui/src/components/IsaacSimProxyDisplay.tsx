'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Loader2, Zap, AlertCircle, Maximize, Minimize, ExternalLink, Radio } from 'lucide-react'

interface IsaacSimProxyDisplayProps {
  robotName?: string
  userId?: string
  environment?: 'warehouse' | 'factory' | 'lab' | 'outdoor'
  qualityProfile?: 'demo' | 'engineering' | 'certification'
  enablePhysics?: boolean
  className?: string
}

export function IsaacSimProxyDisplay({
  robotName = 'demo-robot',
  userId = 'anonymous',
  environment = 'warehouse',
  qualityProfile = 'engineering',
  enablePhysics = true,
  className = ''
}: IsaacSimProxyDisplayProps) {
  const [connectionState, setConnectionState] = useState<'connecting' | 'connected' | 'error'>('connecting')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [embedUrl, setEmbedUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [streamMode, setStreamMode] = useState<'embed' | 'mjpeg'>('embed')

  const containerRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const wsRef = useRef<WebSocket | null>(null)

  // Video proxy configuration from environment
  const proxyUrl = typeof window !== 'undefined' && (window as any).__SEPULKI_ENV__?.videoProxyUrl 
    ? (window as any).__SEPULKI_ENV__.videoProxyUrl 
    : 'http://localhost:8889'

  // Initialize streaming session
  useEffect(() => {
    const initializeSession = async () => {
      try {
        setConnectionState('connecting')
        console.log('Creating video streaming session...')

        // Create session via proxy
        const response = await fetch(`${proxyUrl}/session/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            robotName
          })
        })

        if (!response.ok) {
          throw new Error('Failed to create streaming session')
        }

        const data = await response.json()

        if (!data.success) {
          throw new Error(data.error || 'Unknown error')
        }

        setSessionId(data.sessionId)
        setEmbedUrl(`${proxyUrl}/stream/${data.sessionId}/embed`)

        console.log('Streaming session created:', data.sessionId)
        console.log('Embed URL:', data.httpStreamUrl)

        setConnectionState('connected')

        // Optional: Connect WebSocket for real-time updates
        if (streamMode === 'embed') {
          connectWebSocket(data.wsUrl)
        }

      } catch (err: any) {
        console.error('Failed to create streaming session:', err)
        setError(err.message)
        setConnectionState('error')
      }
    }

    initializeSession()

    // Cleanup on unmount
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }

      if (sessionId) {
        // Destroy session
        fetch(`${proxyUrl}/session/${sessionId}/destroy`, {
          method: 'POST'
        }).catch(console.error)
      }
    }
  }, [proxyUrl, userId, robotName, streamMode])

  // Connect WebSocket for real-time updates
  const connectWebSocket = (wsUrl: string) => {
    try {
      console.log('Connecting to WebSocket:', wsUrl)

      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('WebSocket connected')
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          
          if (data.type === 'status') {
            console.log('Status update:', data.message)
          } else if (data.type === 'error') {
            console.error('WebSocket error:', data.message)
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err)
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
      }

      ws.onclose = () => {
        console.log('WebSocket disconnected')
      }
    } catch (err) {
      console.error('Failed to connect WebSocket:', err)
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
      console.error('Fullscreen toggle failed:', error)
    }
  }

  // Open stream in new window
  const openInNewWindow = () => {
    if (embedUrl) {
      window.open(embedUrl, '_blank', 'width=1280,height=720')
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

  // Error state
  if (connectionState === 'error') {
    return (
      <div 
        data-testid="isaac-sim-proxy-display"
        className={`bg-gray-900 rounded-lg flex items-center justify-center ${className}`}
      >
        <div className="text-center text-white max-w-md mx-auto p-6">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <div className="text-xl font-medium mb-2">Video Proxy Connection Failed</div>
          <div className="text-sm text-gray-300 mb-6">
            {error || 'Failed to connect to video streaming proxy.'}
          </div>
          <div className="text-left bg-gray-800 rounded-lg p-3 mb-4 font-mono text-xs">
            Proxy URL: {proxyUrl}
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
  if (connectionState === 'connecting') {
    return (
      <div className={`bg-gray-900 rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-center text-white max-w-md mx-auto p-6">
          <Loader2 className="w-12 h-12 text-blue-500 mx-auto mb-4 animate-spin" />
          <div className="text-xl font-medium mb-2">Connecting to Video Stream</div>
          <div className="text-sm text-gray-300">
            Initializing streaming session via proxy...
          </div>
        </div>
      </div>
    )
  }

  // Connected state - display video stream
  return (
    <div 
      ref={containerRef}
      data-testid="isaac-sim-proxy-display"
      className={`relative bg-black overflow-hidden ${
        isFullscreen 
          ? 'fixed inset-0 z-50' 
          : `rounded-lg ${className}`
      }`}
    >
      {/* Video Stream Display */}
      {streamMode === 'embed' && embedUrl && (
        <iframe
          ref={iframeRef}
          src={embedUrl}
          className="w-full h-full border-0"
          title="Isaac Sim Video Stream"
          allow="autoplay; fullscreen"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
        />
      )}

      {streamMode === 'mjpeg' && sessionId && (
        <img
          src={`${proxyUrl}/stream/${sessionId}/mjpeg`}
          alt="Isaac Sim MJPEG Stream"
          className="w-full h-full object-contain"
        />
      )}

      {/* Status HUD */}
      {showControls && (
        <div className="absolute top-4 left-4 z-30">
          <div className="bg-black/95 backdrop-blur-sm rounded-xl p-4 border border-yellow-500/30 shadow-2xl">
            <div className="flex items-center space-x-3 mb-3">
              <Radio className="w-5 h-5 text-green-500 animate-pulse" />
              <Zap className="w-5 h-5 text-yellow-500" />
              <span className="text-white font-bold">Isaac Sim Stream</span>
            </div>
            
            <div className="text-sm text-gray-300 space-y-1">
              <div className="flex justify-between">
                <span>Robot:</span>
                <span className="text-cyan-400 font-semibold">{robotName}</span>
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
                <span className="text-purple-400 font-mono text-xs">{sessionId?.slice(-8)}</span>
              </div>
              <div className="flex justify-between">
                <span>Mode:</span>
                <span className="text-green-400 font-semibold">{streamMode.toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <span className="text-green-400 font-semibold">Streaming</span>
              </div>
            </div>

            {enablePhysics && (
              <div className="mt-3 pt-3 border-t border-gray-600">
                <div className="flex items-center text-yellow-400 text-xs">
                  <Zap className="w-3 h-3 mr-2" />
                  <span>PhysX 5.1 Active</span>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  Real-time physics • Camera controls • Video proxy
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
            <div className="text-white text-sm font-bold mb-2">Stream Controls</div>
            
            <div className="flex flex-col space-y-2">
              <button
                onClick={openInNewWindow}
                className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-all flex items-center justify-center space-x-2"
                title="Open in new window"
              >
                <ExternalLink className="w-4 h-4" />
                <span className="text-xs">New Window</span>
              </button>

              <button
                onClick={toggleFullscreen}
                className="p-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white transition-all flex items-center justify-center space-x-2"
                title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              >
                {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                <span className="text-xs">{isFullscreen ? 'Exit' : 'Fullscreen'}</span>
              </button>

              <button
                onClick={() => setStreamMode(streamMode === 'embed' ? 'mjpeg' : 'embed')}
                className="p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-all"
                title="Toggle stream mode"
              >
                <span className="text-xs">Switch to {streamMode === 'embed' ? 'MJPEG' : 'Embed'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Isaac Sim Branding */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
        <div className="bg-gradient-to-r from-green-600 to-blue-600 px-4 py-1 rounded-full">
          <div className="text-white text-xs font-bold">
            Powered by NVIDIA Isaac Sim • Video Proxy
          </div>
        </div>
      </div>
    </div>
  )
}

