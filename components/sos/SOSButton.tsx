'use client';

import React from 'react';
import { ShieldAlert, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSOS } from '@/hooks/useSOS';
import SOSModal from './SOSModal';

interface SOSButtonProps {
  variant?: 'floating' | 'inline' | 'compact';
  className?: string;
}

export default function SOSButton({ variant = 'floating', className = '' }: SOSButtonProps) {
  const { user } = useAuth();
  const { isActivating, activeSOS, sosModalOpen, setSosModalOpen, triggerSOS } = useSOS();

  const handleTrigger = () => {
    triggerSOS(user);
  };

  if (variant === 'floating') {
    return (
      <>
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={handleTrigger}
            disabled={isActivating}
            aria-label="Emergency SOS Alert"
            className="group relative flex items-center justify-center w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 text-white shadow-2xl shadow-red-600/60 active:scale-95 transition-all duration-200 border-4 border-white/20"
          >
            {/* Outer animated emergency ring */}
            <span className="absolute -inset-1 rounded-full bg-red-500 opacity-60 animate-ping pointer-events-none" />
            {isActivating ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : (
              <div className="flex flex-col items-center">
                <ShieldAlert className="w-7 h-7" />
                <span className="text-[9px] font-black uppercase tracking-tighter">SOS</span>
              </div>
            )}
          </button>
        </div>

        <SOSModal
          isOpen={sosModalOpen}
          onClose={() => setSosModalOpen(false)}
          sosEvent={activeSOS}
        />
      </>
    );
  }

  if (variant === 'compact') {
    return (
      <>
        <button
          onClick={handleTrigger}
          disabled={isActivating}
          className={`flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl shadow-md shadow-red-600/30 transition ${className}`}
        >
          {isActivating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
          <span>SOS</span>
        </button>
        <SOSModal
          isOpen={sosModalOpen}
          onClose={() => setSosModalOpen(false)}
          sosEvent={activeSOS}
        />
      </>
    );
  }

  // Inline banner variant
  return (
    <>
      <button
        onClick={handleTrigger}
        disabled={isActivating}
        className={`w-full flex items-center justify-center gap-3 py-4 px-6 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-base rounded-2xl shadow-xl shadow-red-600/30 border border-red-400/40 active:scale-[0.99] transition ${className}`}
      >
        {isActivating ? (
          <Loader2 className="w-6 h-6 animate-spin" />
        ) : (
          <ShieldAlert className="w-6 h-6 animate-bounce" />
        )}
        <span>TRIGGER EMERGENCY SOS</span>
      </button>

      <SOSModal
        isOpen={sosModalOpen}
        onClose={() => setSosModalOpen(false)}
        sosEvent={activeSOS}
      />
    </>
  );
}
