import { gql } from '@apollo/client'
import {
  FLEETS_QUERY,
  FLEET_QUERY,
  ROBOTS_QUERY,
  ROBOT_QUERY,
  TASKS_QUERY,
  TASK_QUERY,
} from '../graphql/queries'

describe('GraphQL Queries', () => {
  describe('Fleet Queries', () => {
    it('FLEETS_QUERY should be valid GraphQL', () => {
      expect(() => {
        gql`
          ${FLEETS_QUERY.loc?.source.body}
        `
      }).not.toThrow()
    })

    it('FLEETS_QUERY includes required fields', () => {
      const queryString = FLEETS_QUERY.loc?.source.body || ''
      expect(queryString).toContain('fleets')
      expect(queryString).toContain('id')
      expect(queryString).toContain('name')
      expect(queryString).toContain('robots')
    })

    it('FLEET_QUERY includes streamUrl for robots', () => {
      const queryString = FLEET_QUERY.loc?.source.body || ''
      expect(queryString).toContain('streamUrl')
    })
  })

  describe('Robot Queries', () => {
    it('ROBOTS_QUERY should be valid GraphQL', () => {
      expect(() => {
        gql`
          ${ROBOTS_QUERY.loc?.source.body}
        `
      }).not.toThrow()
    })

    it('ROBOTS_QUERY includes streamUrl', () => {
      const queryString = ROBOTS_QUERY.loc?.source.body || ''
      expect(queryString).toContain('streamUrl')
      expect(queryString).toContain('batteryLevel')
      expect(queryString).toContain('pose')
    })

    it('ROBOT_QUERY includes all robot details', () => {
      const queryString = ROBOT_QUERY.loc?.source.body || ''
      expect(queryString).toContain('robot')
      expect(queryString).toContain('streamUrl')
      expect(queryString).toContain('currentIngot')
    })
  })

  describe('Task Queries', () => {
    it('TASKS_QUERY should be valid GraphQL', () => {
      expect(() => {
        gql`
          ${TASKS_QUERY.loc?.source.body}
        `
      }).not.toThrow()
    })

    it('TASK_QUERY includes run details', () => {
      const queryString = TASK_QUERY.loc?.source.body || ''
      expect(queryString).toContain('runs')
      expect(queryString).toContain('metrics')
      expect(queryString).toContain('logs')
    })
  })
})

