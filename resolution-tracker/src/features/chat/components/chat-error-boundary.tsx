"use client";

import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ChatErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Chat error:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col h-full p-4">
          <div className="flex-1 flex flex-col items-center justify-center gap-4">
            <div className="text-[var(--terminal-amber-dim)] terminal-glow">
              SYSTEM: An error occurred in the chat interface.
            </div>
            <div className="text-[var(--terminal-amber)] terminal-glow text-sm">
              {this.state.error?.message || "Unknown error"}
            </div>
            <button
              onClick={this.handleRetry}
              className="px-4 py-2 border border-[var(--terminal-amber)] text-[var(--terminal-amber)] hover:bg-[var(--terminal-amber)] hover:text-[var(--terminal-bg)] transition-colors terminal-glow"
            >
              RETRY
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
