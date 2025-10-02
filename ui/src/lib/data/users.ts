export type User = {
  id: string | number
  name: string
  image: string
  email: string
}

export type ChatMembership = {
  chatId: string
  userId: string | number
  isAccepted: boolean
}

export const projectUsers: User[] = [
  { id: 1, name: "Alice", image: "https://i.pravatar.cc/150?img=1", email: "alice@teamz.com" },
  { id: 2, name: "Bob", image: "https://i.pravatar.cc/150?img=2", email: "bob@teamz.com" },
  { id: 3, name: "Charlie", image: "https://i.pravatar.cc/150?img=3", email: "charlie@teamz.com" },
  { id: 4, name: "Diana", image: "https://i.pravatar.cc/150?img=4", email: "diana@teamz.com" },
  { id: 5, name: "Eve", image: "https://i.pravatar.cc/150?img=5", email: "eve@teamz.com" },
  { id: 6, name: "Frank", image: "https://i.pravatar.cc/150?img=6", email: "frank@teamz.com" },
  { id: 7, name: "Grace", image: "https://i.pravatar.cc/150?img=7", email: "grace@teamz.com" },
  { id: 8, name: "Hank", image: "https://i.pravatar.cc/150?img=8", email: "hank@teamz.com" },
]

export const chatMemberships: ChatMembership[] = [
  { chatId: "chat-1", userId: 1, isAccepted: true },
  { chatId: "chat-1", userId: 2, isAccepted: true },
  { chatId: "chat-1", userId: 3, isAccepted: true },
  { chatId: "chat-1", userId: 4, isAccepted: false },
  { chatId: "chat-1", userId: 5, isAccepted: false },

  { chatId: "chat-2", userId: 1, isAccepted: true },
  { chatId: "chat-2", userId: 2, isAccepted: true },
  { chatId: "chat-2", userId: 3, isAccepted: true },
  { chatId: "chat-2", userId: 4, isAccepted: true },
  { chatId: "chat-2", userId: 5, isAccepted: true },
  { chatId: "chat-2", userId: 6, isAccepted: false },
  { chatId: "chat-2", userId: 7, isAccepted: false },

  { chatId: "chat-3", userId: 1, isAccepted: true },
  { chatId: "chat-3", userId: 2, isAccepted: true },
  { chatId: "chat-3", userId: 6, isAccepted: true },
  { chatId: "chat-3", userId: 7, isAccepted: true },
  { chatId: "chat-3", userId: 3, isAccepted: false },
  { chatId: "chat-3", userId: 4, isAccepted: false },

  { chatId: "chat-4", userId: 1, isAccepted: true },
  { chatId: "chat-4", userId: 8, isAccepted: true },
  { chatId: "chat-4", userId: 3, isAccepted: false },

  { chatId: "chat-5", userId: 2, isAccepted: true },
  { chatId: "chat-5", userId: 4, isAccepted: true },
  { chatId: "chat-5", userId: 6, isAccepted: true },
  { chatId: "chat-5", userId: 1, isAccepted: false },
  { chatId: "chat-5", userId: 5, isAccepted: false },

  { chatId: "chat-6", userId: 1, isAccepted: true },
  { chatId: "chat-6", userId: 2, isAccepted: true },
  { chatId: "chat-6", userId: 3, isAccepted: true },
  { chatId: "chat-6", userId: 4, isAccepted: true },
  { chatId: "chat-6", userId: 5, isAccepted: true },
  { chatId: "chat-6", userId: 6, isAccepted: true },
  { chatId: "chat-6", userId: 7, isAccepted: true },
  { chatId: "chat-6", userId: 8, isAccepted: true },
]

export function getChatUsers(chatId: string) {
  const memberships = chatMemberships.filter(m => m.chatId === chatId)

  const usersWithStatus = projectUsers.map(user => {
    const membership = memberships.find(m => m.userId === user.id)
    return {
      ...user,
      isAccepted: membership?.isAccepted,
      isInvited: membership !== undefined
    }
  })

  return usersWithStatus.sort((a, b) => {
    if (a.isAccepted === true && b.isAccepted !== true) return -1
    if (a.isAccepted !== true && b.isAccepted === true) return 1

    if (a.isInvited && a.isAccepted === false && (!b.isInvited || b.isAccepted === true)) return -1
    if ((!a.isInvited || a.isAccepted === true) && b.isInvited && b.isAccepted === false) return 1

    if (!a.isInvited && b.isInvited) return 1
    if (a.isInvited && !b.isInvited) return -1

    return 0
  })
}
