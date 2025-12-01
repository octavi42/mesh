'use client';

import { cn } from '@/lib/utils';
import { Skeleton } from './skeleton';

/**
 * Skeleton for a single message in the chat
 */
export function MessageSkeleton({ isOwn = false }: { isOwn?: boolean }) {
  return (
    <div className={cn('flex gap-3 p-3', isOwn && 'flex-row-reverse')}>
      {/* Avatar */}
      <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
      
      <div className={cn('flex flex-col gap-1.5', isOwn && 'items-end')}>
        {/* Name and time */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-2 w-12" />
        </div>
        
        {/* Message content - varying widths for realism */}
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  );
}

/**
 * Skeleton for multiple messages in chat view
 */
export function MessageListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-1 p-4">
      {Array.from({ length: count }).map((_, i) => (
        <MessageSkeleton key={i} isOwn={i % 3 === 0} />
      ))}
    </div>
  );
}

/**
 * Skeleton for a channel item in the sidebar
 */
export function ChannelItemSkeleton() {
  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <Skeleton className="h-4 w-4 rounded" />
      <Skeleton className="h-4 flex-1" />
    </div>
  );
}

/**
 * Skeleton for the channel list in sidebar
 */
export function ChannelListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-1">
      {/* Section header */}
      <div className="px-3 py-2">
        <Skeleton className="h-3 w-16" />
      </div>
      
      {/* Channel items */}
      {Array.from({ length: count }).map((_, i) => (
        <ChannelItemSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Skeleton for a workspace item in the icon bar
 */
export function WorkspaceItemSkeleton() {
  return (
    <Skeleton className="h-10 w-10 rounded-lg" />
  );
}

/**
 * Skeleton for the workspace list
 */
export function WorkspaceListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-2 p-2">
      {Array.from({ length: count }).map((_, i) => (
        <WorkspaceItemSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Skeleton for member list item
 */
export function MemberItemSkeleton() {
  return (
    <div className="flex items-center gap-2 px-3 py-2">
      <Skeleton className="h-6 w-6 rounded-full" />
      <Skeleton className="h-3 flex-1" />
    </div>
  );
}

/**
 * Skeleton for member list section
 */
export function MemberListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="px-3 py-2">
        <Skeleton className="h-3 w-20" />
      </div>
      {Array.from({ length: count }).map((_, i) => (
        <MemberItemSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Full page loading skeleton
 */
export function PageSkeleton() {
  return (
    <div className="flex h-screen w-full bg-[#fafafa] dark:bg-[#0a0a0a]">
      {/* Sidebar skeleton */}
      <div className="w-64 border-r border-zinc-200 dark:border-zinc-800 p-4">
        <Skeleton className="h-8 w-32 mb-6" />
        <ChannelListSkeleton />
      </div>
      
      {/* Main content skeleton */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-14 border-b border-zinc-200 dark:border-zinc-800 px-4 flex items-center">
          <Skeleton className="h-5 w-40" />
        </div>
        
        {/* Messages */}
        <div className="flex-1 overflow-hidden">
          <MessageListSkeleton count={8} />
        </div>
        
        {/* Input area */}
        <div className="h-16 border-t border-zinc-200 dark:border-zinc-800 px-4 flex items-center">
          <Skeleton className="h-10 flex-1 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

/**
 * Inline loading spinner
 */
export function Spinner({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-6 w-6 border-2',
    lg: 'h-8 w-8 border-[3px]',
  };

  return (
    <div
      className={cn(
        'animate-spin rounded-full border-zinc-300 dark:border-zinc-600 border-t-indigo-500',
        sizeClasses[size],
        className
      )}
    />
  );
}

/**
 * Loading overlay for sections
 */
export function LoadingOverlay({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm z-10">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" />
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{message}</p>
      </div>
    </div>
  );
}

/**
 * Empty state component
 */
export function EmptyState({ 
  icon, 
  title, 
  description,
  action 
}: { 
  icon?: React.ReactNode;
  title: string; 
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {icon && (
        <div className="text-zinc-400 dark:text-zinc-500 mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium text-zinc-700 dark:text-zinc-300 mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mb-4">
          {description}
        </p>
      )}
      {action}
    </div>
  );
}
