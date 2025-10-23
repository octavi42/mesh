interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  return (
    <div className={`animate-spin rounded-full border-2 border-gray-200 border-t-current ${sizeClasses[size]} ${className}`} />
  );
}

interface LoadingMessagesProps {
  channelName: string;
}

export function LoadingMessages({ channelName }: LoadingMessagesProps) {
  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-gray-500">
        <LoadingSpinner size="lg" />
        <p className="text-sm">Loading messages for #{channelName}...</p>
      </div>
    </div>
  );
}