import { useMutation, useQueryClient } from '@tanstack/react-query';
import { maAdvisoryApi } from '../api/maAdvisoryApi';

// ─── Query Keys ───────────────────────────────────────────────────────────────

const KEYS = {
  advisory: {
    all: ['advisory'] as const,
    maEngagements: ['advisory', 'ma-engagements'] as const,
  },
} as const;

// ─── M&A Advisory ────────────────────────────────────────────────────────────

export function useTerminateMaEngagement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (code: string) => maAdvisoryApi.terminate(code),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.advisory.all });
    },
  });
}
