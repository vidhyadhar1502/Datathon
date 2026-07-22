import React, { useState } from 'react';
import HotspotMap from './components/HotspotMap';
import TrendChart from './components/TrendChart';
import CasePanel from './components/CasePanel';
import CriminalNetworkGraph from './components/CriminalNetworkGraph';
import ChatAssistant from './components/ChatAssistant';
import styles from './Dashboard.module.css';

const TABS = [
  { key: 'cases', label: 'Cases' },
  { key: 'hotspots', label: 'Hotspots' },
  { key: 'trends', label: 'Trends' },
  { key: 'network', label: 'Network' },
  { key: 'assistant', label: 'Assistant' }
];

/**
 * Dashboard
 * Top-level layout wiring together every module built so far. Navigation
 * uses a "folder tab" motif — each tab is a case file pulled forward from
 * the cabinet strip above the active panel. See docs/frontend/design.md.
 */
export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('cases');
  const [selectedCaseId, setSelectedCaseId] = useState(null);

  return (
    <div className={styles.page}>
      <div className={styles.topbar}>
        <h1 className={styles.wordmark}>DRISHTI<span>.</span></h1>
        <span className={styles.tagline}>Crime Intelligence Platform</span>
      </div>

      <nav className={styles.tabStrip}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={activeTab === tab.key ? styles.tabActive : styles.tab}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className={styles.panel}>
        {activeTab === 'cases' && (
          <CasePanel
            onSelectCase={setSelectedCaseId}
            onViewNetwork={(caseId) => { setSelectedCaseId(caseId); setActiveTab('network'); }}
          />
        )}
        {activeTab === 'hotspots' && <HotspotMap />}
        {activeTab === 'trends' && <TrendChart />}
        {activeTab === 'network' && (
          selectedCaseId
            ? <CriminalNetworkGraph mode="case" id={selectedCaseId} />
            : <p style={{ color: 'var(--color-text-lo)' }}>Select a case in the Cases tab first to view its network.</p>
        )}
        {activeTab === 'assistant' && <ChatAssistant />}
      </div>
    </div>
  );
}
