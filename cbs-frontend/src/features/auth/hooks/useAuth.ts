import { useAuthStore } from '@/stores/authStore';


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
