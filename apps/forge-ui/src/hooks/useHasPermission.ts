'use client'

import { useAuth } from '@/components/AuthProvider'
import { Permission } from '@sepulki/shared-types'

/**
 * Hook to check if the current user has a specific permission
 * @param permission - The permission to check
 * @returns boolean indicating if the user has the permission
 */
export function useHasPermission(permission: Permission): boolean {
  const { smith } = useAuth()

  if (!smith) {
    return false
  }

  // Check if user has the permission directly
  // For now, we'll check based on role since permissions are role-based
  // In the future, this could check smith.permissions array if available
  const rolePermissions: Record<string, Permission[]> = {
    SMITH: [
      Permission.FORGE_SEPULKA,
      Permission.EDIT_SEPULKA,
      Permission.CAST_INGOT,
      Permission.VIEW_FLEET,
      Permission.VIEW_ROBOTS,
      Permission.VIEW_TASKS,
      Permission.CREATE_TASK,
      Permission.VIEW_CATALOG,
      Permission.VIEW_BELLOWS
    ],
    OVER_SMITH: [
      Permission.DELETE_SEPULKA,
      Permission.TEMPER_INGOT,
      Permission.QUENCH_TO_FLEET,
      Permission.RECALL_FLEET,
      Permission.MANAGE_FLEET,
      Permission.MANAGE_ROBOTS,
      Permission.ASSIGN_TASK,
      Permission.CANCEL_TASK,
      Permission.MANAGE_ALLOYS,
      Permission.MANAGE_PATTERNS,
      Permission.VIEW_EDICTS,
      Permission.EXPORT_TELEMETRY,
      ...[
        Permission.FORGE_SEPULKA,
        Permission.EDIT_SEPULKA,
        Permission.CAST_INGOT,
        Permission.VIEW_FLEET,
        Permission.VIEW_ROBOTS,
        Permission.VIEW_TASKS,
        Permission.CREATE_TASK,
        Permission.VIEW_CATALOG,
        Permission.VIEW_BELLOWS
      ]
    ],
    ADMIN: Object.values(Permission)
  }

  const userPermissions = rolePermissions[smith.role] || []
  return userPermissions.includes(permission)
}

