// Global sidebar state that persists across route changes
// Global state to persist across all re-imports and route changes
declare global {
  var __SIDEBAR_STORE__: {
    isOpen: boolean
    listeners: Set<(isOpen: boolean) => void>
    isHydrated: boolean
    isInitialized: boolean
  } | undefined
}

class SidebarStore {
  private get globalState() {
    if (typeof window !== 'undefined') {
      if (!globalThis.__SIDEBAR_STORE__) {
        globalThis.__SIDEBAR_STORE__ = {
          isOpen: false,
          listeners: new Set(),
          isHydrated: false,
          isInitialized: false
        }
      }
      return globalThis.__SIDEBAR_STORE__
    }
    // SSR fallback
    return {
      isOpen: false,
      listeners: new Set<(isOpen: boolean) => void>(),
      isHydrated: false,
      isInitialized: false
    }
  }

  constructor() {
    // Initialize global state if needed
    this.globalState
  }

  private initialize(): void {
    const state = this.globalState
    if (!state.isInitialized && typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('sidebarOpen')
      state.isOpen = saved === 'true'
      state.isInitialized = true
    }
  }

  getIsOpen(): boolean {
    this.initialize() // Ensure initialized before returning state
    return this.globalState.isOpen
  }

  setIsOpen(isOpen: boolean, saveToStorage: boolean = true): void {
    const state = this.globalState
    state.isOpen = isOpen
    if (typeof window !== 'undefined' && saveToStorage) {
      sessionStorage.setItem('sidebarOpen', isOpen.toString())
    }
    state.listeners.forEach(listener => listener(isOpen))
  }

  setIsOpenExplicit(isOpen: boolean): void {
    this.setIsOpen(isOpen, true)
  }

  subscribe(listener: (isOpen: boolean) => void): () => void {
    const state = this.globalState
    state.listeners.add(listener)
    return () => state.listeners.delete(listener)
  }

  hydrate(): void {
    const state = this.globalState
    if (typeof window !== 'undefined' && !state.isHydrated) {
      this.initialize() // Ensure initialized
      state.isHydrated = true
      // Notify listeners of current state
      state.listeners.forEach(listener => listener(state.isOpen))
    }
  }

  getIsHydrated(): boolean {
    return this.globalState.isHydrated
  }
}

export const sidebarStore = new SidebarStore()