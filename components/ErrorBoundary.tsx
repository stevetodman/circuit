'use client';

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * P0-6: Error boundary — catches render errors in child panels so a crash
 * in one overlay (Sidebar, Oscilloscope, Schematic) doesn't take down the
 * whole app. The 3D canvas continues to run.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return this.props.fallback ?? (
        <div className="p-4 text-red-400 text-sm font-mono">
          Panel error: {this.state.error.message}
        </div>
      );
    }
    return this.props.children;
  }
}
