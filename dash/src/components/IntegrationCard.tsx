'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import { ComposioToolkit } from '@/lib/composio';
import { useConnection } from '@/contexts/ConnectionContext';
import { supportsOAuth } from '@/lib/auth';
import { FloatingPanelRoot, FloatingPanelTrigger, FloatingPanelContent, FloatingPanelBody, FloatingPanelFooter, FloatingPanelCloseButton } from '@/components/ui/floating-panel';

interface IntegrationCardProps {
  toolkit: ComposioToolkit;
}

const TRANSITION = {
  type: "spring",
  bounce: 0.1,
  duration: 0.5,
}

export default function IntegrationCard({ toolkit }: IntegrationCardProps) {
  const { 
    connectIntegration, 
    disconnectIntegration, 
    isConnected, 
    isLoading, 
    getProgressMessage 
  } = useConnection();

  const connected = isConnected(toolkit.slug);
  const loading = isLoading(toolkit.slug);
  const progressMessage = getProgressMessage(toolkit.slug);
  const oauthSupported = supportsOAuth(toolkit.auth_schemes);

  const handleAction = async () => {
    try {
      if (connected) {
        await disconnectIntegration(toolkit.slug);
      } else {
        if (!oauthSupported) {
          alert('This integration does not support OAuth. Please configure manually.');
          return;
        }
        await connectIntegration(toolkit);
      }
    } catch (error) {
      console.error('Action failed:', error);
    }
  };

  return (
    <MotionConfig transition={TRANSITION}>
      <FloatingPanelRoot>
        <motion.div
          layoutId={`integration-card-${toolkit.slug}`}
          className="bg-white border border-zinc-200/50 rounded-2xl hover:shadow-xl hover:shadow-black/5 transition-all duration-500 hover:border-zinc-300/60 group cursor-pointer overflow-hidden"
          whileHover={{ y: -4, scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <FloatingPanelTrigger 
            title={toolkit.name}
            className="w-full p-0 h-auto bg-transparent border-none rounded-2xl hover:bg-transparent"
          >
            <motion.div 
              layoutId={`integration-content-${toolkit.slug}`}
              className="p-8"
            >
              <div className="flex items-start gap-5">
                <motion.div 
                  layoutId={`integration-logo-${toolkit.slug}`}
                  className="flex-shrink-0"
                >
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-gradient-to-br from-zinc-50 to-zinc-100 shadow-inner flex items-center justify-center ring-1 ring-zinc-200/50">
                    {toolkit.meta.logo ? (
                      <Image
                        src={toolkit.meta.logo}
                        alt={`${toolkit.name} logo`}
                        width={40}
                        height={40}
                        className="rounded-lg"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500/10 to-blue-600/20 rounded-xl flex items-center justify-center text-blue-700 text-lg font-bold">
                        {toolkit.name.charAt(0)}
                      </div>
                    )}
                  </div>
                </motion.div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <motion.h3 
                        layoutId={`integration-title-${toolkit.slug}`}
                        className="text-xl font-bold text-zinc-900 truncate group-hover:text-blue-600 transition-colors duration-300"
                      >
                        {toolkit.name}
                      </motion.h3>
                      {connected && (
                        <motion.span 
                          layoutId={`integration-status-${toolkit.slug}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/50"
                        >
                          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                          Connected
                        </motion.span>
                      )}
                      {loading && (
                        <motion.span 
                          layoutId={`integration-status-${toolkit.slug}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 ring-1 ring-blue-200/50"
                        >
                          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div>
                          {progressMessage || 'Connecting...'}
                        </motion.span>
                      )}
                    </div>
                  </div>
                  
                  <motion.p 
                    layoutId={`integration-description-${toolkit.slug}`}
                    className="text-sm text-zinc-600 leading-relaxed mb-4 line-clamp-2"
                  >
                    {toolkit.meta.description}
                  </motion.p>
                  
                  <div className="flex items-center justify-between">
                    <motion.div 
                      layoutId={`integration-categories-${toolkit.slug}`}
                      className="flex flex-wrap gap-1.5"
                    >
                      {toolkit.meta.categories.slice(0, 2).map((category) => (
                        <span
                          key={category.id}
                          className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-zinc-100/80 text-zinc-700 ring-1 ring-zinc-200/50"
                        >
                          {category.name}
                        </span>
                      ))}
                      {toolkit.meta.categories.length > 2 && (
                        <span className="text-xs text-zinc-500 font-medium">
                          +{toolkit.meta.categories.length - 2} more
                        </span>
                      )}
                    </motion.div>
                    
                    <motion.div 
                      layoutId={`integration-tools-count-${toolkit.slug}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50/80 text-blue-700 rounded-lg text-xs font-semibold ring-1 ring-blue-200/50"
                    >
                      <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                      {toolkit.meta.tools_count} tools
                    </motion.div>
                  </div>
                </div>
              </div>
            </motion.div>
          </FloatingPanelTrigger>
        </motion.div>

        <FloatingPanelContent className="w-[560px] max-w-[90vw] max-h-[85vh] overflow-y-auto shadow-2xl border-0 bg-white/95 backdrop-blur-xl">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="relative"
          >
            {/* Enhanced Header */}
            <motion.div 
              layoutId={`integration-content-${toolkit.slug}`}
              className="p-8 border-b border-zinc-200/60"
            >
              <div className="flex items-start gap-6">
                <motion.div 
                  layoutId={`integration-logo-${toolkit.slug}`}
                  className="flex-shrink-0"
                >
                  <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-zinc-50 to-zinc-100 shadow-inner flex items-center justify-center ring-1 ring-zinc-200/50">
                    {toolkit.meta.logo ? (
                      <Image
                        src={toolkit.meta.logo}
                        alt={`${toolkit.name} logo`}
                        width={56}
                        height={56}
                        className="rounded-xl"
                      />
                    ) : (
                      <div className="w-14 h-14 bg-gradient-to-br from-blue-500/10 to-blue-600/20 rounded-xl flex items-center justify-center text-blue-700 text-2xl font-bold">
                        {toolkit.name.charAt(0)}
                      </div>
                    )}
                  </div>
                </motion.div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-4">
                    <motion.h3 
                      layoutId={`integration-title-${toolkit.slug}`}
                      className="text-2xl font-bold text-zinc-900"
                    >
                      {toolkit.name}
                    </motion.h3>
                    {connected && (
                      <motion.span 
                        layoutId={`integration-status-${toolkit.slug}`}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/50"
                      >
                        <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                        Connected
                      </motion.span>
                    )}
                    {loading && (
                      <motion.span 
                        layoutId={`integration-status-${toolkit.slug}`}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-blue-50 text-blue-700 ring-1 ring-blue-200/50"
                      >
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                        {progressMessage || 'Connecting...'}
                      </motion.span>
                    )}
                  </div>
                  
                  <motion.p 
                    layoutId={`integration-description-${toolkit.slug}`}
                    className="text-zinc-600 leading-relaxed text-base"
                  >
                    {toolkit.meta.description}
                  </motion.p>
                  
                  <motion.div 
                    layoutId={`integration-categories-${toolkit.slug}`}
                    className="flex flex-wrap gap-2 mt-4"
                  >
                    {toolkit.meta.categories.map((category) => (
                      <span
                        key={category.id}
                        className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-medium bg-zinc-100/80 text-zinc-700 ring-1 ring-zinc-200/50"
                      >
                        {category.name}
                      </span>
                    ))}
                  </motion.div>
                </div>
              </div>
            </motion.div>

            <FloatingPanelBody className="p-8 space-y-8">
              {/* Statistics */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="grid grid-cols-2 gap-6">
                  <motion.div 
                    layoutId={`integration-tools-count-${toolkit.slug}`}
                    className="group relative overflow-hidden bg-gradient-to-br from-blue-50/80 to-blue-100/60 rounded-2xl p-6 ring-1 ring-blue-200/40 hover:ring-blue-300/60 transition-all duration-300"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent"></div>
                    <div className="relative">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Tools</span>
                      </div>
                      <div className="text-3xl font-bold text-blue-900">{toolkit.meta.tools_count}</div>
                    </div>
                  </motion.div>
                  
                  <div className="group relative overflow-hidden bg-gradient-to-br from-violet-50/80 to-violet-100/60 rounded-2xl p-6 ring-1 ring-violet-200/40 hover:ring-violet-300/60 transition-all duration-300">
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent"></div>
                    <div className="relative">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-2 h-2 bg-violet-500 rounded-full"></div>
                        <span className="text-xs font-semibold text-violet-700 uppercase tracking-wide">Triggers</span>
                      </div>
                      <div className="text-3xl font-bold text-violet-900">{toolkit.meta.triggers_count}</div>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Authentication Methods */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                  <h4 className="text-lg font-bold text-zinc-900">Authentication</h4>
                </div>
                <div className="flex flex-wrap gap-3">
                  {toolkit.auth_schemes.map((auth) => (
                    <span
                      key={auth}
                      className="inline-flex items-center px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-50/80 text-emerald-700 ring-1 ring-emerald-200/50 hover:bg-emerald-100/80 transition-colors"
                    >
                      {auth}
                    </span>
                  ))}
                </div>
              </motion.div>

              {/* Metadata */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-zinc-400 rounded-full"></div>
                  <h4 className="text-lg font-bold text-zinc-900">Timeline</h4>
                </div>
                <div className="bg-zinc-50/80 rounded-2xl p-6 ring-1 ring-zinc-200/50">
                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-zinc-600 uppercase tracking-wide">Created</div>
                      <div className="text-lg font-bold text-zinc-900">{new Date(toolkit.meta.created_at).toLocaleDateString()}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-zinc-600 uppercase tracking-wide">Updated</div>
                      <div className="text-lg font-bold text-zinc-900">{new Date(toolkit.meta.updated_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </FloatingPanelBody>

            <FloatingPanelFooter className="p-8 border-t border-zinc-200/60 bg-zinc-50/50">
              <FloatingPanelCloseButton className="p-3 hover:bg-zinc-200/80 rounded-xl transition-colors text-zinc-600 hover:text-zinc-900" />
              <motion.button
                onClick={handleAction}
                disabled={loading || !oauthSupported}
                className={`px-8 py-3 text-sm font-bold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed ${
                  connected
                    ? 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 ring-1 ring-red-500/20'
                    : oauthSupported
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 ring-1 ring-blue-500/20'
                    : 'bg-gradient-to-r from-gray-400 to-gray-500 text-white ring-1 ring-gray-400/20'
                }`}
                whileHover={!loading ? { scale: 1.02 } : {}}
                whileTap={!loading ? { scale: 0.98 } : {}}
              >
                {loading && (
                  <div className="inline-flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    {progressMessage || 'Processing...'}
                  </div>
                )}
                {!loading && (
                  <>
                    {connected && 'Disconnect Integration'}
                    {!connected && oauthSupported && 'Connect Integration'}
                    {!connected && !oauthSupported && 'OAuth Not Supported'}
                  </>
                )}
              </motion.button>
            </FloatingPanelFooter>
          </motion.div>
        </FloatingPanelContent>
      </FloatingPanelRoot>
    </MotionConfig>
  );
}