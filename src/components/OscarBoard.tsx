import { useEffect, useState } from 'react';

export const OscarBoard = () => {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const response = await fetch('/api/oscar');
        const result = await response.json() as { url?: string; error?: string };
        if (!active) return;
        if (!response.ok || !result.url) {
          setError(result.error || 'Oscar is not reachable.');
          return;
        }
        setUrl(result.url);
      } catch {
        if (active) setError('Oscar is not reachable.');
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  if (error) {
    return (
      <section className="flex min-h-0 flex-1 items-center rounded-md border border-line bg-white px-4 py-6" aria-label="Oscar">
        <p className="text-base text-muted">{error}</p>
      </section>
    );
  }

  if (!url) {
    return <section className="min-h-0 flex-1" aria-label="Oscar" />;
  }

  return (
    <section className="flex min-h-0 flex-1" aria-label="Oscar">
      <iframe className="min-h-0 w-full flex-1 rounded-md border border-line bg-white" src={url} title="Oscar" />
    </section>
  );
};
