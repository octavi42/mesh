import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db/schema';

export function useChannels(workspaceId: string | null) {
  return useLiveQuery(
    () => {
      if (!workspaceId) return [];
      return db.channels.where('workspaceId').equals(workspaceId).toArray();
    },
    [workspaceId],
    []
  );
}

export function useChannel(channelId: string | null) {
  return useLiveQuery(
    () => {
      if (!channelId) return null;
      return db.channels.get(channelId);
    },
    [channelId],
    null
  );
}
