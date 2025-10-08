"use client"

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "@/lib/hooks/use-session"
import { acceptChatInvitation } from "@/lib/actions/chat-actions"
import { Button } from "@/components/ui/button"
import { Loader2, Mail, CheckCircle, XCircle } from "lucide-react"

export default function AcceptInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const { data: session, isPending: sessionPending } = useSession()
  const router = useRouter()
  const [invitation, setInvitation] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    async function loadInvitation() {
      if (sessionPending) return

      try {
        const response = await fetch(`/api/invitations/${token}`)
        const data = await response.json()

        if (!response.ok) {
          setError(data.error || 'Invitation not found')
          setLoading(false)
          return
        }

        setInvitation(data)
        setLoading(false)
      } catch (err) {
        setError('Failed to load invitation')
        setLoading(false)
      }
    }

    loadInvitation()
  }, [token, sessionPending])

  const handleAccept = async () => {
    if (!session?.user?.id || !invitation) return

    setAccepting(true)
    try {
      await acceptChatInvitation(token)
      setSuccess(true)

      setTimeout(() => {
        router.push(`/project/${invitation.project_id}/${invitation.chat_id}`)
      }, 1500)
    } catch (err) {
      setError('Failed to accept invitation')
      setAccepting(false)
    }
  }

  const handleDecline = () => {
    router.push('/dashboard')
  }

  if (sessionPending || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 via-white to-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 via-white to-slate-50">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-slate-200 p-8 text-center">
          <Mail className="w-16 h-16 mx-auto mb-4 text-blue-500" />
          <h1 className="text-2xl font-light text-slate-900 mb-2">Sign In Required</h1>
          <p className="text-slate-600 mb-6">Please sign in to accept this chat invitation</p>
          <Button onClick={() => router.push(`/?redirect=/accept-invite/${token}`)} className="w-full">
            Sign In
          </Button>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 via-white to-slate-50">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-slate-200 p-8 text-center">
          <XCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h1 className="text-2xl font-light text-slate-900 mb-2">Invalid Invitation</h1>
          <p className="text-slate-600 mb-6">{error}</p>
          <Button onClick={() => router.push('/dashboard')} variant="outline">
            Go to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 via-white to-slate-50">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-slate-200 p-8 text-center">
          <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
          <h1 className="text-2xl font-light text-slate-900 mb-2">Invitation Accepted!</h1>
          <p className="text-slate-600">Redirecting to chat...</p>
        </div>
      </div>
    )
  }

  if (!invitation) {
    return null
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-slate-200 p-8">
        <Mail className="w-16 h-16 mx-auto mb-4 text-blue-500" />
        <h1 className="text-2xl font-light text-slate-900 mb-2 text-center">Chat Invitation</h1>
        <p className="text-slate-600 mb-6 text-center">
          You've been invited to join <span className="font-semibold">{invitation.chat_name}</span>
        </p>

        <div className="space-y-3">
          <Button
            onClick={handleAccept}
            disabled={accepting}
            className="w-full"
          >
            {accepting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Accepting...
              </>
            ) : (
              'Accept Invitation'
            )}
          </Button>
          <Button
            onClick={handleDecline}
            variant="outline"
            className="w-full"
            disabled={accepting}
          >
            Decline
          </Button>
        </div>
      </div>
    </div>
  )
}
