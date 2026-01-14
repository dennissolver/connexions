// app/hooks/useProvisioning.ts
import { useEffect, useRef, useState } from 'react';

export function useProvisioning(
  platformName: string,
  publicBaseUrl: string
) {
  const [state, setState] = useState<string>('INIT');
  const [metadata, setMetadata] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const timer = useRef<NodeJS.Timeout | null>(null);

  async function poll() {
    try {
      setLoading(true);

      const res = await fetch('/api/setup/create-supabase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platformName,
          publicBaseUrl,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Provisioning failed');
      }

      setState(json.state);
      setMetadata(json.metadata);

      if (json.state === 'COMPLETE' || json.state === 'FAILED') {
        stop();
      }
    } catch (err: any) {
      setError(err.message);
      stop();
    } finally {
      setLoading(false);
    }
  }

  function start() {
    stop();
    poll();
    timer.current = setInterval(poll, 3000);
  }

  function stop() {
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
  }

  useEffect(() => {
    if (platformName && publicBaseUrl) {
      start();
    }
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platformName, publicBaseUrl]);

  return {
    state,
    metadata,
    loading,
    error,
    isComplete: state === 'COMPLETE',
    isFailed: state === 'FAILED',
  };
}

