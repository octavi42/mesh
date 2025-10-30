'use client';

import { useEffect, useRef } from 'react';
import QRCode from 'qrcode.js';

interface QRCodeProps {
  value: string;
  size?: number;
  className?: string;
}

export function QRCodeComponent({ value, size = 200, className = '' }: QRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && value) {
      try {
        // Clear the canvas
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        // Generate QR code
        const qr = new QRCode({
          content: value,
          padding: 4,
          width: size,
          height: size,
          color: '#000000',
          background: '#ffffff',
          ecl: 'M'
        });

        // Draw to canvas
        qr.toCanvas(canvas);
      } catch (error) {
        console.error('Failed to generate QR code:', error);
      }
    }
  }, [value, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={`border border-gray-200 rounded-lg ${className}`}
    />
  );
}