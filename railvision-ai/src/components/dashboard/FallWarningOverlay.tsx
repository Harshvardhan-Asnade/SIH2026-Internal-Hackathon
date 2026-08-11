import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { useWorkspaceStore } from '@/lib/store';

export default function FallWarningOverlay() {
  const fallWarning = useWorkspaceStore(state => state.fallWarning);
  const setFallWarning = useWorkspaceStore(state => state.setFallWarning);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (fallWarning.visible && fallWarning.timestamp) {
      // Clear any existing timer
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Start exactly 3000ms timer
      timeoutRef.current = setTimeout(() => {
        setFallWarning({ visible: false });
      }, 3000);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [fallWarning.visible, fallWarning.timestamp, setFallWarning]);

  return (
    <AnimatePresence>
      {fallWarning.visible && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="absolute top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
          role="alert"
          aria-live="assertive"
        >
          <div className="bg-[#1A1A1A]/90 backdrop-blur-md text-white px-8 py-4 rounded-xl shadow-[0_12px_40px_rgba(255,77,77,0.3)] flex items-center gap-5 border border-[#FF4D4D]/50 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-[#FF4D4D]/20 to-transparent pointer-events-none" />
            <div className="w-12 h-12 bg-[#FF4D4D]/20 rounded-full flex items-center justify-center shrink-0 border border-[#FF4D4D]/30 shadow-[0_0_15px_rgba(255,77,77,0.4)]">
              <AlertTriangle className="w-6 h-6 text-[#FF4D4D] animate-pulse" />
            </div>
            <div className="relative z-10">
              <h2 className="text-xl font-sans font-extrabold text-[#FF4D4D] uppercase tracking-tight mb-1">
                Fall Detected
              </h2>
              {fallWarning.trackId && (
                <p className="text-sm text-white/90 font-mono uppercase tracking-wider">
                  Person ID: {fallWarning.trackId}
                </p>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
