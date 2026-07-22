import React, { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { getTrends } from '../api/analyticsService';
import styles from './TrendChart.module.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

/**
 * TrendChart
 * Renders analytics-service's monthly case counts (grouped by crime
 * sub-head) as a line chart via Chart.js.
 *
 * Props:
 *  - crimeHeadId: optional filter passed to /trends
 */
export default function TrendChart({ crimeHeadId }) {
  const [chartData, setChartData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError(null);
      try {
        const params = crimeHeadId ? { crimeHeadId } : {};
        const { trends } = await getTrends(params);
        if (cancelled) return;

        const months = Object.keys(trends).sort();
        const subHeadIds = new Set();
        months.forEach(m => Object.keys(trends[m]).forEach(id => subHeadIds.add(id)));

        // Chart.js needs plain color strings in its dataset config, not CSS
        // classes — pull them from the shared CSS custom properties
        // (styles/variables.css) so the palette still has one source of truth.
        const rootStyle = getComputedStyle(document.documentElement);
        const cssVar = (name, fallback) => rootStyle.getPropertyValue(name).trim() || fallback;
        const palette = [
          cssVar('--color-accent', '#f0a202'),
          cssVar('--color-flag', '#e4572e'),
          cssVar('--color-success', '#3ddc97'),
          cssVar('--color-text-lo', '#8b93a1')
        ];

        const datasets = Array.from(subHeadIds).map((subHeadId, i) => ({
          label: `Crime Sub-Head ${subHeadId}`,
          data: months.map(m => trends[m][subHeadId] || 0),
          borderColor: palette[i % palette.length],
          backgroundColor: palette[i % palette.length],
          tension: 0.25
        }));

        setChartData({ labels: months, datasets });
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [crimeHeadId]);

  if (error) return <p className={styles.errorText}>Failed to load trends: {error}</p>;
  if (!chartData) return <p style={{ color: 'var(--color-text-lo)' }}>Loading trend data…</p>;

  return (
    <div>
      <p className={styles.sectionLabel}>Trends</p>
      <div className={styles.chartWrapper}>
        <Line
          data={chartData}
          options={{
            responsive: true,
            plugins: {
              legend: {
                position: 'bottom',
                labels: { color: '#8b93a1', font: { family: 'Inter' } }
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                ticks: { precision: 0, color: '#8b93a1' },
                grid: { color: '#2a313c' }
              },
              x: {
                ticks: { color: '#8b93a1' },
                grid: { color: '#2a313c' }
              }
            }
          }}
        />
      </div>
    </div>
  );
}
