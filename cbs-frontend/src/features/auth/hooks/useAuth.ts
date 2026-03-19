import { useAuthStore } from '@/stores/authStore';
import type { User } from '@/types/auth';

/** Convenience hook for auth state */
export function useAuth() {
  const {
    user, isAuthenticated, isLoading, mfaRequired,
    login, verifyMfa, logout, refreshToken,
  } = useAuthStore();

  return {
    user,
    isAuthenticated,
    isLoading,
    mfaRequired,
    login,
    verifyMfa,
    logout,
    refreshToken,
    isAdmin: user?.roles.includes('CBS_ADMIN') ?? false,
    isOfficer: user?.roles.includes('CBS_OFFICER') ?? false,
  };
}
