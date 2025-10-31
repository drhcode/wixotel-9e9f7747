import React from "react";

interface State {
  hasError: boolean;
  error?: unknown;
}

export default class GlobalErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: unknown, errorInfo: unknown) {
    // Surface details to the console so we can capture Safari-specific crashes
    console.error("GlobalErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="max-w-md text-center space-y-3">
            <h1 className="text-2xl font-semibold">Something went wrong</h1>
            <p className="text-muted-foreground">Please refresh the page. If this keeps happening on Mobile Safari, let us know your iOS version.</p>
            <div className="text-left">
              <p className="text-sm font-medium mb-1">Error details</p>
              <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-48">
                {String(this.state.error)}
              </pre>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children as React.ReactNode;
  }
}
