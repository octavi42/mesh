'use client';

import { useState, useEffect } from 'react';
import { MCPServer } from '@/types/mcp';
import { fetchMCPServers } from '@/lib/api';
import MCPExpandableCard from '@/components/MCPExpandableCard';
import Pagination from '@/components/Pagination';

export default function Home() {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const loadServers = async (page: number, search?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await fetchMCPServers(page, 12, search);
      setServers(data.servers);
      setCurrentPage(data.pagination.page);
      setTotalPages(Math.ceil(data.pagination.total / data.pagination.limit));
      setHasNext(data.pagination.hasNext);
      setHasPrev(data.pagination.hasPrev);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load MCP servers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServers(1, searchTerm);
  }, [searchTerm]);

  const handlePageChange = (page: number) => {
    loadServers(page, searchTerm);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    setSearchTerm(searchInput);
  };

  const handleConnect = (server: MCPServer) => {
    console.log('Connected to:', server.name);
    // Connection is now handled by MCPExpandableCard component
    // This callback is fired after successful connection
  };

  if (loading && currentPage === 1) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading MCP servers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mb-6">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-3xl font-light text-gray-900 mb-3 tracking-tight">
            MCP Integration Hub
          </h1>
          <p className="text-gray-500 max-w-lg mx-auto text-base leading-relaxed">
            Discover and connect to Model Context Protocol servers for your AI workflows
          </p>
        </div>

        {/* Search */}
        <div className="max-w-lg mx-auto mb-12">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search integrations..."
              className="w-full px-5 py-4 text-sm bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 placeholder-gray-400 shadow-sm"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition-colors duration-200"
            >
              Search
            </button>
          </form>
        </div>

        {error && (
          <div className="max-w-2xl mx-auto mb-8 p-4 bg-red-50/50 border border-red-100 rounded-xl">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Loading state for pagination */}
        {loading && currentPage > 1 && (
          <div className="text-center mb-8">
            <div className="inline-flex items-center text-gray-600 text-sm">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-300 mr-2"></div>
              Loading more...
            </div>
          </div>
        )}

        {/* MCP Cards Grid */}
        <div className="flex flex-wrap justify-center gap-6 mb-12">
          {servers.map((server, index) => (
            <MCPExpandableCard 
              key={`${server.name}-${index}`} 
              server={server} 
              onConnect={handleConnect}
            />
          ))}
        </div>

        {/* Empty state */}
        {!loading && servers.length === 0 && (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-6">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No integrations found</h3>
            <p className="text-gray-500 text-sm max-w-sm mx-auto leading-relaxed">
              {searchTerm ? `No MCP servers match "${searchTerm}". Try a different search term.` : 'No MCP servers available at the moment.'}
            </p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              hasNext={hasNext}
              hasPrev={hasPrev}
              onPageChange={handlePageChange}
            />
          </div>
        )}
      </div>
    </div>
  );
}
