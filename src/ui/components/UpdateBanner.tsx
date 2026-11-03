import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * Tells the learner a new version is ready. Reloading is left to them so an
 * update never interrupts a lesson.
 */
export function UpdateBanner() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) {
    return null;
  }
  return (
    <div className="update-banner" role="status">
      <span>A new version is available.</span>
      <button type="button" className="button button--small button--primary" onClick={() => void updateServiceWorker(true)}>
        Reload
      </button>
      <button type="button" className="button button--small" onClick={() => setNeedRefresh(false)}>
        Later
      </button>
    </div>
  );
}
