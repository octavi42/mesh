'use client';

import { useState, useEffect, useRef } from 'react';
import { Sheet } from '@silk-hq/components';
import { AlertTriangle } from 'lucide-react';

interface ConfirmationState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  confirmStyle: 'danger' | 'primary';
  onConfirm: () => void;
}

let triggerGlobalConfirmation: () => void = () => {};
let setGlobalConfirmation: (state: ConfirmationState) => void = () => {};

export function showConfirmation(
  title: string,
  message: string,
  confirmText: string,
  confirmStyle: 'danger' | 'primary',
  onConfirm: () => void
) {
  setGlobalConfirmation({
    isOpen: true,
    title,
    message,
    confirmText,
    confirmStyle,
    onConfirm,
  });
  // Trigger the sheet to open after state is set
  setTimeout(() => {
    triggerGlobalConfirmation();
  }, 50);
}

export function GlobalConfirmationDialog() {
  const [confirmation, setConfirmation] = useState<ConfirmationState>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: '',
    confirmStyle: 'primary',
    onConfirm: () => {},
  });
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setGlobalConfirmation = setConfirmation;
    triggerGlobalConfirmation = () => {
      triggerRef.current?.click();
    };
  }, []);

  const handleClose = () => {
    setConfirmation((prev) => ({ ...prev, isOpen: false }));
  };

  const handleConfirm = () => {
    confirmation.onConfirm();
    handleClose();
  };

  return (
    <Sheet.Root license="commercial">
      <Sheet.Trigger asChild>
        <button ref={triggerRef} style={{ display: 'none' }} />
      </Sheet.Trigger>
      <Sheet.Portal>
        <Sheet.View
          contentPlacement="center"
          nativeEdgeSwipePrevention={true}
          style={{ zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <Sheet.Backdrop
            travelAnimation={{
              opacity: "1",
              backgroundColor: ({ progress }: { progress: number }) => `rgba(0, 0, 0, ${Math.min(progress * 0.5, 0.5)})`,
              backdropFilter: ({ progress }: { progress: number }) => `blur(${progress * 10}px)`,
            }}
          />
          <Sheet.Content className="max-w-md w-full mx-4 bg-white rounded-2xl shadow-2xl" style={{ height: 'auto' }}>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center ${
                    confirmation.confirmStyle === 'danger' ? 'bg-red-100' : 'bg-indigo-100'
                  }`}
                >
                  <AlertTriangle
                    className={`w-6 h-6 ${
                      confirmation.confirmStyle === 'danger' ? 'text-red-600' : 'text-indigo-600'
                    }`}
                  />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">{confirmation.title}</h2>
              </div>
              <p className="text-gray-600 mb-6">{confirmation.message}</p>
              <div className="flex gap-3">
                <Sheet.Trigger action="dismiss" asChild>
                  <button
                    onClick={handleClose}
                    className="flex-1 px-4 py-3 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                </Sheet.Trigger>
                <Sheet.Trigger action="dismiss" asChild>
                  <button
                    onClick={handleConfirm}
                    className={`flex-1 px-4 py-3 rounded-lg transition-colors font-medium ${
                      confirmation.confirmStyle === 'danger'
                        ? 'bg-red-600 text-white hover:bg-red-700'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700'
                    }`}
                  >
                    {confirmation.confirmText}
                  </button>
                </Sheet.Trigger>
              </div>
            </div>
          </Sheet.Content>
        </Sheet.View>
      </Sheet.Portal>
    </Sheet.Root>
  );
}
