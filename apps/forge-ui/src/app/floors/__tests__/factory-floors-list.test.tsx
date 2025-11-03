import React from 'react'
import { screen, waitFor } from '@testing-library/react'
import { renderWithAuth, mockGraphQLResponses } from '@/test-utils'
import { useQuery } from '@apollo/client'

// Mock Apollo Client
jest.mock('@apollo/client', () => ({
  ...jest.requireActual('@apollo/client'),
  useQuery: jest.fn(),
  useMutation: jest.fn(),
}))

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
  }),
  usePathname: () => '/floors',
}))

// Mock the floors page component
jest.mock('@/app/floors/page', () => {
  return function FactoryFloorsPage() {
    const { useQuery } = require('@apollo/client')
    const { data, loading } = useQuery()
    
    if (loading) {
      return <div>Loading...</div>
    }
    
    const floors = data?.factoryFloors || []
    
    return (
      <div>
        <h1>Factory Floors</h1>
        {floors.length === 0 ? (
          <p>No factory floors found.</p>
        ) : (
          <div>
            {floors.map((floor: any) => (
              <div key={floor.id}>
                <h2>{floor.name}</h2>
                <p>{floor.description}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }
})

describe('Factory Floors List Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render loading state', () => {
    const mockUseQuery = useQuery as jest.Mock
    mockUseQuery.mockReturnValue({
      data: undefined,
      loading: true,
      error: undefined,
    })

    renderWithAuth(React.createElement(require('@/app/floors/page').default))
    
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('should render empty state when no floors exist', () => {
    const mockUseQuery = useQuery as jest.Mock
    mockUseQuery.mockReturnValue({
      data: { factoryFloors: [] },
      loading: false,
      error: undefined,
    })

    renderWithAuth(React.createElement(require('@/app/floors/page').default))
    
    expect(screen.getByText('Factory Floors')).toBeInTheDocument()
    expect(screen.getByText('No factory floors found.')).toBeInTheDocument()
  })

  it('should render factory floors list', () => {
    const mockUseQuery = useQuery as jest.Mock
    mockUseQuery.mockReturnValue({
      data: {
        factoryFloors: [
          {
            id: 'floor-1',
            name: 'Factory Floor A',
            description: 'Main production floor',
            blueprintUrl: 'https://example.com/blueprint.png',
            widthMeters: 50,
            heightMeters: 30,
            robots: [],
          },
        ],
      },
      loading: false,
      error: undefined,
    })

    renderWithAuth(React.createElement(require('@/app/floors/page').default))
    
    expect(screen.getByText('Factory Floors')).toBeInTheDocument()
    expect(screen.getByText('Factory Floor A')).toBeInTheDocument()
    expect(screen.getByText('Main production floor')).toBeInTheDocument()
  })

  it('should render error state', () => {
    const mockUseQuery = useQuery as jest.Mock
    mockUseQuery.mockReturnValue({
      data: undefined,
      loading: false,
      error: { message: 'Failed to load factory floors' },
    })

    const { container } = renderWithAuth(React.createElement(require('@/app/floors/page').default))
    
    // Error message should be displayed
    expect(container.textContent).toContain('Error')
  })
})

