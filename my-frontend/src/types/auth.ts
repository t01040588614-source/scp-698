export interface User {
  id: number;
  email: string;
  username: string;
  fullName?: string | null;
  phone?: string | null;
  birthDate?: string | null;
  phoneVerified?: boolean;
  marketingConsent?: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  username: string;
  fullName?: string;
  password: string;
  phone: string;
  birthDate: string;
  marketingConsent: boolean;
  phoneVerificationToken: string;
  termsVersion?: string;
}

export interface PhoneSendResult {
  phone: string;
  expiresInSec: number;
  message: string;
  delivery?: "sms" | "demo";
  provider?: string;
  devCode?: string;
}

export interface PhoneVerifyResult {
  phone: string;
  verificationToken: string;
  expiresInSec: number;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  refreshToken?: string | null;
}
