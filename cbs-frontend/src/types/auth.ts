export interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  roles: string[];
  permissions: string[];
  branchId?: number;
  branchName?: string;
  customerId?: number;
  lastLogin?: string;
  avatarUrl?: string;
  preferred_username?: string;
  displayName?: string;
}

export interface LoginRequest {
  username?: string;
  password?: string;
  returnTo?: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  mfaRequired: boolean;
  mfaSessionToken?: string;
  user?: User;
  expiresIn: number; // seconds
}

export interface MfaVerifyRequest {
  sessionToken: string;
  otpCode: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthorizationCodeCallbackRequest {
  code: string;
  state: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface PasswordStrength {
  score: number; // 0-4
  label: 'Very Weak' | 'Weak' | 'Fair' | 'Strong' | 'Very Strong';
  checks: {
    minLength: boolean;
    hasUppercase: boolean;
    hasLowercase: boolean;
    hasDigit: boolean;
    hasSpecial: boolean;
  };
}
