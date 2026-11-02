import { Component, type ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';

export class RouteErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <div className="empty-state" role="alert">
          <RefreshCw size={30} />
          <h2>Nie udało się otworzyć tego widoku</h2>
          <p>
            Witryna mogła zostać zaktualizowana. Odśwież stronę, aby wczytać jej aktualną wersję.
            Odświeżenie nie usuwa zapisanych lokalnie plików ani postępów.
          </p>
          <button className="button primary" onClick={() => window.location.reload()}>
            <RefreshCw size={17} />
            Odśwież stronę
          </button>
        </div>
      );
    return this.props.children;
  }
}
