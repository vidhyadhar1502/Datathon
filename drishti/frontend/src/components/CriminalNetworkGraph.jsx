import React, { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import { getPersonNetwork, getCaseNetwork } from '../api/networkService';

/**
 * CriminalNetworkGraph
 * Renders a co-accused + manual-association graph via Cytoscape.js.
 *
 * Props:
 *  - mode: 'person' | 'case'
 *  - id: accusedId (mode='person') or caseId (mode='case')
 *  - depth: BFS depth, only used in 'person' mode (default 2)
 */
export default function CriminalNetworkGraph({ mode = 'person', id, depth = 2 }) {
  const containerRef = useRef(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cy;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const graph = mode === 'case'
          ? await getCaseNetwork(id)
          : await getPersonNetwork(id, depth);

        if (cancelled || !containerRef.current) return;

        const elements = [
          ...graph.nodes.map(n => ({
            data: { id: n.id, label: `#${n.id}` }
          })),
          ...graph.edges.map(e => ({
            data: {
              id: `${e.source}-${e.target}-${e.relation}`,
              source: e.source,
              target: e.target,
              label: e.relation
            }
          }))
        ];

        cy = cytoscape({
          container: containerRef.current,
          elements,
          style: [
            {
              selector: 'node',
              style: {
                'background-color': '#b91c1c',
                label: 'data(label)',
                color: '#1f2937',
                'font-size': 10,
                'text-valign': 'bottom',
                'text-margin-y': 4
              }
            },
            {
              selector: `node[id="${id}"]`,
              style: { 'background-color': '#1d4ed8', width: 34, height: 34 }
            },
            {
              selector: 'edge',
              style: {
                width: 2,
                'line-color': '#9ca3af',
                'curve-style': 'bezier',
                label: 'data(label)',
                'font-size': 8,
                color: '#6b7280'
              }
            }
          ],
          layout: { name: 'cose', animate: false }
        });
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
      if (cy) cy.destroy();
    };
  }, [mode, id, depth]);

  return (
    <div>
      {loading && <p>Loading network…</p>}
      {error && <p style={{ color: '#b91c1c' }}>Failed to load network: {error}</p>}
      <div
        ref={containerRef}
        style={{ width: '100%', height: 480, border: '1px solid #e5e7eb', borderRadius: 8 }}
      />
    </div>
  );
}
