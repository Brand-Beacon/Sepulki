'use client'

interface TaskProgressProps {
  taskName: string
  progress: number
  status: string
}

export function TaskProgress({ taskName, progress, status }: TaskProgressProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-500'
      case 'IN_PROGRESS': return 'bg-blue-500'
      case 'PENDING': return 'bg-yellow-500'
      case 'FAILED': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-900">{taskName}</span>
        <span className="text-sm font-semibold text-gray-900">{progress}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-4">
        <div
          className={`h-4 rounded-full ${getStatusColor(status)} transition-all duration-300`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-500">{status}</span>
      </div>
    </div>
  )
}
