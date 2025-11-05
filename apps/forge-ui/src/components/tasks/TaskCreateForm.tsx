'use client';

import { useState, useEffect } from 'react';
import { Loader2, MapPin, Calendar, AlertCircle } from 'lucide-react';
import { TaskType, TaskPriority, type TaskInput } from '@/types/task';
import { getFleets, getRobots } from '@/lib/graphql';

interface TaskCreateFormProps {
  onSubmit: (fleetId: string, taskInput: TaskInput) => Promise<void>;
  onCancel: () => void;
  isSubmitting?: boolean;
  error?: string | null;
}

interface Fleet {
  id: string;
  name: string;
  description?: string;
  status: string;
  robots: Array<{
    id: string;
    name: string;
    status: string;
    batteryLevel?: number;
  }>;
}

export function TaskCreateForm({
  onSubmit,
  onCancel,
  isSubmitting = false,
  error = null,
}: TaskCreateFormProps) {
  const [fleets, setFleets] = useState<Fleet[]>([]);
  const [loadingFleets, setLoadingFleets] = useState(true);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<{
    fleetId: string;
    name: string;
    description: string;
    type: TaskType;
    priority: TaskPriority;
    scheduledAt: string;
    parameters: Record<string, any>;
  }>({
    fleetId: '',
    name: '',
    description: '',
    type: TaskType.PATROL,
    priority: TaskPriority.NORMAL,
    scheduledAt: '',
    parameters: {},
  });

  // Load fleets on component mount
  useEffect(() => {
    const loadFleets = async () => {
      try {
        setLoadingFleets(true);
        const data = await getFleets();
        setFleets(data);

        // Auto-select first fleet if available
        if (data.length > 0 && !formData.fleetId) {
          setFormData(prev => ({ ...prev, fleetId: data[0].id }));
        }
      } catch (err) {
        console.error('Failed to load fleets:', err);
      } finally {
        setLoadingFleets(false);
      }
    };

    loadFleets();
  }, []);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Task name is required';
    } else if (formData.name.trim().length < 3) {
      errors.name = 'Task name must be at least 3 characters';
    }

    if (!formData.fleetId) {
      errors.fleetId = 'Please select a fleet';
    }

    if (!formData.type) {
      errors.type = 'Please select a task type';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const taskInput: TaskInput = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      type: formData.type,
      priority: formData.priority,
      scheduledAt: formData.scheduledAt || undefined,
      parameters: formData.parameters,
    };

    await onSubmit(formData.fleetId, taskInput);
  };

  const selectedFleet = fleets.find(f => f.id === formData.fleetId);
  const availableRobots = selectedFleet?.robots.filter(r =>
    r.status === 'IDLE' || r.status === 'WORKING'
  ) || [];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Fleet Selection */}
      <div>
        <label htmlFor="fleet" className="block text-sm font-medium text-gray-700 mb-2">
          Fleet / Robot Selection *
        </label>
        <select
          id="fleet"
          value={formData.fleetId}
          onChange={(e) => {
            setFormData({ ...formData, fleetId: e.target.value });
            setValidationErrors({ ...validationErrors, fleetId: '' });
          }}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
            validationErrors.fleetId ? 'border-red-300' : 'border-gray-300'
          }`}
          disabled={isSubmitting || loadingFleets}
        >
          <option value="">
            {loadingFleets ? 'Loading fleets...' : 'Select a fleet'}
          </option>
          {fleets.map((fleet) => (
            <option key={fleet.id} value={fleet.id}>
              {fleet.name} ({fleet.robots.length} robots, {fleet.status})
            </option>
          ))}
        </select>
        {validationErrors.fleetId && (
          <p className="mt-1 text-sm text-red-600">{validationErrors.fleetId}</p>
        )}
        {selectedFleet && (
          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              {availableRobots.length} robot(s) available in {selectedFleet.name}
            </p>
            {availableRobots.length === 0 && (
              <p className="text-xs text-blue-600 mt-1">
                No robots currently available. Task will be queued.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Task Name */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
          Task Name *
        </label>
        <input
          type="text"
          id="name"
          value={formData.name}
          onChange={(e) => {
            setFormData({ ...formData, name: e.target.value });
            setValidationErrors({ ...validationErrors, name: '' });
          }}
          placeholder="e.g., Warehouse Patrol Route A"
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
            validationErrors.name ? 'border-red-300' : 'border-gray-300'
          }`}
          disabled={isSubmitting}
          autoFocus
        />
        {validationErrors.name && (
          <p className="mt-1 text-sm text-red-600">{validationErrors.name}</p>
        )}
      </div>

      {/* Task Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Describe what this task should accomplish..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          disabled={isSubmitting}
        />
      </div>

      {/* Task Type */}
      <div>
        <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
          Task Type *
        </label>
        <select
          id="type"
          value={formData.type}
          onChange={(e) => {
            setFormData({ ...formData, type: e.target.value as TaskType });
            setValidationErrors({ ...validationErrors, type: '' });
          }}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
            validationErrors.type ? 'border-red-300' : 'border-gray-300'
          }`}
          disabled={isSubmitting}
        >
          <option value={TaskType.PATROL}>Patrol</option>
          <option value={TaskType.PICK_AND_PLACE}>Pick and Place</option>
          <option value={TaskType.ASSEMBLY}>Assembly</option>
          <option value={TaskType.INSPECTION}>Inspection</option>
          <option value={TaskType.TRANSPORT}>Transport</option>
          <option value={TaskType.MAINTENANCE}>Maintenance</option>
          <option value={TaskType.CUSTOM}>Custom</option>
        </select>
        {validationErrors.type && (
          <p className="mt-1 text-sm text-red-600">{validationErrors.type}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          Select the type of task to be performed
        </p>
      </div>

      {/* Priority */}
      <div>
        <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-2">
          Priority
        </label>
        <select
          id="priority"
          value={formData.priority}
          onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          disabled={isSubmitting}
        >
          <option value={TaskPriority.LOW}>Low</option>
          <option value={TaskPriority.NORMAL}>Normal</option>
          <option value={TaskPriority.HIGH}>High</option>
          <option value={TaskPriority.URGENT}>Urgent</option>
        </select>
      </div>

      {/* Scheduled Time */}
      <div>
        <label htmlFor="scheduledAt" className="block text-sm font-medium text-gray-700 mb-2">
          <Calendar className="inline w-4 h-4 mr-1" />
          Schedule Time (Optional)
        </label>
        <input
          type="datetime-local"
          id="scheduledAt"
          value={formData.scheduledAt}
          onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          disabled={isSubmitting}
          min={new Date().toISOString().slice(0, 16)}
        />
        <p className="mt-1 text-xs text-gray-500">
          Leave empty to start immediately
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <div>
              <p className="text-sm font-medium text-red-800">Error creating task</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          disabled={isSubmitting}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !formData.name.trim() || !formData.fleetId}
          className="px-6 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating Task...
            </>
          ) : (
            'Create Task'
          )}
        </button>
      </div>
    </form>
  );
}
