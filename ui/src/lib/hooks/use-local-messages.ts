import { useLiveQuery } from 'dexie-react-hooks'
import { db, type LocalMessage } from '@/lib/db/local-db'

export function useLocalMessages(chatId: string) {
  return useLiveQuery(
    () => db.messages
      .where('chatId')
      .equals(chatId)
      .sortBy('createdAt'),
    [chatId]
  )
}

export async function addLocalMessage(message: LocalMessage) {
  try {
    return await db.messages.add(message)
  } catch (error) {
    if (error instanceof Error && error.name === 'ConstraintError') {
      return await db.messages.put(message)
    }
    throw error
  }
}

export async function updateLocalMessage(id: string, updates: Partial<LocalMessage>) {
  return await db.messages.update(id, updates)
}

export async function deleteLocalMessage(id: string) {
  return await db.messages.delete(id)
}

export async function markMessageAsSynced(id: string) {
  return await db.messages.update(id, { syncedToServer: true })
}

export async function getUnsyncedMessages(chatId: string) {
  return await db.messages
    .where('chatId')
    .equals(chatId)
    .and(msg => !msg.syncedToServer)
    .toArray()
}
