"use client";

import { useState, useEffect } from 'react';
import { MCPServer } from '@/types/mcp';
import { Connection } from '@/types/connections';
import { ExpandableCard } from '@/components/ui/expandable-card';
import MockOAuthDialog from '@/components/MockOAuthDialog';
import { 
  getConnection, 
  simulateOAuthFlow, 
  removeConnection,
  isServerConnected,
  getConnectionStatus 
} from '@/lib/connections';

interface MCPExpandableCardProps {
  server: MCPServer;
  onConnect: (server: MCPServer) => void;
}

// Function to generate a relevant icon for each MCP server based on its name/type
function getServerIcon(server: MCPServer): JSX.Element {
  const name = server.name.toLowerCase();
  
  if (name.includes('github') || name.includes('git')) {
    return (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
      </svg>
    );
  }
  if (name.includes('slack') || name.includes('chat')) {
    return (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    );
  }
  if (name.includes('database') || name.includes('mongo') || name.includes('sql')) {
    return (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
      </svg>
    );
  }
  if (name.includes('twitter') || name.includes('social')) {
    return (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
      </svg>
    );
  }
  if (name.includes('jira') || name.includes('project')) {
    return (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v6a2 2 0 002 2h2m0 0h4a2 2 0 002-2v-6a2 2 0 00-2-2H9m0 0V3a2 2 0 012-2h2a2 2 0 012 2v2m-6 9l2 2 4-4" />
      </svg>
    );
  }
  if (name.includes('blockchain') || name.includes('crypto') || name.includes('ethereum')) {
    return (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    );
  }
  if (name.includes('video') || name.includes('capture')) {
    return (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    );
  }
  if (name.includes('qr') || name.includes('code')) {
    return (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
      </svg>
    );
  }
  if (name.includes('time') || name.includes('calendar')) {
    return (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    );
  }
  if (name.includes('memory') || name.includes('storage')) {
    return (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
      </svg>
    );
  }
  if (name.includes('fetch') || name.includes('web')) {
    return (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
      </svg>
    );
  }
  if (name.includes('file') || name.includes('system')) {
    return (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  }
  
  // Default integration icon
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

function getServerCategory(server: MCPServer): string {
  const name = server.name.toLowerCase();
  
  if (name.includes('github') || name.includes('git')) return 'Version Control';
  if (name.includes('slack') || name.includes('chat')) return 'Communication';
  if (name.includes('database') || name.includes('mongo') || name.includes('sql')) return 'Database';
  if (name.includes('twitter') || name.includes('social')) return 'Social Media';
  if (name.includes('jira') || name.includes('project')) return 'Project Management';
  if (name.includes('blockchain') || name.includes('crypto') || name.includes('ethereum')) return 'Blockchain';
  if (name.includes('video') || name.includes('capture')) return 'Media';
  if (name.includes('qr') || name.includes('code')) return 'Utilities';
  if (name.includes('time') || name.includes('calendar')) return 'Time & Calendar';
  if (name.includes('memory') || name.includes('storage')) return 'Storage';
  if (name.includes('fetch') || name.includes('web')) return 'Web Services';
  if (name.includes('file') || name.includes('system')) return 'File System';
  
  return 'Integration';
}

export default function MCPExpandableCard({ server, onConnect }: MCPExpandableCardProps) {
  const [connection, setConnection] = useState<Connection | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<Connection['status'] | null>(null);
  const [showOAuthDialog, setShowOAuthDialog] = useState(false);
  const [selectedAuthMethod, setSelectedAuthMethod] = useState<MCPServer['authMethods'][0] | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Load connection status on mount
  useEffect(() => {
    loadConnectionStatus();
  }, [server.name]);

  const loadConnectionStatus = async () => {
    try {
      const existingConnection = await getConnection(server.name);
      const status = await getConnectionStatus(server.name);
      setConnection(existingConnection);
      setConnectionStatus(status);
    } catch (error) {
      console.error('Failed to load connection status:', error);
    }
  };

  const handleConnect = async (authMethod: MCPServer['authMethods'][0]) => {
    if (authMethod.type === 'oauth') {
      setSelectedAuthMethod(authMethod);
      setShowOAuthDialog(true);
    } else {
      // Handle API key or other auth methods
      setIsConnecting(true);
      try {
        const newConnection = await simulateOAuthFlow(server, authMethod);
        setConnection(newConnection);
        setConnectionStatus('connected');
        onConnect(server);
      } catch (error) {
        console.error('Connection failed:', error);
      } finally {
        setIsConnecting(false);
      }
    }
  };

  const handleOAuthSuccess = async () => {
    if (!selectedAuthMethod) return;
    
    setIsConnecting(true);
    try {
      const newConnection = await simulateOAuthFlow(server, selectedAuthMethod);
      setConnection(newConnection);
      setConnectionStatus('connected');
      onConnect(server);
      setShowOAuthDialog(false);
    } catch (error) {
      console.error('OAuth connection failed:', error);
    } finally {
      setIsConnecting(false);
      setSelectedAuthMethod(null);
    }
  };

  const handleDisconnect = async () => {
    if (!connection) return;
    
    try {
      await removeConnection(connection.id);
      setConnection(null);
      setConnectionStatus(null);
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  return (
    <>
      <MockOAuthDialog
        isOpen={showOAuthDialog}
        onClose={() => {
          setShowOAuthDialog(false);
          setSelectedAuthMethod(null);
        }}
        onSuccess={handleOAuthSuccess}
        server={server}
        authMethod={selectedAuthMethod!}
      />
    <ExpandableCard
      title={server.name}
      icon={getServerIcon(server)}
      category={getServerCategory(server)}
      description={server.description}
      className="max-w-xs"
      classNameExpanded="bg-gradient-to-br from-gray-50 to-white dark:from-gray-950 dark:to-gray-900"
    >
      {/* Detailed server information */}
      <div className="space-y-6">
        <div>
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            About This Integration
          </h4>
          <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
            {server.description}
          </p>
        </div>

        {/* Technical Details */}
        <div>
          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Technical Details
          </h4>
          <div className="space-y-3">
            {server.sourceCodeUrl && (
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Source Code</p>
                  <a 
                    href={server.sourceCodeUrl} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                  >
                    {server.sourceCodeUrl.replace('https://github.com/', 'github.com/')}
                  </a>
                  {server.githubStars && (
                    <div className="flex items-center gap-1 mt-1">
                      <svg className="w-3 h-3 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span className="text-xs text-gray-600 dark:text-gray-400">{server.githubStars.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {server.packageRegistry && (
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Package Registry</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {server.packageRegistry.type}
                  </p>
                  {server.packageDownloads && (
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      {server.packageDownloads.toLocaleString()} downloads
                    </p>
                  )}
                </div>
              </div>
            )}

            {server.authMethods && server.authMethods.length > 0 && (
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Authentication Methods</p>
                  <div className="space-y-2 mt-2">
                    {server.authMethods.map((auth, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            auth.type === 'oauth' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : auth.type === 'api_key'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                          }`}>
                            {auth.type.replace('_', ' ').toUpperCase()}
                          </span>
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {auth.transport}
                          </span>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded ${
                          auth.cost === 'free' || auth.cost === 'free_tier'
                            ? 'bg-green-50 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                            : 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300'
                        }`}>
                          {auth.cost.replace('_', ' ')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Connection Section */}
        <div className="border-t border-gray-200 dark:border-gray-800 pt-6">
          {connectionStatus === 'connected' && connection ? (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Connected
                </h4>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-3 mb-2">
                  {connection.userInfo?.avatar ? (
                    <img src={connection.userInfo.avatar} alt="User avatar" className="w-8 h-8 rounded-full" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-sm font-medium">
                      {connection.userInfo?.username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {connection.userInfo?.username || 'Connected User'}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Connected {connection.connectedAt ? new Date(connection.connectedAt).toLocaleDateString() : 'recently'}
                    </p>
                  </div>
                </div>
                {connection.auth?.scopes && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {connection.auth.scopes.map((scope, index) => (
                      <span key={index} className="text-xs px-2 py-1 bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 rounded">
                        {scope}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={handleDisconnect}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Ready to Connect?
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Add this MCP server to your project to unlock new AI capabilities and integrations.
              </p>
              
              {server.authMethods && server.authMethods.length > 0 ? (
                <div className="space-y-2">
                  {server.authMethods.map((authMethod, index) => (
                    <button
                      key={index}
                      onClick={() => handleConnect(authMethod)}
                      disabled={isConnecting}
                      className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all duration-200 ${
                        authMethod.type === 'oauth'
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-transparent'
                          : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700'
                      } ${isConnecting ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          authMethod.type === 'oauth'
                            ? 'bg-white/20 text-white'
                            : authMethod.type === 'api_key'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                        }`}>
                          {authMethod.type.replace('_', ' ').toUpperCase()}
                        </span>
                        <span className="font-medium">
                          Connect via {authMethod.type === 'oauth' ? 'OAuth' : authMethod.type.replace('_', ' ')}
                        </span>
                      </div>
                      {isConnecting ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              ) : (
                <button
                  onClick={() => onConnect(server)}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
                >
                  Connect Integration
                </button>
              )}
            </div>
          )}
        </div>

        {/* Additional Info */}
        {server.url && (
          <div className="text-center">
            <a
              href={server.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
            >
              View detailed documentation →
            </a>
          </div>
        )}
      </div>
    </ExpandableCard>
    </>
  );
}