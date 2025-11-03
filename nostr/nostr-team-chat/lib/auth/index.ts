// Main auth system exports
export { useAuthStore } from './auth-state-manager';
export { useAuthInit } from './use-auth-init';
export { NostrLoginButton } from '../../components/auth/NostrLoginButton';

// Core services (usually don't need to be imported directly)
export { AuthService } from './auth-service';
export { SessionManager } from './session-manager';
export { CapabilityDetector } from './capability-detector';

// Types
export type {
  AuthMethod,
  AuthState,
  NostrSession,
  AuthResult,
  AuthError,
  NostrCapabilities,
  AuthStateData,
  AuthEvent,
} from './types';