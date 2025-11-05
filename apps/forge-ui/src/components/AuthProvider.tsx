'use client'

import { ReactNode, createContext, useContext, useEffect, useState, useCallback } from "react"
import { useRouter } from 'next/navigation'
import { env, shouldUseMockAuth, shouldUseRealAuth } from '../lib/env'

interface Smith {
  id: string
  name?: string
  email?: string
  image?: string
  role: 'SMITH' | 'OVER_SMITH' | 'ADMIN'
}

interface AuthContextType {
  smith: Smith | null
  loading: boolean
  signOut: () => void
  authMode: 'mock' | 'real' | 'none'
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [smith, setSmith] = useState<Smith | null>(null)
  const [loading, setLoading] = useState(true)
  const [authMode, setAuthMode] = useState<'mock' | 'real' | 'none'>('none')
  const router = useRouter()

  // Update global auth state for GraphQL client
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__SEPULKI_AUTH__ = { smith, authMode };
    }
  }, [smith, authMode]);

  // Check session with local auth service
  const checkLocalSession = useCallback(async () => {
    let timeoutId: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error('Session check timeout'));
      }, 3000); // 3 second timeout
    });

    try {
      // Use same hostname as current origin for cookie sharing
      const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
      const authUrl = `http://${hostname}:4446`
      const fetchPromise = fetch(`${authUrl}/auth/session`, {
        credentials: 'include',
      });
      
      const response = await Promise.race([fetchPromise, timeoutPromise]);
      
      if (timeoutId) clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error('Auth service not available')
      }
      const session = await response.json()
      
      if (session?.user) {
        setSmith({
          id: session.user.id,
          name: session.user.name,
          email: session.user.email,
          image: session.user.image || '',
          role: session.user.role
        })
        console.log('Local auth session found:', session.user.email)
        setLoading(false)
      } else {
        // No session found - just set loading to false, let RouteGuard or pages handle redirect
        console.log('No local auth session found')
        setSmith(null)
        setLoading(false)
      }
    } catch (error) {
      if (timeoutId) clearTimeout(timeoutId);
      console.error('Local auth service not available:', error)
      
      // If auth service is down, just set loading to false, let RouteGuard or pages handle redirect
      setSmith(null)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    console.log('AuthProvider useEffect starting');
    
    // Ensure we're running on client side
    if (typeof window === 'undefined') {
      console.log('AuthProvider: window is undefined, skipping');
      return;
    }

    // Final fallback timeout - ensure loading is ALWAYS set to false
    const fallbackTimeout = setTimeout(() => {
      console.warn('Auth check timeout - setting loading to false');
      setLoading(false);
    }, 5000); // 5 second maximum timeout
      
    // Check if auth state was explicitly cleared for testing (only if explicitly set to stay signed out)
      const authData = (window as any).__SEPULKI_AUTH__;
    if (authData && authData.smith === null && authData.authMode === 'mock' && authData.staySignedOut === true) {
      clearTimeout(fallbackTimeout);
      console.log('Authentication explicitly cleared for testing - staying signed out');
        setSmith(null);
      setAuthMode('mock');
        setLoading(false);
        return;
      }
      
    // Environment-aware authentication setup
    console.log('🔍 Checking auth mode:', { 
      shouldUseMockAuth: shouldUseMockAuth(), 
      shouldUseRealAuth: shouldUseRealAuth(),
      isDevelopment: env.isDevelopment 
    });

    if (shouldUseMockAuth()) {
      // Development mode with LOCAL AUTH SERVICE (like LocalStack)
      console.log('Using local Auth.js service (LocalStack equivalent)')
      setAuthMode('mock')
      checkLocalSession()
        .then(() => {
          clearTimeout(fallbackTimeout);
          console.log('checkLocalSession completed successfully');
        })
        .catch((error) => {
          clearTimeout(fallbackTimeout);
          console.error('Failed to check local session:', error);
          setLoading(false);
        });
    } else if (shouldUseRealAuth()) {
      clearTimeout(fallbackTimeout);
      // Production mode - NextAuth.js will handle authentication
      setAuthMode('real')
      console.log('Using real authentication providers:', env.authProviders)
      // TODO: Initialize NextAuth.js session here
      setLoading(false)
    } else {
      clearTimeout(fallbackTimeout);
      // No authentication configured
      setAuthMode('none')
      console.warn('No authentication providers configured')
    setLoading(false)
  }

    // Cleanup function
    return () => {
      console.log('🧹 AuthProvider useEffect cleanup');
      clearTimeout(fallbackTimeout);
    };
  }, [checkLocalSession])

  const signOut = async () => {
    try {
      setSmith(null)

      // Update global auth state to reflect signed out status
      if (typeof window !== 'undefined') {
        (window as any).__SEPULKI_AUTH__ = { smith: null, authMode, staySignedOut: true };
      }

      if (authMode === 'real') {
        // Production: NextAuth.js signOut
        // signOut() from next-auth/react
        router.push('/auth/signin')
      } else if (authMode === 'mock') {
        // Development: Local auth service signOut
        try {
          // Use same hostname as current origin for cookie sharing
          const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
          const authUrl = `http://${hostname}:4446`

          const response = await fetch(`${authUrl}/auth/signout`, {
            method: 'POST',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
          })

          if (!response.ok) {
            throw new Error(`Signout failed with status: ${response.status}`)
          }

          console.log('✓ Signed out successfully via local auth service')
          router.push('/auth/signin')
        } catch (error) {
          console.error('Local auth signout failed:', error)
          // Clear local state and redirect even if service call fails
          console.log('⚠ Redirecting to signin despite service error (client state cleared)')
          router.push('/auth/signin')
        }
      } else {
        // No auth mode configured, just redirect
        router.push('/auth/signin')
      }
    } catch (error) {
      console.error('Unexpected error during signout:', error)
      // Always redirect to signin on any error
      router.push('/auth/signin')
    }
  }

  return (
    <AuthContext.Provider value={{ smith, loading, signOut, authMode }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
