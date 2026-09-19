import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-6 font-sans">
          <div className="bg-slate-800 border border-slate-700 rounded-3xl p-8 max-w-lg w-full shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center mb-4 text-2xl font-bold">
              ⚠
            </div>
            <h1 className="text-xl font-display font-bold text-white mb-2">Something went wrong</h1>
            <p className="text-slate-400 text-xs mb-4 leading-relaxed">
              An application error occurred while rendering the page.
            </p>
            <div className="bg-slate-950 p-4 rounded-xl text-red-300 font-mono text-xs overflow-auto max-h-48 mb-6 border border-slate-800">
              {this.state.error?.toString()}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-display font-bold transition-colors"
              >
                Reload Application
              </button>
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.href = '/';
                }}
                className="py-3 px-4 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl text-xs font-display font-semibold transition-colors"
              >
                Reset Cache & Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
