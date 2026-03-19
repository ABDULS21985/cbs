import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workflowApi, type WorkflowTaskFilters, type CompleteTaskPayload } from '../api/workflowApi';

const KEYS = {
  tasks: (filters?: WorkflowTaskFilters) => ['workflow', 'tasks', filters] as const,
  task: (id: string) => ['workflow', 'tasks', id] as const,
};

export function useWorkflowTasks(filters?: WorkflowTaskFilters) {
  return useQuery({
    queryKey: KEYS.tasks(filters),
    queryFn: () => workflowApi.getTasks(filters),
    staleTime: 30_000,
  });
}

export function useWorkflowTask(id: string) {
  return useQuery({
    queryKey: KEYS.task(id),
    queryFn: () => workflowApi.getTask(id),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useCompleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: CompleteTaskPayload }) =>
      workflowApi.completeTask(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workflow', 'tasks'] });
    },
  });
}
