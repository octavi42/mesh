'use client';

import { useState, useEffect } from 'react';
import { ComposioAPI, ComposioToolkit } from '@/lib/composio';
import { ConnectionProvider } from '@/contexts/ConnectionContext';
import { ProjectProvider } from '@/contexts/ProjectContext';
import IntegrationCard from './IntegrationCard';

interface IntegrationDashboardProps {
  apiKey: string;
}

function IntegrationDashboardContent() {
  const [toolkits, setToolkits] = useState<ComposioToolkit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [sortBy, setSortBy] = useState<'usage' | 'alphabetically'>('usage');

  const apiKey = process.env.NEXT_PUBLIC_COMPOSIO_API_KEY;
  const composioAPI = apiKey ? new ComposioAPI(apiKey) : null;

  const fetchToolkits = async () => {
    if (!composioAPI) {
      setError('Composio API key not configured');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);

      const toolkitsResponse = await composioAPI.getToolkits({
        sort_by: sortBy,
        limit: 50,
        ...(selectedCategory && { category: selectedCategory })
      });

      setToolkits(toolkitsResponse.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchToolkits();
  }, [sortBy, selectedCategory]);

  const filteredToolkits = toolkits.filter(toolkit =>
    toolkit.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    toolkit.meta.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categories = Array.from(
    new Set(toolkits.flatMap(t => t.meta.categories.map(c => c.name)))
  ).sort();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <div className="mt-2 text-sm text-red-700">
              {error}
            </div>
            <div className="mt-3">
              <button
                onClick={fetchToolkits}
                className="bg-red-100 px-3 py-1 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Integrations Dashboard</h1>
            <p className="text-gray-600">
              Connect and manage your app integrations with over {toolkits.length} available services.
            </p>
          </div>
          <a 
            href="/chat"
            className="flex items-center space-x-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span>AI Chat</span>
          </a>
        </div>
      </div>

      <div className="mb-6 bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
              Search integrations
            </label>
            <input
              id="search"
              type="text"
              placeholder="Search by name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
              Category
            </label>
            <select
              id="category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="sort" className="block text-sm font-medium text-gray-700 mb-2">
              Sort by
            </label>
            <select
              id="sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'usage' | 'alphabetically')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="usage">Most popular</option>
              <option value="alphabetically">Alphabetical</option>
            </select>
          </div>
        </div>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <div className="text-sm text-gray-600">
          {filteredToolkits.length} integration{filteredToolkits.length !== 1 ? 's' : ''} found
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredToolkits.map((toolkit) => (
          <IntegrationCard
            key={toolkit.slug}
            toolkit={toolkit}
          />
        ))}
      </div>

      {filteredToolkits.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No integrations found</h3>
          <p className="text-gray-500">Try adjusting your search or filter criteria.</p>
        </div>
      )}
    </div>
  );
}

export default function IntegrationDashboard({ apiKey }: IntegrationDashboardProps) {
  return (
    <ProjectProvider>
      <ConnectionProvider apiKey={apiKey}>
        <IntegrationDashboardContent />
      </ConnectionProvider>
    </ProjectProvider>
  );
}