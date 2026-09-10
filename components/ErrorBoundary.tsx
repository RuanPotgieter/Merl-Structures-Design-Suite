import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('CAD Viewport Caught Exception:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-[#f0f8ff] p-6 text-center text-[#475569]">
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl mb-3 text-rose-400">
            <AlertTriangle size={28} />
          </div>
          <h3 className="text-sm font-mono font-bold text-[#0f172a] mb-1">
            {this.props.fallbackTitle || 'Rendering Error Recovered'}
          </h3>
          <p className="text-xs font-mono text-[#64748b] max-w-md mb-4 leading-relaxed">
            A transient graphical calculation occurred. Your input data is preserved.
          </p>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-md bg-[#dcebf0] hover:bg-cyan-600 hover:text-white border border-cyan-600/30 text-xs font-mono text-cyan-600 font-semibold transition-all"
          >
            <RefreshCw size={13} />
            <span>Restore Viewport</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
