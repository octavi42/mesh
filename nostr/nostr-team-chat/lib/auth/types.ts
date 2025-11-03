// Core auth types and interfaces

export type AuthMethod = 'extension' | 'local' | 'remote' | 'mobile';

export type AuthState =
  | 'initial'
  | 'checking-capabilities'
  | 'checking-session'
  | 'unauthenticated'
  | 'authenticating'
  | 'authenticated'
  | 'refreshing'
  | 'error';

export interface NostrCapabilities {
  hasExtension: boolean;
  extensionName?: string;
  supportsMobile: boolean;
  availableMethods: AuthMethod[];
}

export interface NostrSession {
  pubkey: string;
  npub?: string;
  authMethod: AuthMethod;
  permissions: string[];
  createdAt: number;
  lastVerifiedAt: number;
  metadata?: {
    name?: string;
    picture?: string;
    nip05?: string;
  };
}

export interface AuthError {
  code: string;
  message: string;
  recoverable: boolean;
  retryable: boolean;
}

export interface AuthResult {
  success: boolean;
  session?: NostrSession;
  error?: AuthError;
}

export interface AuthStateData {
  state: AuthState;
  session: NostrSession | null;
  capabilities: NostrCapabilities | null;
  error: AuthError | null;
  isLoading: boolean;
}

// Event types for state manager
export type AuthEvent =
  | { type: 'CHECK_CAPABILITIES' }
  | { type: 'CHECK_SESSION' }
  | { type: 'LOGIN'; method: AuthMethod }
  | { type: 'LOGIN_SUCCESS'; session: NostrSession }
  | { type: 'LOGIN_ERROR'; error: AuthError }
  | { type: 'LOGOUT' }
  | { type: 'REFRESH_SESSION' }
  | { type: 'REFRESH_SUCCESS'; session: NostrSession }
  | { type: 'REFRESH_ERROR'; error: AuthError }
  | { type: 'SESSION_INVALID' };