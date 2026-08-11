"use client";

import React from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="h-full w-full flex flex-col items-center justify-center p-8 bg-[var(--bg)] min-h-screen text-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md bg-[var(--surface)] border border-[var(--error)]/20 p-8 rounded-2xl flex flex-col items-center shadow-2xl"
          >
            <div className="w-16 h-16 rounded-full bg-[rgba(255,77,77,0.1)] flex items-center justify-center mb-6">
              <AlertTriangle className="w-8 h-8 text-[#FF4D4D]" />
            </div>
            <h2 className="text-xl font-display font-bold text-[var(--text-1)] mb-2">Something went wrong</h2>
            <p className="text-[13px] text-[var(--text-2)] mb-8 leading-relaxed">
              The AI investigation workspace encountered an unexpected error. Your video data is safe, but the dashboard needs to be reloaded.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 bg-white text-black px-6 py-3 rounded-lg font-medium text-[13px] hover:bg-[var(--accent)] transition-colors"
            >
              <RefreshCcw className="w-4 h-4" />
              Reload Workspace
            </button>
            
            {process.env.NODE_ENV === "development" && this.state.error && (
              <div className="mt-6 p-4 bg-[var(--bg)] rounded-lg border border-[var(--border)] text-left w-full overflow-auto max-h-40">
                <p className="text-[10px] text-[#FF4D4D] font-mono whitespace-pre-wrap">
                  {this.state.error.message}
                </p>
              </div>
            )}
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}
