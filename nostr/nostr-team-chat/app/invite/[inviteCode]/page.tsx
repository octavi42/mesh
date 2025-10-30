'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { UserPlus, CheckCircle, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { acceptRelayInvite, getInviteForPage, isWorkspaceMember } from '@/lib/nostr/invites';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';

interface InviteData {
  inviteCode: string;
  groupId: string;
  fullGroupId: string;
  groupName: string;
  inviterPubkey: string;
  inviterName: string;
  targetPubkey: string;
  role: string;
  expiresAt?: number;
  createdAt: number;
  message: string;
}

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const inviteCode = params.inviteCode as string;

  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [status, setStatus] = useState<'loading' | 'found' | 'not-found' | 'expired' | 'already-member' | 'accepting' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  const { pubkey, isAuthenticated } = useAuthStore();
  const { fetchWorkspaces } = useWorkspaceStore();

  // Load invite data from localStorage or relay
  const loadInviteData = useCallback(async () => {
    try {
      setLoading(true);
      setStatus('loading');

      console.log('🔍 Looking for invite:', inviteCode);

      // Use improved invite retrieval function
      const invite = await getInviteForPage(inviteCode);

      if (!invite) {
        console.log('❌ Invite not found:', inviteCode);
        setStatus('not-found');
        return;
      }

      // Check if invite has expired
      if (invite.expiresAt && Date.now() > invite.expiresAt) {
        console.log('⏰ Invite expired:', inviteCode);
        setStatus('expired');
        return;
      }

      console.log('✅ Found invite:', invite);
      setInviteData(invite);

      // Check if user is already a member (if authenticated)
      if (isAuthenticated && pubkey) {
        try {
          const isMember = await isWorkspaceMember(invite.fullGroupId, pubkey);
          if (isMember) {
            console.log('ℹ️ User is already a member of this workspace');
            setStatus('already-member');
            return;
          }
        } catch (error) {
          console.warn('Failed to check membership status:', error);
          // Continue with normal flow if membership check fails
        }
      }

      setStatus('found');

    } catch (error) {
      console.error('❌ Failed to load invite:', error);
      setStatus('error');
      setErrorMessage('Failed to load invitation details');
    } finally {
      setLoading(false);
    }
  }, [inviteCode, isAuthenticated, pubkey]);

  // Accept the invitation
  const handleAcceptInvite = async () => {
    if (!inviteData || !isAuthenticated || !pubkey) {
      setErrorMessage('Please connect your Nostr account first');
      return;
    }

    setAccepting(true);
    setStatus('accepting');

    try {
      console.log('🎯 Accepting invite:', {
        inviteCode: inviteData.inviteCode,
        groupId: inviteData.fullGroupId,
        userPubkey: pubkey
      });

      // Accept the invite via relay
      const { eventId } = await acceptRelayInvite(
        inviteData.fullGroupId,
        inviteData.inviteCode,
        'Accepted invitation from invite link'
      );

      console.log('✅ Invite accepted successfully:', { eventId });

      // Refresh workspaces to get the new workspace
      await fetchWorkspaces();

      setStatus('success');

      // Redirect to the workspace after a brief delay
      setTimeout(() => {
        router.push(`/app/w/${inviteData.fullGroupId}`);
      }, 2000);

    } catch (error) {
      console.error('❌ Failed to accept invite:', error);
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to accept invitation');
    } finally {
      setAccepting(false);
    }
  };

  // Load invite data on mount
  useEffect(() => {
    if (inviteCode) {
      loadInviteData();
    }
  }, [inviteCode, loadInviteData]);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserPlus className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Workspace Invitation
            </h1>
            <p className="text-gray-600 text-sm">
              You&apos;ve been invited to join a Nostr workspace
            </p>
          </div>

          {/* Loading State */}
          {status === 'loading' && (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading invitation details...</p>
            </div>
          )}

          {/* Invite Not Found */}
          {status === 'not-found' && (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Invitation Not Found
              </h3>
              <p className="text-gray-600 mb-6">
                This invitation link is invalid or has been removed.
              </p>
              <button
                onClick={() => router.push('/')}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go to Home
              </button>
            </div>
          )}

          {/* Invite Expired */}
          {status === 'expired' && (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Invitation Expired
              </h3>
              <p className="text-gray-600 mb-6">
                This invitation has expired. Please request a new invitation.
              </p>
              <button
                onClick={() => router.push('/')}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Go to Home
              </button>
            </div>
          )}

          {/* Already Member */}
          {status === 'already-member' && inviteData && (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                You&apos;re Already a Member!
              </h3>
              <p className="text-gray-600 mb-6">
                You&apos;re already a member of <strong>{inviteData.groupName}</strong>. You can access it directly.
              </p>
              <button
                onClick={() => router.push(`/app/w/${inviteData.fullGroupId}`)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                Go to Workspace
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Valid Invite */}
          {status === 'found' && inviteData && (
            <div className="space-y-6">
              {/* Invite Details */}
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Workspace</label>
                  <p className="text-lg font-semibold text-gray-900">{inviteData.groupName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Invited by</label>
                  <p className="text-gray-900">{inviteData.inviterName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Role</label>
                  <p className="text-gray-900 capitalize">{inviteData.role}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Invited on</label>
                  <p className="text-gray-900">{formatDate(inviteData.createdAt)}</p>
                </div>
                {inviteData.expiresAt && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Expires on</label>
                    <p className="text-gray-900">{formatDate(inviteData.expiresAt)}</p>
                  </div>
                )}
              </div>

              {/* Authentication Check */}
              {!isAuthenticated && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800 mb-3">
                    You need to connect your Nostr account to accept this invitation.
                  </p>
                  <button
                    onClick={() => router.push('/app')}
                    className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                  >
                    Connect Nostr Account
                  </button>
                </div>
              )}

              {/* Accept Button */}
              {isAuthenticated && (
                <button
                  onClick={handleAcceptInvite}
                  disabled={accepting}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {accepting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Joining workspace...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-5 h-5" />
                      Accept Invitation
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Accepting State */}
          {status === 'accepting' && (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">Sending join request to the relay...</p>
            </div>
          )}

          {/* Success State */}
          {status === 'success' && (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Welcome to the workspace!
              </h3>
              <p className="text-gray-600 mb-6">
                Your join request has been sent successfully. Redirecting to workspace...
              </p>
              <div className="flex items-center justify-center gap-2 text-blue-600">
                <span className="text-sm">Redirecting</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </div>
          )}

          {/* Error State */}
          {status === 'error' && (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Failed to Accept Invitation
              </h3>
              <p className="text-red-600 text-sm mb-6">
                {errorMessage}
              </p>
              <div className="space-y-3">
                <button
                  onClick={loadInviteData}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={() => router.push('/')}
                  className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Go to Home
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-xs text-gray-500">
            Powered by Nostr Protocol • Decentralized & Censorship Resistant
          </p>
        </div>
      </div>
    </div>
  );
}