import { useMutation, useQueryClient } from '@tanstack/react-query';
import { agreementsApi } from '../api/agreementExtApi';

// ─── Query Keys ───────────────────────────────────────────────────────────────

const KEYS = {
  agreements: {
    all: ['agreements'] as const,
  },
} as const;

// ─── Agreements ──────────────────────────────────────────────────────────────

export function useActivateAgreement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (number: string) => agreementsApi.activate(number),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEYS.agreements.all });
    },
  });
}
