// Main data layer exports

// Async state utilities
export {
  createInitialAsyncState,
  createAsyncAction,
  shouldRefresh,
  createOptimisticUpdate,
} from './async-state';
export type { AsyncState, AsyncAction, AsyncStateUpdater } from './async-state';

// Repository layer
export { workspaceRepository } from './workspace-repository';
export type { WorkspaceRepository } from './workspace-repository';

// Services
export { NostrDataService } from '../services/nostr-data-service';
export { NostrRelayManager } from '../services/nostr-relay-manager';
export type { CreateWorkspaceParams, WorkspaceUpdates } from '../services/nostr-data-service';
export type { RelaySubscription, RelayConnectionState } from '../services/nostr-relay-manager';

// Coordination
export { DataCoordinator } from '../coordination/data-coordinator';
export type { DataInitializationResult, DataCoordinatorEvents } from '../coordination/data-coordinator';

// Stores
export { useWorkspaceStore, useWorkspaceSelectors } from '../stores/workspace-store-v2';

// Hooks
export { useAppInitialization } from '../hooks/use-app-initialization';