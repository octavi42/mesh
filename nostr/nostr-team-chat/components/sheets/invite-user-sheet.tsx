'use client';

import { useState } from 'react';
import { Sheet } from '@silk-hq/components';
import { X, UserPlus, Search, CheckCircle, AlertCircle } from 'lucide-react';
import { useChatStore } from '@/lib/stores/chat-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { sendDirectInvite, sendRelayInvite, validatePublicKey } from '@/lib/nostr/invites';

interface InviteUserSheetProps {
  trigger?: React.ReactNode;
}

export function InviteUserSheet({ trigger }: InviteUserSheetProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  
  const { currentWorkspaceId } = useChatStore();
  const { pubkey } = useAuthStore();
  const { workspaces } = useWorkspaceStore();

  // Get current workspace info
  const currentWorkspace = workspaces?.find(w => w.groupId === currentWorkspaceId);

  const handleInvite = async () => {
    console.log('🎯 Invite button clicked:', { currentWorkspaceId, pubkey, searchQuery, currentWorkspace });

    if (!currentWorkspaceId || !pubkey) {
      console.log('❌ Missing required data:', { currentWorkspaceId, pubkey });
      setStatus('error');
      setStatusMessage('No workspace selected or user not authenticated');
      return;
    }

    // Check if currentWorkspaceId is a valid NIP-29 group ID
    if (!currentWorkspaceId.includes("'")) {
      console.log('❌ Invalid workspace ID:', currentWorkspaceId);
      setStatus('error');
      setStatusMessage('Invalid workspace ID. Please create a workspace first or select a valid workspace.');
      return;
    }

    const validatedPubkey = validatePublicKey(searchQuery);
    console.log('🔍 Pubkey validation:', { searchQuery, validatedPubkey });
    if (!validatedPubkey) {
      console.log('❌ Invalid pubkey format:', searchQuery);
      setStatus('error');
      setStatusMessage('Invalid public key format. Please enter a valid npub or hex public key.');
      return;
    }

    setIsLoading(true);
    setStatus('idle');

    try {
      console.log('🚀 Sending relay invite with data:', {
        currentWorkspaceId,
        validatedPubkey,
        workspaceName: currentWorkspace?.name || 'Unknown Workspace'
      });

      // Use relay-based invites for production
      const { inviteCode, inviteLink, eventId } = await sendRelayInvite(currentWorkspaceId, validatedPubkey, {
        role: 'member',
        expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
        workspaceName: currentWorkspace?.name || 'Unknown Workspace',
        inviterName: pubkey?.slice(0, 8) + '...' || 'Someone' // Use first 8 chars of pubkey as name
      });

      console.log('✅ Relay invite created successfully:', {
        inviteCode,
        inviteLink,
        eventId,
        userPubkey: validatedPubkey
      });
      setStatus('success');
      setStatusMessage(`Invite created successfully! Share this link: ${inviteLink}`);
      setSearchQuery(''); // Clear the input
    } catch (error) {
      console.error('❌ Failed to send invite:', error);
      setStatus('error');

      let errorMessage = error instanceof Error ? error.message : 'Unknown error';

      // Provide more helpful error message for group not found
      if (errorMessage.includes('Group does not exist on relay')) {
        errorMessage = `This workspace (${currentWorkspace?.name || currentWorkspaceId}) doesn't exist on the relay yet. Please create this workspace on the relay first through the workspace creation process.`;
      }

      setStatusMessage(`Failed to send invite: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Sheet.Root license="commercial">
      <Sheet.Trigger asChild>{trigger}</Sheet.Trigger>
      <Sheet.Portal>
        <Sheet.View className="z-[100]" contentPlacement="center" nativeEdgeSwipePrevention={true} tracks={["top", "bottom"]}>
          <Sheet.Backdrop
            travelAnimation={{
              opacity: "1",
              backgroundColor: ({ progress }) => `rgba(0, 0, 0, ${Math.min(progress * 0.33, 0.33)})`,
              backdropFilter: ({ progress }) => `blur(${progress * 24}px)`,
            }}
          />
          <Sheet.Content
            className="bg-white rounded-3xl shadow-2xl w-full overflow-y-auto my-12"
            stackingAnimation={{
              scale: [1, 0.95] as [number, number],
            }}
            style={{ maxWidth: '540px', height: 'auto' }}
          >
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-light text-slate-900">Invite Member</h2>
                <Sheet.Trigger action="dismiss" asChild>
                  <button className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 transition-colors">
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </Sheet.Trigger>
              </div>

              <p className="text-sm text-slate-500 mb-6">
                Search for a user by their Nostr public key or npub
                {currentWorkspaceId && (
                  <span className="block mt-2 text-xs">
                    Current workspace: <code className="bg-slate-100 px-1 rounded">{currentWorkspace?.name || currentWorkspaceId}</code>
                    <br />
                    <span className="text-xs text-amber-600 mt-1 block">
                      Note: You can only send invites from workspaces that exist on the relay
                    </span>
                  </span>
                )}
              </p>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="user-search" className="text-sm font-medium text-slate-700">
                    Public Key or npub
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      id="user-search"
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="npub1... or hex public key"
                      className="w-full pl-10 pr-3 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50 text-slate-900 font-mono text-sm"
                    />
                  </div>
                  <p className="text-xs text-slate-500">
                    Enter the user&apos;s Nostr public key to invite them to this workspace
                  </p>
                </div>

                {/* Status Message */}
                {status !== 'idle' && (
                  <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                    status === 'success' 
                      ? 'bg-green-50 text-green-700 border border-green-200' 
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {status === 'success' ? (
                      <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    )}
                    <span className="text-xs">{statusMessage}</span>
                  </div>
                )}

                <button
                  onClick={handleInvite}
                  className="w-full px-4 py-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors font-medium shadow-sm mt-2 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!searchQuery || isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-5 h-5" />
                      Send Invitation
                    </>
                  )}
                </button>
              </div>
            </div>
          </Sheet.Content>
        </Sheet.View>
      </Sheet.Portal>
    </Sheet.Root>
  );
}
