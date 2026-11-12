'use client';
import { useEffect, useId, useState } from 'react';

/** Renders a Mermaid diagram on the client, themed with Rho's tokens. */
export function Mermaid({ chart }: { chart: string }) {
  const id = useId().replace(/:/g, '');
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mermaid = (await import('mermaid')).default;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          theme: 'base',
          fontFamily: 'var(--font-manrope), sans-serif',
          themeVariables: {
            primaryColor: '#ffffff',
            primaryBorderColor: '#ced4ce',
            primaryTextColor: '#151716',
            lineColor: '#737c78',
            secondaryColor: '#f7f9f8',
            tertiaryColor: '#f7f9f8',
            clusterBkg: '#f7f9f8',
            clusterBorder: '#d7e0de',
            fontSize: '14px',
          },
          flowchart: { curve: 'basis', padding: 14, nodeSpacing: 36, rankSpacing: 54 },
        });
        const { svg } = await mermaid.render(`m${id}`, chart);
        if (!cancelled) setSvg(svg);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not render the diagram');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chart, id]);

  if (error) return <pre className="overflow-auto rounded-lg border bg-white p-4 text-xs text-negative">{error}</pre>;
  if (!svg) return <div className="h-96 animate-pulse rounded-lg bg-accent" />;
  // Mermaid's own output, rendered with securityLevel 'strict' from a diagram defined in this file.
  return <div className="flex justify-center overflow-x-auto [&_svg]:h-auto [&_svg]:max-w-full" dangerouslySetInnerHTML={{ __html: svg }} />;
}
