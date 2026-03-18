import { Component, type ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6" data-testid="error-boundary">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight">Something went wrong</h2>
              <p className="text-muted-foreground text-sm">
                An unexpected error occurred. Please try refreshing the page.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3">
              <Button onClick={this.handleReset} variant="outline" data-testid="button-try-again">
                <RefreshCw className="mr-2 h-4 w-4" />
                Try Again
              </Button>
              <Button onClick={() => window.location.reload()} data-testid="button-reload">
                Reload Page
              </Button>
            </div>
            {process.env.NODE_ENV !== "production" && this.state.error && (
              <pre className="mt-4 p-4 rounded-lg bg-muted text-left text-xs overflow-auto max-h-40">
                {this.state.error.message}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
