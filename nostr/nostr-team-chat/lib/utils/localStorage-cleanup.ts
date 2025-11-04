/**
 * Utility to clean corrupted localStorage data
 */

export function cleanupCorruptedWorkspaces() {
  if (typeof window === 'undefined') return;

  try {
    const workspaceData = localStorage.getItem('workspace-store-clean');
    if (!workspaceData) return;

    const parsed = JSON.parse(workspaceData);
    if (!parsed.state?.workspaces) return;

    let hasCorruption = false;
    const cleanedWorkspaces = parsed.state.workspaces.filter((workspace: any) => {
      // Check for corrupted workspace IDs (containing URLs or special characters)
      if (!workspace.id) {
        console.warn('🧹 Found workspace without ID, removing');
        hasCorruption = true;
        return false;
      }

      // Check for URL contamination in workspace ID
      if (workspace.id.includes('.') || workspace.id.includes("'") || workspace.id.includes('/')) {
        console.warn('🧹 Found corrupted workspace ID, removing:', workspace.id);
        hasCorruption = true;
        return false;
      }

      // Check for valid alphanumeric format
      if (!/^[a-zA-Z0-9_-]+$/.test(workspace.id)) {
        console.warn('🧹 Found invalid workspace ID format, removing:', workspace.id);
        hasCorruption = true;
        return false;
      }

      return true;
    });

    if (hasCorruption) {
      console.log('🧹 Cleaning corrupted workspace data');

      // Update localStorage with cleaned data
      const cleanedData = {
        ...parsed,
        state: {
          ...parsed.state,
          workspaces: cleanedWorkspaces,
          currentWorkspaceId: null // Reset current workspace
        }
      };

      localStorage.setItem('workspace-store-clean', JSON.stringify(cleanedData));
      console.log('✅ Workspace data cleaned');
    }
  } catch (error) {
    console.warn('⚠️ Failed to clean workspace data, clearing completely:', error);
    localStorage.removeItem('workspace-store-clean');
  }
}

export function cleanupCorruptedChatStore() {
  if (typeof window === 'undefined') return;

  try {
    const chatData = localStorage.getItem('chat-storage');
    if (!chatData) return;

    const parsed = JSON.parse(chatData);
    if (!parsed.state) return;

    let needsCleaning = false;

    // Check if currentWorkspaceId is corrupted
    if (parsed.state.currentWorkspaceId &&
        (parsed.state.currentWorkspaceId.includes('.') ||
         parsed.state.currentWorkspaceId.includes("'") ||
         !/^[a-zA-Z0-9_-]*$/.test(parsed.state.currentWorkspaceId))) {
      console.warn('🧹 Found corrupted currentWorkspaceId in chat store:', parsed.state.currentWorkspaceId);
      needsCleaning = true;
    }

    // Check if currentChannelId is corrupted
    if (parsed.state.currentChannelId &&
        parsed.state.currentChannelId.includes("'")) {
      console.warn('🧹 Found corrupted currentChannelId in chat store:', parsed.state.currentChannelId);
      needsCleaning = true;
    }

    if (needsCleaning) {
      console.log('🧹 Cleaning corrupted chat store data');

      const cleanedData = {
        ...parsed,
        state: {
          ...parsed.state,
          currentWorkspaceId: '',
          currentChannelId: null,
          isNavigating: false,
          isLoadingWorkspace: false,
          isLoadingChannel: false
        }
      };

      localStorage.setItem('chat-storage', JSON.stringify(cleanedData));
      console.log('✅ Chat store data cleaned');
    }
  } catch (error) {
    console.warn('⚠️ Failed to clean chat store data, clearing completely:', error);
    localStorage.removeItem('chat-storage');
  }
}