'use client';

import { useState, useEffect } from 'react';
import { X, CheckCircle } from 'lucide-react';
import { TaskCreateForm } from './TaskCreateForm';
import { dispatchTask, type TaskInput } from '@/lib/graphql';
import { useRouter } from 'next/navigation';

interface TaskCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (taskId: string) => void;
}

export function TaskCreateModal({ isOpen, onClose, onSuccess }: TaskCreateModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, isSubmitting, onClose]);

  const handleSubmit = async (fleetId: string, taskInput: TaskInput) => {
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await dispatchTask(fleetId, taskInput);

      if (response.errors && response.errors.length > 0) {
        setError(response.errors[0].message);
        return;
      }

      if (!response.task) {
        setError('Failed to create task - no data returned');
        return;
      }

      // Show success message
      setSuccessMessage(`Task "${response.task.name}" created successfully!`);

      // Call success callback
      if (onSuccess) {
        onSuccess(response.task.id);
      }

      // Close modal after a brief delay
      setTimeout(() => {
        onClose();
        setSuccessMessage(null);

        // Refresh the page to show new task
        router.refresh();
      }, 1500);
    } catch (err) {
      console.error('Failed to create task:', err);
      setError(err instanceof Error ? err.message : 'Failed to create task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setError(null);
      setSuccessMessage(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={handleClose}
          aria-hidden="true"
        />

        {/* Center modal vertically */}
        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
          &#8203;
        </span>

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          {/* Header */}
          <div className="bg-gradient-to-r from-orange-600 to-orange-500 px-6 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white" id="modal-title">
                Create New Task
              </h3>
              <button
                type="button"
                className="text-white hover:text-gray-200 focus:outline-none"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <p className="text-orange-100 text-sm mt-1">
              Assign a new task to your robot fleet
            </p>
          </div>

          {/* Body */}
          <div className="px-6 py-6">
            {successMessage ? (
              <div className="flex flex-col items-center justify-center py-8">
                <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">Success!</p>
                <p className="text-gray-600">{successMessage}</p>
              </div>
            ) : (
              <TaskCreateForm
                onSubmit={handleSubmit}
                onCancel={handleClose}
                isSubmitting={isSubmitting}
                error={error}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
