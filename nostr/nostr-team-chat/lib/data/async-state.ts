// Reusable async state management utilities

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  lastFetched: number | null;
}

export interface AsyncAction<T> {
  (): Promise<T>;
}

export type AsyncStateUpdater<T> = (updates: Partial<AsyncState<T>>) => void;

// Initial state factory
export function createInitialAsyncState<T>(): AsyncState<T> {
  return {
    data: null,
    loading: false,
    error: null,
    lastFetched: null,
  };
}

// Reusable async action wrapper
export function createAsyncAction<T>(
  asyncFn: () => Promise<T>,
  setState: AsyncStateUpdater<T>
): () => Promise<T> {
  return async () => {
    setState({ loading: true, error: null });

    try {
      const data = await asyncFn();
      setState({
        data,
        loading: false,
        lastFetched: Date.now(),
        error: null
      });
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState({
        error: errorMessage,
        loading: false
      });
      throw error;
    }
  };
}

// Helper to check if data needs refresh
export function shouldRefresh<T>(
  state: AsyncState<T>,
  maxAge: number = 5 * 60 * 1000 // 5 minutes default
): boolean {
  if (!state.lastFetched) return true;
  return Date.now() - state.lastFetched > maxAge;
}

// Helper to create optimistic updates
export function createOptimisticUpdate<T>(
  currentData: T | null,
  optimisticData: T,
  setState: AsyncStateUpdater<T>
): () => void {
  // Store current state for rollback
  const originalData = currentData;

  // Apply optimistic update
  setState({ data: optimisticData });

  // Return rollback function
  return () => {
    setState({ data: originalData });
  };
}