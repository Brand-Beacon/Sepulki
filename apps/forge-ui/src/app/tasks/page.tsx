'use client'

import { RouteGuard } from '@/components/RouteGuard'
import { useAuth } from '@/components/AuthProvider'
import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

function TasksPageContent() {
  const { smith } = useAuth()
  const router = useRouter()
  
  // Mock data - will be replaced with GraphQL queries
  const [tasks] = useState([
    { id: '1', name: 'Pick and Place Demo', status: 'IN_PROGRESS', priority: 'NORMAL', robot: 'WarehouseBot-Demo-02', createdAt: new Date() },
    { id: '2', name: 'Assembly Testing', status: 'PENDING', priority: 'HIGH', robot: 'DevBot-Alpha', createdAt: new Date() },
    { id: '3', name: 'Quality Inspection', status: 'COMPLETED', priority: 'NORMAL', robot: 'DevBot-Beta', createdAt: new Date() },
    { id: '4', name: 'Fleet Patrol', status: 'ASSIGNED', priority: 'LOW', robot: 'WarehouseBot-Demo-01', createdAt: new Date() },
  ])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS': return 'text-green-600 bg-green-100'
      case 'PENDING': return 'text-blue-600 bg-blue-100'
      case 'ASSIGNED': return 'text-orange-600 bg-orange-100'
      case 'COMPLETED': return 'text-gray-600 bg-gray-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'text-red-600 bg-red-100'
      case 'HIGH': return 'text-orange-600 bg-orange-100'
      case 'NORMAL': return 'text-blue-600 bg-blue-100'
      case 'LOW': return 'text-gray-600 bg-gray-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">📋 Task Management</h1>
            <p className="text-gray-600 mt-2">Monitor and manage robot tasks</p>
          </div>
          <div className="flex space-x-4">
            <Link
              href="/tasks/upload"
              className="bg-orange-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-orange-700"
            >
              Upload Program
            </Link>
            <Link
              href="/tasks/new"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700"
            >
              Create Task
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="text-2xl mr-3">📋</div>
            <div>
              <p className="text-sm font-medium text-gray-500">Total Tasks</p>
              <p className="text-2xl font-bold text-gray-900">{tasks.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="text-2xl mr-3">⚡</div>
            <div>
              <p className="text-sm font-medium text-gray-500">In Progress</p>
              <p className="text-2xl font-bold text-gray-900">
                {tasks.filter(t => t.status === 'IN_PROGRESS').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="text-2xl mr-3">⏳</div>
            <div>
              <p className="text-sm font-medium text-gray-500">Pending</p>
              <p className="text-2xl font-bold text-gray-900">
                {tasks.filter(t => t.status === 'PENDING').length}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <div className="text-2xl mr-3">✅</div>
            <div>
              <p className="text-sm font-medium text-gray-500">Completed</p>
              <p className="text-2xl font-bold text-gray-900">
                {tasks.filter(t => t.status === 'COMPLETED').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">All Tasks</h2>
          <div className="space-y-4">
            {tasks.map((task) => (
              <div key={task.id} className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="font-medium text-gray-900">{task.name}</h3>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(task.status)}`}>
                        {task.status}
                      </span>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">Assigned to: {task.robot}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Created: {task.createdAt.toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => router.push(`/robot/${task.robot}/stream`)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      View Stream →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function TasksPage() {
  return (
    <RouteGuard requiresAuth={true} minRole="SMITH">
      <TasksPageContent />
    </RouteGuard>
  )
}

