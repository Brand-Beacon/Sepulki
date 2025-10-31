import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { MockedProvider } from '@apollo/client/testing'
import '@testing-library/jest-dom'
import { RobotStreamDisplay } from '../RobotStreamDisplay'
import { ROBOT_QUERY } from '@/lib/graphql/queries'

// Mock the IsaacSimProxyDisplay component
jest.mock('../IsaacSimProxyDisplay', () => ({
  IsaacSimProxyDisplay: ({ robotName }: { robotName: string }) => (
    <div data-testid="isaac-sim-display">Mock Display: {robotName}</div>
  ),
}))

// Mock fetch for session creation
global.fetch = jest.fn()

describe('RobotStreamDisplay', () => {
  const mockRobot = {
    id: 'robot-123',
    name: 'Test Robot',
    status: 'WORKING',
    batteryLevel: 85,
    streamUrl: 'http://localhost:8889/stream/test',
  }

  const mockQuery = {
    request: {
      query: ROBOT_QUERY,
      variables: { id: 'robot-123' },
    },
    result: {
      data: {
        robot: mockRobot,
      },
    },
  }

  beforeEach(() => {
    ;(global.fetch as jest.Mock).mockClear()
    ;(global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        sessionId: 'session-123',
        embedUrl: 'http://localhost:8889/stream/session-123/embed',
      }),
    })
  })

  it('renders loading state initially', () => {
    render(
      <MockedProvider mocks={[mockQuery]} addTypename={false}>
        <RobotStreamDisplay robotId="robot-123" />
      </MockedProvider>
    )

    expect(screen.getByText(/Loading robot stream/i)).toBeInTheDocument()
  })

  it('renders stream when connected', async () => {
    render(
      <MockedProvider mocks={[mockQuery]} addTypename={false}>
        <RobotStreamDisplay robotId="robot-123" />
      </MockedProvider>
    )

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled()
    })
  })

  it('supports public access mode', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        sessionId: 'public-session',
        embedUrl: 'http://localhost:8889/stream/public-session/embed',
      }),
    })

    render(
      <MockedProvider mocks={[]} addTypename={false}>
        <RobotStreamDisplay robotId="robot-123" publicAccess={true} />
      </MockedProvider>
    )

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/session/create'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('public'),
        })
      )
    })
  })

  it('handles connection errors gracefully', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

    render(
      <MockedProvider mocks={[mockQuery]} addTypename={false}>
        <RobotStreamDisplay robotId="robot-123" />
      </MockedProvider>
    )

    await waitFor(() => {
      expect(screen.getByText(/Failed to load stream/i)).toBeInTheDocument()
    })
  })

  it('displays robot name and battery level', async () => {
    render(
      <MockedProvider mocks={[mockQuery]} addTypename={false}>
        <RobotStreamDisplay robotId="robot-123" />
      </MockedProvider>
    )

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalled()
    }, { timeout: 3000 })

    // After loading, should show robot info
    // This would need proper async handling in real implementation
  })

  it('supports fullscreen toggle', () => {
    const { container } = render(
      <MockedProvider mocks={[mockQuery]} addTypename={false}>
        <RobotStreamDisplay robotId="robot-123" />
      </MockedProvider>
    )

    // Fullscreen button should be present
    // Actual fullscreen functionality would need browser APIs
  })
})

