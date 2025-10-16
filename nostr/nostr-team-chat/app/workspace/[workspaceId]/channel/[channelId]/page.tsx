'use client';

import { useParams } from 'next/navigation';
import { AppLayout } from '@/components/layout/AppLayout';
import { ChannelView } from '@/components/chat/ChannelView';

export default function ChannelPage() {
  const params = useParams();
  const channelId = params.channelId as string;

  return (
    <AppLayout>
      <ChannelView channelId={channelId} />
    </AppLayout>
  );
}
