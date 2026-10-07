import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Turns a crash into something readable.
 *
 * React unmounts the entire tree when a render throws, so without this a single
 * bad reference leaves a blank page and nothing on screen to say why. That is
 * exactly what happened here: the profile screen named a variable that did not
 * exist, and the symptom was an empty page on a sign-in that had worked.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('App crashed:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="auth-screen">
          <div className="auth-card">
            <h1>Something went wrong</h1>
            <p className="subtitle">The app hit an error it could not recover from.</p>
            <pre className="error-detail">{this.state.error.message}</pre>
            <button className="btn-primary full-width" onClick={() => window.location.reload()}>
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}