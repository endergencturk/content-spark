import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  /** Optional reset key — when it changes, the boundary resets */
  resetKey?: string | number;
  /** Compact inline fallback instead of a full hero card */
  compact?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Surface the error so we can debug in console / logs
    console.error("[ErrorBoundary]", error, info?.componentStack);
  }

  componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false, error: null });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    const message = this.state.error?.message || "Something went wrong while rendering this section.";

    if (this.props.compact) {
      return (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0 space-y-2">
            <p className="text-sm font-semibold text-foreground">Couldn't render this section</p>
            <p className="text-xs text-muted-foreground break-words">{message}</p>
            <button
              onClick={this.handleRetry}
              className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
            >
              <RefreshCw className="h-3 w-3" /> Try again
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-3xl border border-destructive/30 bg-destructive/5 p-6 text-center space-y-4">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-destructive/15 flex items-center justify-center">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-foreground">Something went wrong</h2>
            <p className="text-sm text-muted-foreground break-words">{message}</p>
          </div>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={this.handleRetry}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <RefreshCw className="h-4 w-4" /> Try again
            </button>
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-muted/40 transition-colors"
            >
              Reload page
            </button>
          </div>
        </div>
      </div>
    );
  }
}
