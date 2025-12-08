"use client";

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MCPServer } from '@/types/mcp';

interface MockOAuthDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  server: MCPServer;
  authMethod: MCPServer['authMethods'][0];
}

export default function MockOAuthDialog({ 
  isOpen, 
  onClose, 
  onSuccess, 
  server, 
  authMethod 
}: MockOAuthDialogProps) {
  const [step, setStep] = useState<'auth' | 'permissions' | 'connecting'>('auth');
  const [mockEmail, setMockEmail] = useState('demo@example.com');
  const [mockPassword, setMockPassword] = useState('demo123');

  const handleAuth = () => {
    setStep('permissions');
  };

  const handlePermissions = () => {
    setStep('connecting');
    // Simulate connection delay
    setTimeout(() => {
      onSuccess();
      onClose();
    }, 2000);
  };

  const getProviderName = () => {
    const name = server.name.toLowerCase();
    if (name.includes('github')) return 'GitHub';
    if (name.includes('slack')) return 'Slack';
    if (name.includes('twitter') || name.includes('x')) return 'Twitter';
    if (name.includes('google')) return 'Google';
    return server.name;
  };

  const getProviderLogo = () => {
    const name = server.name.toLowerCase();
    if (name.includes('github')) {
      return (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
        </svg>
      );
    }
    if (name.includes('slack')) {
      return (
        <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
          <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
        </svg>
      );
    }
    
    // Default icon
    return (
      <div className="w-8 h-8 rounded bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
        {server.name.charAt(0).toUpperCase()}
      </div>
    );
  };

  const getPermissions = () => {
    const name = server.name.toLowerCase();
    if (name.includes('github')) {
      return ['Access your repositories', 'Read your profile information', 'Create commits and pull requests'];
    }
    if (name.includes('slack')) {
      return ['Access your workspace channels', 'Send messages on your behalf', 'Read user profiles'];
    }
    if (name.includes('twitter')) {
      return ['Read your tweets', 'Post tweets on your behalf', 'Access your profile'];
    }
    return ['Read your basic profile', 'Access application data', 'Perform actions on your behalf'];
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {step === 'auth' && (
              <div className="p-6">
                <div className="text-center mb-6">
                  <div className="flex justify-center mb-4">
                    {getProviderLogo()}
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Sign in to {getProviderName()}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Connect your {getProviderName()} account to enable {server.name} integration
                  </p>
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={mockEmail}
                      onChange={(e) => setMockEmail(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                      placeholder="Enter your email"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      value={mockPassword}
                      onChange={(e) => setMockPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
                      placeholder="Enter your password"
                    />
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAuth}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
                  >
                    Sign In
                  </button>
                </div>
              </div>
            )}

            {step === 'permissions' && (
              <div className="p-6">
                <div className="text-center mb-6">
                  <div className="flex justify-center mb-4">
                    {getProviderLogo()}
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Authorize {server.name}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    This will allow {server.name} to:
                  </p>
                </div>

                <div className="space-y-3 mb-6">
                  {getPermissions().map((permission, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-gray-700 dark:text-gray-300">{permission}</span>
                    </div>
                  ))}
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-6">
                  <div className="flex gap-2">
                    <svg className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <p className="text-xs text-amber-800 dark:text-amber-200">
                      This is a demo OAuth flow. No real authentication is performed.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePermissions}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
                  >
                    Authorize
                  </button>
                </div>
              </div>
            )}

            {step === 'connecting' && (
              <div className="p-6 text-center">
                <div className="flex justify-center mb-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Connecting...
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Setting up your {server.name} integration
                </p>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}