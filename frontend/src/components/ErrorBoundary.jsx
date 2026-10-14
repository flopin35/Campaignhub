import { Component } from 'react';
import { RefreshCw, TriangleAlert } from 'lucide-react';

const CHUNK_ERROR = /dynamically imported module|Importing a module script failed|Failed to fetch dynamically|error loading dynamically|ChunkLoadError|Loading chunk/i;
const RELOAD_KEY = 'ch-chunk-reload';

/** After a new deploy, an open tab may ask for a file that no longer exists — reload once to get the new version. */
export function reloadOnceForNewVersion() {
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
    if (Date.now() - last < 30000) return false;
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    /* storage blocked — still try one reload */
  }
  window.location.reload();
  return true;
}

/**
 * Keeps one broken screen from blanking the whole app.
 * <ErrorBoundary resetKey={pathname} compact>…</ErrorBoundary>
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
    if (CHUNK_ERROR.test(String(error?.message || error)) && reloadOnceForNewVersion()) return;
    console.error('[ui] render error', error, info?.componentStack);
  }

  componentDidUpdate(prevProps) {
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    const isUpdate = CHUNK_ERROR.test(String(this.state.error?.message || this.state.error));
    return (
      <div className={this.props.compact ? 'py-16 px-4' : 'min-h-[60vh] grid place-items-center px-4 py-16'}>
        <div className="card card-pad max-w-md mx-auto text-center">
          <div className="mx-auto w-12 h-12 rounded-2xl bg-warning-soft text-warning grid place-items-center mb-4">
            <TriangleAlert className="w-6 h-6" aria-hidden />
          </div>
          <h2 className="text-lg font-bold">{isUpdate ? 'CampaignHub was just updated' : 'Something went wrong on this screen'}</h2>
          <p className="text-sm text-ink-3 mt-2">
            {isUpdate
              ? 'Reload to get the latest version. Nothing you saved has been lost.'
              : 'Your data is safe. Reload the page — if it keeps happening, contact support and tell us what you clicked.'}
          </p>
          <button type="button" className="btn btn-primary btn-md mt-5" onClick={() => window.location.reload()}>
            <RefreshCw className="w-4 h-4" aria-hidden /> Reload
          </button>
        </div>
      </div>
    );
  }
}
