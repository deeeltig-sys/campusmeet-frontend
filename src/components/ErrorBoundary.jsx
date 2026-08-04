import { Component } from 'react';

/**
 * Before this, there was no error boundary anywhere in the app. Any
 * uncaught error during render — a bad shape in a real post/status/
 * poll from the live database, a null reference, anything — takes
 * down the entire React tree with nothing shown and no way back
 * except a hard refresh. That's the actual mechanism behind "the app
 * turns blank a few seconds after loading": it isn't blank because
 * nothing happened, it's blank because something threw and React had
 * nowhere left to render.
 *
 * This doesn't fix whatever the underlying bug is (different crashes
 * have different causes) — it converts the SYMPTOM from "dead white
 * screen, no idea why" into "a real, visible message, plus a reload
 * button, plus a console.error with the actual stack" so any future
 * crash is diagnosable instead of silent.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('CampusMEET crashed:', error, info?.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 16, padding: 24, textAlign: 'center',
          background: '#faf6f0', color: '#1a1210', fontFamily: 'sans-serif',
        }}>
          <p style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>Something went wrong.</p>
          <p style={{ fontSize: '0.9rem', color: '#6b5f57', margin: 0, maxWidth: 320 }}>
            This screen ran into a problem. Reloading usually fixes it — if it keeps happening,
            let the team know what you were doing right before this appeared.
          </p>
          <button
            type="button"
            onClick={this.handleReload}
            style={{
              padding: '10px 22px', borderRadius: 999, border: 'none', background: '#7a2436',
              color: '#fff', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
