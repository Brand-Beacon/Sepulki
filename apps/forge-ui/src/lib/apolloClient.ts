import { ApolloClient, InMemoryCache, createHttpLink, split } from '@apollo/client'
import { setContext } from '@apollo/client/link/context'
import { GraphQLWsLink } from '@apollo/client/link/subscriptions'
import { getMainDefinition } from '@apollo/client/utilities'
import { createClient } from 'graphql-ws'

// HTTP link for queries and mutations
const httpLink = createHttpLink({
  uri: process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:4000/graphql',
})

// WebSocket link for subscriptions
const wsLink = typeof window !== 'undefined' ? new GraphQLWsLink(
  createClient({
    url: process.env.NEXT_PUBLIC_GRAPHQL_WS_URL || 'ws://localhost:4000/graphql',
    connectionParams: () => {
      // Get smith from AuthProvider context and generate token
      let token: string | null = null;
      if (typeof window !== 'undefined') {
        const authData = (window as any).__SEPULKI_AUTH__;
        const smith = authData?.smith;
        
        if (smith) {
          const header = { alg: 'HS256', typ: 'JWT' };
          const payload = {
            sub: smith.id,
            email: smith.email,
            name: smith.name,
            role: smith.role,
            sessionId: 'mock-session-001',
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60)
          };
          
          const encodedHeader = btoa(JSON.stringify(header));
          const encodedPayload = btoa(JSON.stringify(payload));
          const signature = 'mock-signature-for-development';
          
          token = `${encodedHeader}.${encodedPayload}.${signature}`;
        }
      }
      
      return {
        authorization: token ? `Bearer ${token}` : '',
      }
    },
  })
) : null

// Auth link to add token to requests
const authLink = setContext((_, { headers }) => {
  // Get smith from AuthProvider context
  let token: string | null = null;
  if (typeof window !== 'undefined') {
    const authData = (window as any).__SEPULKI_AUTH__;
    const smith = authData?.smith;
    
    if (smith) {
      // Generate JWT token using the same format as the local auth service
      // This matches what the backend expects for development
      const header = { alg: 'HS256', typ: 'JWT' };
      const payload = {
        sub: smith.id,
        email: smith.email,
        name: smith.name,
        role: smith.role,
        sessionId: 'mock-session-001', // Use mock session ID for development compatibility
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
      };
      
      const encodedHeader = btoa(JSON.stringify(header));
      const encodedPayload = btoa(JSON.stringify(payload));
      const signature = 'mock-signature-for-development';
      
      token = `${encodedHeader}.${encodedPayload}.${signature}`;
    }
  }

  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  }
})

// Split link to use WebSocket for subscriptions and HTTP for queries/mutations
const splitLink = typeof window !== 'undefined' && wsLink
  ? split(
      ({ query }) => {
        const definition = getMainDefinition(query)
        return (
          definition.kind === 'OperationDefinition' &&
          definition.operation === 'subscription'
        )
      },
      wsLink,
      authLink.concat(httpLink)
    )
  : authLink.concat(httpLink)

// Create Apollo Client
export const apolloClient = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
    },
    query: {
      fetchPolicy: 'network-only',
    },
  },
})

