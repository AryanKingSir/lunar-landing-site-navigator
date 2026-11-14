import { useStore } from '../store';

export function StatusBanner() {
  const server = useStore((s) => s.server);
  const sitesError = useStore((s) => s.sitesError);
  const retryAll = useStore((s) => s.retryAll);

  let message: string | null = null;
  let retry = false;
  if (server === 'waking') message = 'Waking the server. This can take up to a minute.';
  else if (server === 'down') { message = "Can't reach the server."; retry = true; }
  else if (sitesError) { message = "Couldn't load the site list."; retry = true; }
  if (!message) return null;

  return (
    <div className="status-banner" role="status">
      <span>{message}</span>
      {retry && <button onClick={() => void retryAll()}>Try again</button>}
    </div>
  );
}
