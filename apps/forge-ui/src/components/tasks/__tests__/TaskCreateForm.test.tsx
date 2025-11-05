import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskCreateForm } from '../TaskCreateForm';
import { TaskType, TaskPriority } from '@/types/task';
import * as graphqlLib from '@/lib/graphql';

// Mock the graphql module
jest.mock('@/lib/graphql', () => ({
  getFleets: jest.fn(),
  getRobots: jest.fn(),
}));

describe('TaskCreateForm', () => {
  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();

  const mockFleets = [
    {
      id: 'fleet-1',
      name: 'Warehouse Fleet',
      description: 'Main warehouse operations',
      status: 'ACTIVE',
      robots: [
        { id: 'robot-1', name: 'Bot-01', status: 'IDLE', batteryLevel: 85 },
        { id: 'robot-2', name: 'Bot-02', status: 'WORKING', batteryLevel: 60 },
      ],
    },
    {
      id: 'fleet-2',
      name: 'Assembly Fleet',
      description: 'Assembly line robots',
      status: 'ACTIVE',
      robots: [
        { id: 'robot-3', name: 'Assembler-01', status: 'IDLE', batteryLevel: 90 },
      ],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (graphqlLib.getFleets as jest.Mock).mockResolvedValue(mockFleets);
  });

  it('should render the form with all fields', async () => {
    render(
      <TaskCreateForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/fleet \/ robot selection/i)).toBeInTheDocument();
    });

    expect(screen.getByLabelText(/task name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/task type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/priority/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/schedule time/i)).toBeInTheDocument();
  });

  it('should load and display fleets', async () => {
    render(
      <TaskCreateForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    await waitFor(() => {
      expect(graphqlLib.getFleets).toHaveBeenCalled();
    });

    const fleetSelect = screen.getByLabelText(/fleet \/ robot selection/i);
    expect(fleetSelect).toHaveTextContent('Warehouse Fleet');
    expect(fleetSelect).toHaveTextContent('Assembly Fleet');
  });

  it('should show validation error for empty task name', async () => {
    const user = userEvent.setup();

    render(
      <TaskCreateForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/task name/i)).toBeInTheDocument();
    });

    const submitButton = screen.getByRole('button', { name: /create task/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/task name is required/i)).toBeInTheDocument();
    });

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('should show validation error for short task name', async () => {
    const user = userEvent.setup();

    render(
      <TaskCreateForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/task name/i)).toBeInTheDocument();
    });

    const taskNameInput = screen.getByLabelText(/task name/i);
    await user.type(taskNameInput, 'AB');

    const submitButton = screen.getByRole('button', { name: /create task/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/task name must be at least 3 characters/i)).toBeInTheDocument();
    });
  });

  it('should submit form with valid data', async () => {
    const user = userEvent.setup();
    mockOnSubmit.mockResolvedValue(undefined);

    render(
      <TaskCreateForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/task name/i)).toBeInTheDocument();
    });

    // Fill in the form
    const taskNameInput = screen.getByLabelText(/task name/i);
    await user.type(taskNameInput, 'Test Task Name');

    const descriptionInput = screen.getByLabelText(/description/i);
    await user.type(descriptionInput, 'Test description');

    const submitButton = screen.getByRole('button', { name: /create task/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        'fleet-1',
        expect.objectContaining({
          name: 'Test Task Name',
          description: 'Test description',
          type: TaskType.PATROL,
          priority: TaskPriority.NORMAL,
        })
      );
    });
  });

  it('should display available robots count for selected fleet', async () => {
    render(
      <TaskCreateForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/2 robot\(s\) available/i)).toBeInTheDocument();
    });
  });

  it('should call onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <TaskCreateForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('should disable form when isSubmitting is true', async () => {
    render(
      <TaskCreateForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        isSubmitting={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/task name/i)).toBeDisabled();
    });

    expect(screen.getByLabelText(/description/i)).toBeDisabled();
    expect(screen.getByRole('button', { name: /creating task/i })).toBeDisabled();
  });

  it('should display error message when provided', () => {
    const errorMessage = 'Failed to create task';

    render(
      <TaskCreateForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
        error={errorMessage}
      />
    );

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('should allow selecting different task types', async () => {
    const user = userEvent.setup();

    render(
      <TaskCreateForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/task type/i)).toBeInTheDocument();
    });

    const taskTypeSelect = screen.getByLabelText(/task type/i);

    await user.selectOptions(taskTypeSelect, TaskType.ASSEMBLY);
    expect(taskTypeSelect).toHaveValue(TaskType.ASSEMBLY);

    await user.selectOptions(taskTypeSelect, TaskType.INSPECTION);
    expect(taskTypeSelect).toHaveValue(TaskType.INSPECTION);
  });

  it('should allow selecting different priorities', async () => {
    const user = userEvent.setup();

    render(
      <TaskCreateForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/priority/i)).toBeInTheDocument();
    });

    const prioritySelect = screen.getByLabelText(/priority/i);

    await user.selectOptions(prioritySelect, TaskPriority.HIGH);
    expect(prioritySelect).toHaveValue(TaskPriority.HIGH);

    await user.selectOptions(prioritySelect, TaskPriority.URGENT);
    expect(prioritySelect).toHaveValue(TaskPriority.URGENT);
  });
});
