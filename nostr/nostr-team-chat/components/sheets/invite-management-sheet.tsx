'use client';

import { useState, useEffect, useCallback } from 'react';
import { Sheet } from '@silk-hq/components';
import { X, Trash2, Copy, QrCode, Clock, Users, CheckCircle, AlertCircle, Plus } from 'lucide-react';
import { useChatStore } from '@/lib/stores/chat-store';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { QRCodeComponent } from '@/components/ui/qr-code';

interface PreAuthInvite {
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

interface InviteManagementSheetProps {
  trigger?: React.ReactNode;
}

export function InviteManagementSheet({ trigger }: InviteManagementSheetProps) {
  const [invites, setInvites] = useState<PreAuthInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCopySuccess, setShowCopySuccess] = useState<string | null>(null);
  const [showQRCode, setShowQRCode] = useState<string | null>(null);

  const { currentWorkspaceId } = useChatStore();
  const { pubkey } = useAuthStore();
  const { workspaces } = useWorkspaceStore();

  // Get current workspace info
  const currentWorkspace = workspaces?.find(w => w.groupId === currentWorkspaceId);

  // Load preauth invites for current workspace
  const loadInvites = useCallback(() => {
    try {
      setLoading(true);
      const existingPreauths = JSON.parse(localStorage.getItem('nip29_preauth_invites') || '[]');

      // Filter invites for current workspace and created by current user
      const workspaceInvites = existingPreauths.filter((invite: PreAuthInvite) =>
        (invite.groupId === currentWorkspaceId || invite.fullGroupId === currentWorkspaceId) &&
        invite.createdBy === pubkey
      );

      setInvites(workspaceInvites);
    } catch (error) {
      console.error('Failed to load invites:', error);
    } finally {
      setLoading(false);
    }
  }, [currentWorkspaceId, pubkey]);

