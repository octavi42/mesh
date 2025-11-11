'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Zap, CheckCircle, AlertCircle, Loader2, ArrowRight, UserPlus } from 'lucide-react';
import { acceptRelayInvite, isWorkspaceAdmin } from '@/lib/nostr/invites';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';

interface PreAuthData {
  code: string;
  groupId: string;
  fullGroupId: string;
  groupName: string;
  createdAt: number;
  expiresAt?: number;
  createdBy: string;
  isPreauth: boolean;
  eventId: string;
}

export default function JoinPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const groupId = params.groupId as string;
  const preAuthCode = searchParams.get('code');

  const [preAuthData, setPreAuthData] = useState<PreAuthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [status, setStatus] = useState<'loading' | 'found' | 'not-found' | 'expired' | 'already-member' | 'joining' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  const { pubkey, isAuthenticated } = useAuthStore();
  const { fetchWorkspaces } = useWorkspaceStore();

  // Load preauth data from localStorage
  const loadPreAuthData = useCallback(async () => {
    try {
      setLoading(true);
      setStatus('loading');

      console.log('🔍 Looking for preauth invite:', { groupId, preAuthCode });

      if (!preAuthCode) {
        console.log('❌ No preauth code provided');
        setStatus('not-found');
        return;
      }

      // Check localStorage for preauth invites
      const existingPreauths = JSON.parse(localStorage.getItem('nip29_preauth_invites') || '[]');
      const preAuth = existingPreauths.find((inv: PreAuthData) =>
        inv.code === preAuthCode && (inv.groupId === groupId || inv.fullGroupId === groupId)
      );

      if (!preAuth) {
        console.log('❌ Preauth invite not found:', { groupId, preAuthCode });
        setStatus('not-found');
        return;
      }

      // Check if preauth has expired
      if (preAuth.expiresAt && Date.now() > preAuth.expiresAt) {
        console.log('⏰ Preauth invite expired:', preAuthCode);
        setStatus('expired');
        return;
      }

      console.log('✅ Found preauth invite:', preAuth);
      setPreAuthData(preAuth);

      // Check if user is already a member (if authenticated)
      if (isAuthenticated && pubkey) {
        try {
          const isMember = await isWorkspaceAdmin(preAuth.fullGroupId, pubkey);
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
      console.error('❌ Failed to load preauth invite:', error);
      setStatus('error');
      setErrorMessage('Failed to load invitation details');
    } finally {
      setLoading(false);
    }
  }, [groupId, preAuthCode, isAuthenticated, pubkey]);

  // Auto-join with preauth code
  const handleAutoJoin = async () => {
    if (!preAuthData || !isAuthenticated || !pubkey || !preAuthCode) {
      setErrorMessage('Please connect your Nostr account first');
      return;
    }

    setJoining(true);
    setStatus('joining');

    try {
      console.log('🚀 Auto-joining with preauth code:', {
        preAuthCode,
        groupId: preAuthData.fullGroupId,
        userPubkey: pubkey
      });

      // Accept the invite via relay with direct preauth code
      const { eventId } = await acceptRelayInvite(
        preAuthData.fullGroupId,
        `preauth_${preAuthCode}`, // Fake invite code for reference
        'Auto-joined via preauth link',
        preAuthCode // Pass the preauth code directly
      );

      console.log('✅ Auto-join successful:', { eventId });

      // Refresh workspaces to get the new workspace
      await fetchWorkspaces();

      setStatus('success');

      // Redirect to the workspace after a brief delay
      setTimeout(() => {
        router.push(`/app/w/${preAuthData.fullGroupId}`);
      }, 2000);

    } catch (error) {
      console.error('❌ Failed to auto-join:', error);
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to join workspace');
    } finally {
      setJoining(false);
    }
  };

  // Load preauth data on mount
  useEffect(() => {
    if (groupId) {
      loadPreAuthData();
    }
  }, [groupId, loadPreAuthData]);

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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Zap className="w-8 h-8 text-purple-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Instant Join Link
            </h1>
            <p className="text-gray-600 text-sm">
              Join this workspace instantly with preauth approval
            </p>
          </div>

          {/* Loading State */}
          {status === 'loading' && (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-4" />
              <p className="text-gray-600">Loading invitation details...</p>
            </div>
          )}

          {/* Invite Not Found */}
          {status === 'not-found' && (
            <div className="text-center py-8">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Invalid Join Link
              </h3>
              <p className="text-gray-600 mb-6">
                This join link is invalid, expired, or has been revoked.
              </p>
              <button
                onClick={() => router.push('/')}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
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
                Join Link Expired
              </h3>
              <p className="text-gray-600 mb-6">
                This join link has expired. Please request a new invitation.
              </p>
              <button
                onClick={() => router.push('/')}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Go to Home
              </button>
            </div>
          )}

          {/* Already Member */}
          {status === 'already-member' && preAuthData && (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                You&apos;re Already a Member!
              </h3>
              <p className="text-gray-600 mb-6">
                You&apos;re already a member of <strong>{preAuthData.groupName}</strong>. You can access it directly.
              </p>
              <button
                onClick={() => router.push(`/app/w/${preAuthData.fullGroupId}`)}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
              >
                Go to Workspace
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Valid Preauth Invite */}
          {status === 'found' && preAuthData && (
            <div className="space-y-6">
              {/* Invite Details */}
              <div className="bg-purple-50 rounded-lg p-4 space-y-3">
                <div className="text-center mb-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-600 text-white rounded-full text-sm font-medium">
                    <Zap className="w-4 h-4" />
                    Instant Join Available
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">Workspace</label>
                  <p className="text-lg font-semibold text-gray-900">{preAuthData.groupName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Created by</label>
                  <p className="text-gray-900">{preAuthData.createdBy.slice(0, 8)}...</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Created on</label>
                  <p className="text-gray-900">{formatDate(preAuthData.createdAt)}</p>
                </div>
                {preAuthData.expiresAt && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Expires on</label>
                    <p className="text-gray-900">{formatDate(preAuthData.expiresAt)}</p>
                  </div>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Zap className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-900 mb-1">Instant Approval</h4>
                    <p className="text-sm text-blue-700">
                      This link has preauth approval - you&apos;ll join immediately without waiting for admin approval.
                    </p>
                  </div>
                </div>
              </div>

              {/* Authentication Check */}
              {!isAuthenticated && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800 mb-3">
                    You need to connect your Nostr account to join this workspace.
                  </p>
                  <button
                    onClick={() => router.push('/app')}
                    className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
                  >
                    Connect Nostr Account
                  </button>
                </div>
              )}

              {/* Join Button */}
              {isAuthenticated && (
                <button
                  onClick={handleAutoJoin}
                  disabled={joining}
                  className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {joining ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Joining workspace...
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      Join Instantly
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Joining State */}
          {status === 'joining' && (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-4" />
              <p className="text-gray-600">Auto-joining workspace with preauth approval...</p>
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
                You&apos;ve been automatically approved and joined the workspace. Redirecting...
              </p>
              <div className="flex items-center justify-center gap-2 text-purple-600">
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
                Failed to Join Workspace
              </h3>
              <p className="text-red-600 text-sm mb-6">
                {errorMessage}
              </p>
              <div className="space-y-3">
                <button
                  onClick={loadPreAuthData}
                  className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
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
            Powered by Nostr Protocol • Decentralized & Instant Join
          </p>
        </div>
      </div>
    </div>
  );
}