import React, { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import { getPersonNetwork, getCaseNetwork } from '../api/networkService';
import styles from './CriminalNetworkGraph.module.css';

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

        // Cytoscape needs its style values as a JS config, not a linked
        // stylesheet — it can't read .module.css classes directly. To
        // still keep colors defined in one place, pull the values from
        // the shared CSS custom properties (styles/variables.css) at
        // render time rather than hardcoding hex codes here.
        const rootStyle = getComputedStyle(document.documentElement);
        const cssVar = (name, fallback) => rootStyle.getPropertyValue(name).trim() || fallback;

        cy = cytoscape({
          container: containerRef.current,
          elements,
          style: [
            {
              selector: 'node',
              style: {
                'background-color': cssVar('--color-flag', '#e4572e'),
                label: 'data(label)',
                color: cssVar('--color-text-hi', '#e8eaed'),
                'font-family': 'IBM Plex Mono, monospace',
                'font-size': 10,
                'text-valign': 'bottom',
                'text-margin-y': 4
              }
            },
            {
              selector: `node[id="${id}"]`,
              style: { 'background-color': cssVar('--color-accent', '#f0a202'), width: 34, height: 34 }
            },
            {
              selector: 'edge',
              style: {
                width: 1.5,
                'line-color': cssVar('--color-border-strong', '#3a4350'),
                'curve-style': 'bezier',
                label: 'data(label)',
                'font-family': 'Inter, sans-serif',
                'font-size': 8,
                color: cssVar('--color-text-lo', '#8b93a1')
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
      <p className={styles.sectionLabel}>Network</p>
      {loading && <p style={{ color: 'var(--color-text-lo)' }}>Loading network…</p>}
      {error && <p className={styles.errorText}>Failed to load network: {error}</p>}
      <div ref={containerRef} className={styles.graphContainer} />
    </div>
  );
}
