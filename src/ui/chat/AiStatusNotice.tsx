import { Link } from 'react-router-dom';
import { AiStatus } from '../../domain/ai/types';

/**
 * Explains why AI chat can't be used right now. Renders nothing while the AI
 * is online, so the rest of the app never depends on the Mac being awake.
 */
export function AiStatusNotice({ status, onRetry }: { status: AiStatus; onRetry?: () => void }) {
  switch (status) {
    case AiStatus.ONLINE:
      return null;
    case AiStatus.CHECKING:
      return <p className="muted small centered">Connecting to your AI server…</p>;
    case AiStatus.NOT_CONFIGURED:
      return (
        <section className="card card--tip">
          <p>
            AI chat runs on your Mac. Run <code>tools/start-ai.sh</code> there, then paste the address it shows in{' '}
            <Link to="/settings">Settings → AI tutor</Link>.
          </p>
        </section>
      );
    case AiStatus.MODEL_MISSING:
      return (
        <section className="card card--tip">
          <p>
            Your AI server is online but the chosen model isn't installed. Pick one in <Link to="/settings">Settings</Link>.
          </p>
        </section>
      );
    case AiStatus.OFFLINE:
      return (
        <section className="card card--tip">
          <p>
            Can't reach your Mac. Is <code>tools/start-ai.sh</code> running? It gets a new address each time it starts,
            so paste the new one in <Link to="/settings">Settings</Link>.
          </p>
          {onRetry && (
            <button type="button" className="button button--small button--secondary" onClick={onRetry}>
              Try again
            </button>
          )}
        </section>
      );
  }
}