  // Delete/revoke an invite
  const handleDeleteInvite = async (codeToDelete: string) => {
    try {
      const existingPreauths = JSON.parse(localStorage.getItem('nip29_preauth_invites') || '[]');
      const updatedPreauths = existingPreauths.filter((invite: PreAuthInvite) =>
        invite.code !== codeToDelete
      );
      localStorage.setItem('nip29_preauth_invites', JSON.stringify(updatedPreauths));

      // Update local state
      setInvites(prev => prev.filter(invite => invite.code !== codeToDelete));

      // Optionally: Send delete event to relay to revoke the invite
      // This would require implementing a delete/revoke event type

    } catch (error) {
      console.error('Failed to delete invite:', error);
    }
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string, code: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setShowCopySuccess(code);
      setTimeout(() => setShowCopySuccess(null), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  // Format date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Check if invite is expired
  const isExpired = (invite: PreAuthInvite) => {
    return invite.expiresAt ? Date.now() > invite.expiresAt : false;
  };

  // Get status color and text
  const getInviteStatus = (invite: PreAuthInvite) => {
    if (isExpired(invite)) {
      return { color: 'text-red-600 bg-red-50 border-red-200', text: 'Expired' };
    }
    return { color: 'text-green-600 bg-green-50 border-green-200', text: 'Active' };
  };

  // Load invites on mount and workspace change
  useEffect(() => {
    if (currentWorkspaceId && pubkey) {
      loadInvites();
    }
  }, [currentWorkspaceId, pubkey, loadInvites]);

  return (
    <Sheet.Root license="commercial">
      <Sheet.Trigger asChild>{trigger}</Sheet.Trigger>
      <Sheet.Portal>
        <Sheet.View contentPlacement="right" nativeEdgeSwipePrevention={true} style={{ zIndex: 10001 }}>
          <Sheet.Backdrop
            travelAnimation={{
              opacity: "1",
              backgroundColor: ({ progress }: { progress: number }) => `rgba(0, 0, 0, ${Math.min(progress * 0.33, 0.33)})`,
              backdropFilter: ({ progress }: { progress: number }) => `blur(${progress * 10}px)`,
            }}
          />
          <Sheet.Content
            className="bg-white w-full max-w-lg overflow-y-auto"
            stackingAnimation={{
              scale: [1, 0.95] as [number, number],
            }}
          >
            <div className="flex flex-col h-full">
              {/* Header */}
              <div className="p-6 border-b border-gray-200 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Invite Management</h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Manage instant join links for {currentWorkspace?.name || 'this workspace'}
                    </p>
                  </div>
                  <Sheet.Trigger action="dismiss" asChild>
                    <button className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-200 transition-colors">
                      <X className="w-5 h-5 text-gray-600" />
                    </button>
                  </Sheet.Trigger>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="p-6 text-center">
                    <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-blue-600 rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-500">Loading invites...</p>
                  </div>
                ) : invites.length === 0 ? (
                  <div className="p-6 text-center">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Instant Links</h3>
                    <p className="text-gray-500 mb-4">
                      You haven&apos;t created any instant join links yet.
                    </p>
                    <p className="text-sm text-gray-400">
                      Create one using the &quot;Instant Link&quot; option in the invite dialog.
                    </p>
                  </div>
                ) : (
                  <div className="p-6 space-y-4">
                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-blue-600" />
                          <span className="text-sm font-medium text-blue-900">
                            {invites.filter(inv => !isExpired(inv)).length} Active
                          </span>
                        </div>
                      </div>
                      <div className="bg-red-50 rounded-lg p-4">
                        <div className="flex items-center gap-2">
                          <AlertCircle className="w-5 h-5 text-red-600" />
                          <span className="text-sm font-medium text-red-900">
                            {invites.filter(inv => isExpired(inv)).length} Expired
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Invite List */}
                    <div className="space-y-3">
                      {invites.map((invite) => {
                        const status = getInviteStatus(invite);
                        const inviteLink = `${window.location.origin}/join/${invite.fullGroupId}?code=${invite.code}`;

                        return (
                          <div
                            key={invite.code}
                            className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${status.color}`}>
                                    {status.text}
                                  </span>
                                  {invite.expiresAt && (
                                    <span className="text-xs text-gray-500 flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {isExpired(invite) ? 'Expired' : `Expires ${formatDate(invite.expiresAt)}`}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600">
                                  Created {formatDate(invite.createdAt)}
                                </p>
                              </div>
                              <button
                                onClick={() => handleDeleteInvite(invite.code)}
                                className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                title="Delete invite"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                            <div className="space-y-2">
                              {/* Invite Link */}
                              <div>
                                <label className="text-xs font-medium text-gray-700 block mb-1">
                                  Invite Link
                                </label>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={inviteLink}
                                    readOnly
                                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs font-mono bg-gray-50"
                                  />
                                  <button
                                    onClick={() => copyToClipboard(inviteLink, invite.code)}
                                    className="px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                                    title="Copy link"
                                  >
                                    {showCopySuccess === invite.code ? (
                                      <CheckCircle className="w-3 h-3" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                  <button
                                    onClick={() => setShowQRCode(showQRCode === invite.code ? null : invite.code)}
                                    className="px-2 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                                    title="Show QR code"
                                  >
                                    <QrCode className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>

                              {/* Preauth Code */}
                              <div>
                                <label className="text-xs font-medium text-gray-700 block mb-1">
                                  Preauth Code
                                </label>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={invite.code}
                                    readOnly
                                    className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs font-mono bg-gray-50"
                                  />
                                  <button
                                    onClick={() => copyToClipboard(invite.code, `${invite.code}_code`)}
                                    className="px-2 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                                    title="Copy code"
                                  >
                                    {showCopySuccess === `${invite.code}_code` ? (
                                      <CheckCircle className="w-3 h-3" />
                                    ) : (
                                      <Copy className="w-3 h-3" />
                                    )}
                                  </button>
                                </div>
                              </div>

                              {/* QR Code Display */}
                              {showQRCode === invite.code && (
                                <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
                                  <p className="text-xs font-medium text-gray-700 mb-2 text-center">
                                    Scan to join instantly:
                                  </p>
                                  <div className="flex justify-center">
                                    <QRCodeComponent value={inviteLink} size={120} />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-gray-200 flex-shrink-0">
                <div className="text-center">
                  <p className="text-xs text-gray-500 mb-3">
                    Instant links allow users to join without waiting for approval
                  </p>
                  <button
                    onClick={loadInvites}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Refresh List
                  </button>
                </div>
              </div>
            </div>
          </Sheet.Content>
        </Sheet.View>
      </Sheet.Portal>
    </Sheet.Root>
  );
}