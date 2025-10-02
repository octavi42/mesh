import { type Chat } from "@/components/sidebar/project-sidebar"

export const chatTitles: Chat[] = [
  { id: 'chat-1', title: 'Project Planning Discussion' },
  { id: 'chat-2', title: 'UI/UX Review' },
  { id: 'chat-3', title: 'Bug Fixes & Updates' },
  { id: 'chat-4', title: 'Team Standup Notes' },
  { id: 'chat-5', title: 'Feature Requirements' },
  { id: 'chat-6', title: 'Performance Optimization' },
  { id: 'chat-7', title: 'Code Review Session' },
  { id: 'chat-8', title: 'Design System Updates' },
  { id: 'chat-9', title: 'Testing Strategy' },
  { id: 'chat-10', title: 'Deployment Pipeline' },
]

interface Message {
  id: string
  text: string
  userId: string
  userName: string
  avatarUrl: string
  timestamp: string
  createdAt: Date
  isLlm?: boolean
  isStreaming?: boolean
  user?: {
    id: string | number
    name?: string
    image: string
    isAccepted?: boolean
    isInvited?: boolean
    integrations?: any[]
  }
}

export const chatMessages: Record<string, Message[]> = {
  'chat-1': [
    {
      id: "1",
      text: "Hey team! Let's discuss the project timeline.",
      userId: "user-2",
      userName: "Sarah Johnson",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
      timestamp: "9:00 AM",
      createdAt: new Date(Date.now() - 1000 * 60 * 120),
      user: {
        id: "user-2",
        name: "Sarah Johnson",
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
        isAccepted: true,
        integrations: []
      }
    },
    {
      id: "2",
      text: "What are the main milestones?",
      userId: "user-2",
      userName: "Sarah Johnson",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
      timestamp: "9:00 AM",
      createdAt: new Date(Date.now() - 1000 * 60 * 119.5),
      user: {
        id: "user-2",
        name: "Sarah Johnson",
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
        isAccepted: true,
        integrations: []
      }
    },
    {
      id: "3",
      text: "Based on the current scope, here are the key milestones:\n\n1. Phase 1: User Authentication (2 weeks)\n2. Phase 2: Core Features (4 weeks)\n3. Phase 3: Testing & QA (2 weeks)\n4. Phase 4: Deployment (1 week)\n\nTotal estimated timeline: 9 weeks",
      userId: "ai-assistant",
      userName: "AI Assistant",
      avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=AI",
      timestamp: "9:01 AM",
      createdAt: new Date(Date.now() - 1000 * 60 * 119),
      isLlm: true,
      isStreaming: false
    },
    {
      id: "4",
      text: "That looks reasonable. I agree with the timeline.",
      userId: "current-user",
      userName: "You",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=You",
      timestamp: "9:02 AM",
      createdAt: new Date(Date.now() - 1000 * 60 * 118),
      user: {
        id: "current-user",
        name: "You",
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=You",
        isAccepted: true,
        integrations: []
      }
    }
  ],
  'chat-2': [
    {
      id: "1",
      text: "The new UI mockups are ready for review!",
      userId: "user-3",
      userName: "Mike Chen",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mike",
      timestamp: "11:30 AM",
      createdAt: new Date(Date.now() - 1000 * 60 * 60),
      user: {
        id: "user-3",
        name: "Mike Chen",
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mike",
        isAccepted: true,
        integrations: []
      }
    },
    {
      id: "2",
      text: "Great! Let me take a look.",
      userId: "current-user",
      userName: "You",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=You",
      timestamp: "11:31 AM",
      createdAt: new Date(Date.now() - 1000 * 60 * 59),
      user: {
        id: "current-user",
        name: "You",
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=You",
        isAccepted: true,
        integrations: []
      }
    },
    {
      id: "3",
      text: "I really like the color scheme",
      userId: "current-user",
      userName: "You",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=You",
      timestamp: "11:31 AM",
      createdAt: new Date(Date.now() - 1000 * 60 * 58.5),
      user: {
        id: "current-user",
        name: "You",
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=You",
        isAccepted: true,
        integrations: []
      }
    },
    {
      id: "4",
      text: "And the layout is very clean",
      userId: "current-user",
      userName: "You",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=You",
      timestamp: "11:31 AM",
      createdAt: new Date(Date.now() - 1000 * 60 * 58),
      user: {
        id: "current-user",
        name: "You",
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=You",
        isAccepted: true,
        integrations: []
      }
    },
    {
      id: "5",
      text: "Thanks! I focused on making it user-friendly and accessible.",
      userId: "user-3",
      userName: "Mike Chen",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mike",
      timestamp: "11:32 AM",
      createdAt: new Date(Date.now() - 1000 * 60 * 57),
      user: {
        id: "user-3",
        name: "Mike Chen",
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mike",
        isAccepted: true,
        integrations: []
      }
    }
  ],
  'chat-3': [
    {
      id: "1",
      text: "I found a critical bug in the login flow",
      userId: "user-4",
      userName: "Emily Davis",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emily",
      timestamp: "2:15 PM",
      createdAt: new Date(Date.now() - 1000 * 60 * 30),
      user: {
        id: "user-4",
        name: "Emily Davis",
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emily",
        isAccepted: true,
        integrations: []
      }
    },
    {
      id: "2",
      text: "Can you describe the issue?",
      userId: "ai-assistant",
      userName: "AI Assistant",
      avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=AI",
      timestamp: "2:15 PM",
      createdAt: new Date(Date.now() - 1000 * 60 * 29),
      isLlm: true,
      isStreaming: false
    },
    {
      id: "3",
      text: "Users can't reset their password. The email isn't being sent.",
      userId: "user-4",
      userName: "Emily Davis",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emily",
      timestamp: "2:16 PM",
      createdAt: new Date(Date.now() - 1000 * 60 * 28),
      user: {
        id: "user-4",
        name: "Emily Davis",
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emily",
        isAccepted: true,
        integrations: []
      }
    },
    {
      id: "4",
      text: "I'll look into this right away",
      userId: "current-user",
      userName: "You",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=You",
      timestamp: "2:17 PM",
      createdAt: new Date(Date.now() - 1000 * 60 * 27),
      user: {
        id: "current-user",
        name: "You",
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=You",
        isAccepted: true,
        integrations: []
      }
    },
    {
      id: "5",
      text: "Thanks!",
      userId: "current-user",
      userName: "You",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=You",
      timestamp: "2:17 PM",
      createdAt: new Date(Date.now() - 1000 * 60 * 26.5),
      user: {
        id: "current-user",
        name: "You",
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=You",
        isAccepted: true,
        integrations: []
      }
    }
  ],
  'chat-4': [
    {
      id: "1",
      text: "Good morning team! Daily standup time.",
      userId: "user-2",
      userName: "Sarah Johnson",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
      timestamp: "10:00 AM",
      createdAt: new Date(Date.now() - 1000 * 60 * 90),
      user: {
        id: "user-2",
        name: "Sarah Johnson",
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
        isAccepted: true,
        integrations: []
      }
    },
    {
      id: "2",
      text: "I completed the authentication module yesterday. Today I'm working on the user profile page.",
      userId: "current-user",
      userName: "You",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=You",
      timestamp: "10:01 AM",
      createdAt: new Date(Date.now() - 1000 * 60 * 89),
      user: {
        id: "current-user",
        name: "You",
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=You",
        isAccepted: true,
        integrations: []
      }
    },
    {
      id: "3",
      text: "Great progress! Keep it up.",
      userId: "user-3",
      userName: "Mike Chen",
      avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mike",
      timestamp: "10:02 AM",
      createdAt: new Date(Date.now() - 1000 * 60 * 88),
      user: {
        id: "user-3",
        name: "Mike Chen",
        image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mike",
        isAccepted: true,
        integrations: []
      }
    }
  ],
  'chat-5': [
    {
      id: "1",
      text: "Analyzing the feature requirements...",
      userId: "ai-assistant",
      userName: "AI Assistant",
      avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=AI",
      timestamp: "3:00 PM",
      createdAt: new Date(Date.now() - 1000 * 60 * 5),
      isLlm: true,
      isStreaming: true
    }
  ]
}