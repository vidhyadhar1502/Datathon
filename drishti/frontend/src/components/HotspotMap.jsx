import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getHotspots } from '../api/analyticsService';
import styles from './HotspotMap.module.css';

/**
 * HotspotMap
 * Renders analytics-service's grid-aggregated case counts as circle
 * markers sized/colored by count, using Leaflet.js.
 *
 * Props:
 *  - center: [lat, lng] initial map center (default: Bengaluru)
 *  - filters: passed straight through as query params to /hotspots
 *             (fromDate, toDate, crimeHeadId)
 */
export default function HotspotMap({ center = [12.9716, 77.5946], filters = {} }) {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = L.map(containerRef.current).setView(center, 12);
    mapRef.current = map;

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
    }).addTo(map);

    return () => map.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const { hotspots } = await getHotspots(filters);
        if (cancelled || !mapRef.current) return;

        const maxCount = Math.max(1, ...hotspots.map(h => h.count));

        hotspots.forEach(h => {
          const radius = 200 + (h.count / maxCount) * 800; // metres
          L.circle([h.latitude, h.longitude], {
            radius,
            className: styles.hotspotCircle,
            weight: 1
          })
            .bindTooltip(`${h.count} case(s)`)
            .addTo(mapRef.current);
        });
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters)]);

  return (
    <div>
      <p className={styles.sectionLabel}>Hotspots</p>
      {loading && <p style={{ color: 'var(--color-text-lo)' }}>Loading hotspot data…</p>}
      {error && <p className={styles.errorText}>Failed to load hotspots: {error}</p>}
      <div ref={containerRef} className={styles.mapContainer} />
      <p className={styles.caption}>grid size ≈ 1.1km · case count per cell</p>
    </div>
  );
}
