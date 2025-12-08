'use client';

import { useState } from 'react';
import { MCPServer } from '@/types/mcp';

interface MCPCardProps {
  server: MCPServer;
  onConnect: (server: MCPServer) => void;
}

export default function MCPCard({ server, onConnect }: MCPCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="group bg-white/80 backdrop-blur-sm border border-gray-100 rounded-xl overflow-hidden hover:border-gray-200 transition-all duration-300 hover:shadow-lg hover:shadow-gray-100/50">
      {/* Main Card Content */}
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-base font-medium text-gray-900 leading-tight pr-2">
            {server.name}
          </h3>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 transition-colors duration-200"
          >
            <svg 
              className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} 
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
        
        {/* Description Preview */}
        <p className="text-sm text-gray-600 leading-relaxed mb-4 line-clamp-2">
          {server.description}
        </p>

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          {server.packageRegistry && (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-md">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              {server.packageRegistry.type}
            </span>
          )}
          {server.remoteServer && (
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-green-50 text-green-700 rounded-md">
              Remote
            </span>
          )}
        </div>

        {/* Connect Button - Always Visible */}
        <button
          onClick={() => onConnect(server)}
          className="w-full bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-all duration-200 hover:shadow-md"
        >
          Connect
        </button>
      </div>

      {/* Expanded Content */}
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
        isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
      }`}>
        <div className="px-5 pb-5 pt-0 border-t border-gray-50">
          {/* Full Description */}
          <div className="mt-4 mb-4">
            <p className="text-sm text-gray-700 leading-relaxed">
              {server.description}
            </p>
          </div>

          {/* Details */}
          <div className="space-y-3">
            {server.sourceCodeUrl && (
              <div className="flex items-center gap-2 text-sm">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <span className="text-gray-500 text-xs">Source:</span>
                <a 
                  href={server.sourceCodeUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 text-xs truncate transition-colors duration-200"
                >
                  {server.sourceCodeUrl.replace('https://github.com/', '')}
                </a>
              </div>
            )}
            
            {server.packageRegistry && server.packageRegistry.url && (
              <div className="flex items-center gap-2 text-sm">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <span className="text-gray-500 text-xs">Package:</span>
                <span className="text-gray-700 text-xs truncate">
                  {server.packageRegistry.url}
                </span>
              </div>
            )}

            {server.url && (
              <div className="flex items-center gap-2 text-sm">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
                <span className="text-gray-500 text-xs">Info:</span>
                <a 
                  href={server.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 text-xs truncate transition-colors duration-200"
                >
                  View Details
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}