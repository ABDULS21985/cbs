import axios from 'axios';
import { toast } from 'sonner';
import type { ApiResponse } from '@/types/common';

export function handleApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiResponse<unknown> | undefined;

    if (data?.message) {
      toast.error(data.message);
      return data.message;
    }

    if (data?.errors) {
      const messages = Object.values(data.errors).flat().join(', ');
      toast.error(`Validation failed: ${messages}`);
      return messages;
    }

    const statusMessages: Record<number, string> = {
      400: 'Invalid request. Please check your input.',
      403: 'You do not have permission for this action.',
      404: 'The requested resource was not found.',
      409: 'Conflict: this record was modified by another user.',
      429: 'Too many requests. Please wait and try again.',
      500: 'Server error. Please try again or contact support.',
      503: 'Service temporarily unavailable. Please try again later.',
    };

    const status = error.response?.status as number | undefined;
    const msg = (status && statusMessages[status]) || 'An unexpected error occurred.';
    toast.error(msg);
    return msg;
  }

  if (error instanceof Error) {
    toast.error(error.message);
    return error.message;
  }

  toast.error('An unexpected error occurred.');
  return 'Unknown error';
}

/** Use in mutation onError callbacks */
export function onMutationError(error: unknown) {
  handleApiError(error);
}
