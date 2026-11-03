import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
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
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4 font-sans text-stone-900">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-stone-200 p-8 text-center space-y-4">
            <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
              !
            </div>
            <h1 className="text-xl font-bold tracking-tight text-stone-900">
              Παρουσιάστηκε σφάλμα
            </h1>
            <p className="text-sm text-stone-600 leading-relaxed">
              Υπήρξε ένα απροσδόκητο πρόβλημα κατά τη φόρτωση της εφαρμογής. Παρακαλούμε ανανεώστε τη σελίδα.
            </p>
            {this.state.error && (
              <div className="text-xs bg-stone-100 p-3 rounded-lg text-stone-700 font-mono text-left overflow-auto max-h-32">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}
            <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-6 py-2.5 bg-stone-900 text-white text-sm font-medium rounded-xl hover:bg-stone-800 transition"
              >
                Ανανέωση Σελίδας
              </button>
              <a
                href="mailto:aristeaamnta@gmail.com"
                className="px-6 py-2.5 bg-stone-100 text-stone-800 text-sm font-medium rounded-xl hover:bg-stone-200 transition inline-flex items-center justify-center"
              >
                Επικοινωνία
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

