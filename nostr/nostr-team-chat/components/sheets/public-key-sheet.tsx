'use client';

import { Sheet } from '@silk-hq/components';
import { X } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface PublicKeySheetProps {
  trigger: React.ReactNode;
  pubkey: string;
}

export function PublicKeySheet({ trigger, pubkey }: PublicKeySheetProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 256;
    const moduleSize = 8;
    const modules = 33;

    canvas.width = size;
    canvas.height = size;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    const hash = Array.from(pubkey).reduce((acc, char) => {
      return char.charCodeAt(0) + ((acc << 5) - acc);
    }, 0);

    const random = (seed: number) => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };

    ctx.fillStyle = '#000000';

    for (let y = 0; y < modules; y++) {
      for (let x = 0; x < modules; x++) {
        const isFinderPattern =
          (x < 7 && y < 7) ||
          (x >= modules - 7 && y < 7) ||
          (x < 7 && y >= modules - 7);

        if (isFinderPattern) {
          const isOuterSquare =
            (x === 0 || x === 6 || y === 0 || y === 6) &&
            ((x < 7 && y < 7) || (x >= modules - 7 && y < 7) || (x < 7 && y >= modules - 7));

          const isInnerSquare =
            (x >= 2 && x <= 4 && y >= 2 && y <= 4) ||
            (x >= modules - 5 && x <= modules - 3 && y >= 2 && y <= 4) ||
            (x >= 2 && x <= 4 && y >= modules - 5 && y <= modules - 3);

          if (isOuterSquare || isInnerSquare) {
            ctx.fillRect(x * moduleSize, y * moduleSize, moduleSize, moduleSize);
          }
        } else {
          const seed = hash + y * modules + x;
          if (random(seed) > 0.5) {
            ctx.fillRect(x * moduleSize, y * moduleSize, moduleSize, moduleSize);
          }
        }
      }
    }
  }, [pubkey]);

  return (
    <Sheet.Root license="commercial">
      <Sheet.Trigger asChild>
        {trigger}
      </Sheet.Trigger>

      <Sheet.Portal>
        <Sheet.View contentPlacement="top" nativeEdgeSwipePrevention={true} style={{ zIndex: 10000 }}>
          <Sheet.Backdrop
            travelAnimation={{
              opacity: "1",
              backgroundColor: ({ progress }: { progress: number }) => `rgba(0, 0, 0, ${Math.min(progress * 0.4, 0.4)})`,
              backdropFilter: ({ progress }: { progress: number }) => `blur(${progress * 10}px)`,
            }}
          />
          <Sheet.Content
            className="bg-white rounded-b-3xl shadow-xl"
            style={{
              maxWidth: '500px',
              margin: '0 auto',
              width: '100%',
              minHeight: '600px',
            }}
          >
            <Sheet.BleedingBackground className="bg-white" />
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Public Key</h2>
                <Sheet.Trigger asChild>
                  <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                    <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  </button>
                </Sheet.Trigger>
              </div>

              <div className="flex flex-col items-center gap-6">
                <div className="bg-white p-4 rounded-xl border-2 border-gray-200">
                  <canvas
                    ref={canvasRef}
                    className="w-64 h-64"
                    style={{ imageRendering: 'pixelated' }}
                  />
                </div>

                <div className="w-full p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
                  <p className="text-xs font-medium text-gray-700 mb-2">Key</p>
                  <code className="text-xs break-all text-gray-900 font-mono block">{pubkey}</code>
                </div>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(pubkey);
                  }}
                  className="w-full px-4 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors font-medium"
                >
                  Copy to Clipboard
                </button>
              </div>
            </div>
          </Sheet.Content>
        </Sheet.View>
      </Sheet.Portal>
    </Sheet.Root>
  );
}
