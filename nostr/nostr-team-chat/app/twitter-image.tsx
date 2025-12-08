import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'Mesh';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

// Reuse the same image for Twitter
export { default } from './opengraph-image';
