import Dexie, { type EntityTable } from 'dexie'

export interface LocalMessage {
  id: string
  chatId: string
  userId: string
  userName: string
  avatarUrl: string
  content: string
  isLlm: boolean
  isStreaming?: boolean
  timestamp: string
  createdAt: Date
  syncedToServer: boolean
  tempId?: string
}

export interface LocalChat {
  id: string
  projectId: string
  name: string
  createdAt: Date
  updatedAt: Date
  syncedToServer: boolean
}

export interface LocalProject {
  id: string
  name: string
  description?: string
  createdAt: Date
  syncedToServer: boolean
}

const db = new Dexie('teamz-local') as Dexie & {
  messages: EntityTable<LocalMessage, 'id'>
  chats: EntityTable<LocalChat, 'id'>
  projects: EntityTable<LocalProject, 'id'>
}

db.version(1).stores({
  messages: 'id, chatId, userId, createdAt, syncedToServer',
  chats: 'id, projectId, createdAt, syncedToServer',
  projects: 'id, createdAt, syncedToServer'
})

export { db }
