import { Skeleton } from "./skeleton";

interface MessageSkeletonProps {
  isOwn?: boolean;
}

function MessageSkeleton({ isOwn = false }: MessageSkeletonProps) {
  return (
    <div className={`flex gap-3 px-6 py-3 ${isOwn ? 'justify-end' : ''}`}>
      {!isOwn && (
        <Skeleton className="h-7 w-7 rounded-full flex-shrink-0 opacity-60" />
      )}
      <div className={`flex flex-col gap-2 ${isOwn ? 'items-end' : ''}`}>
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-12 opacity-50" />
          <Skeleton className="h-2 w-8 opacity-40" />
        </div>
        <div className={`space-y-2 ${isOwn ? 'items-end flex flex-col' : ''}`}>
          <Skeleton className="h-3 w-48 opacity-70" />
        </div>
      </div>
      {isOwn && (
        <Skeleton className="h-7 w-7 rounded-full flex-shrink-0 opacity-60" />
      )}
    </div>
  );
}

interface MessageSkeletonsProps {
  count?: number;
}

function MessageSkeletons({ count = 3 }: MessageSkeletonsProps) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="space-y-6 py-6">
        {Array.from({ length: count }, (_, i) => (
          <MessageSkeleton key={i} isOwn={i === count - 1 && Math.random() > 0.7} />
        ))}
      </div>
    </div>
  );
}

export { MessageSkeleton, MessageSkeletons };