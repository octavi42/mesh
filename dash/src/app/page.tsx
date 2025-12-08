import IntegrationDashboard from "@/components/IntegrationDashboard";

export default function Home() {
  const apiKey = process.env.NEXT_PUBLIC_COMPOSIO_API_KEY;

  if (!apiKey) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Configuration Error</h1>
          <p className="text-gray-600">NEXT_PUBLIC_COMPOSIO_API_KEY environment variable is required.</p>
          <p className="text-gray-500 text-sm mt-2">Please check your .env.local file.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <IntegrationDashboard apiKey={apiKey} />
    </div>
  );
}
