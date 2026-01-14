// app/hooks/useProvisioning.ts
import { useEffect, useRef, useState } from 'react';

export function useProvisioning(platformId: string | null) {
  const [state, setState] = useState('INIT');
  const [metadata, setMetadata] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<NodeJS.Timeout | null>(null);

  async function poll() {
    const res = await fetch(
      `/api/provision/status?platformId=${platformId}`,
      { cache: 'no-store' }
    );

    const json = await res.json();
    if (!res.ok) {
      setError(json.error);
      stop();
      return;
    }

    setState(json.state);
    setMetadata(json.metadata);

    if (json.state === 'COMPLETE' || json.state === 'FAILED') {
      stop();
    }
  }

  function start() {
    stop();
    poll();
    timer.current = setInterval(poll, 2500);
  }

  function stop() {
    if (timer.current) clearInterval(timer.current);
  }

  useEffect(() => {
    if (platformId) start();
    return stop;
  }, [platformId]);

  return { state, metadata, error };
}
