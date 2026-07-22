import React, { useEffect, useMemo, useState } from 'react';
import { listCases, getCase } from '../api/dataService';
import { generateCaseReport } from '../api/reportService';
import styles from './CasePanel.module.css';

/**
 * CasePanel — the app's home page.
 *
 * Case cards used to show only the raw CrimeNo (an 18-digit string) as
 * their headline, with almost no other context. This version:
 *  - headlines each card with the crime TYPE + status (resolved
 *    server-side by data-service, see backend/functions/data-service —
 *    enrichCases()), demoting the crime number to a small mono subtitle
 *  - adds a quick-stats strip (total / under investigation / closed)
 *  - adds search (by crime/case no.) and a status filter
 *  - flags heinous cases with a left accent + badge instead of hiding
 *    severity behind an opaque GravityOffenceID
 *  - gives the detail view real sections instead of a flat list, plus a
 *    one-click jump into the Criminal Network tab for the same case
 *
 * Props:
 *  - onSelectCase(caseId): notifies Dashboard which case is selected
 *  - onViewNetwork(caseId): asks Dashboard to switch to the Network tab
 */
export default function CasePanel({ onSelectCase, onViewNetwork }) {
  const [cases, setCases] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState(null);
  const [reportStatus, setReportStatus] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    const params = { limit: 50 };
    if (statusFilter) params.statusId = statusFilter;

    listCases(params)
      .then(res => setCases(res.cases || []))
      .catch(err => setError(err.message));
  }, [statusFilter]);

  const filteredCases = useMemo(() => {
    if (!search.trim()) return cases;
    const q = search.trim().toLowerCase();
    return cases.filter(c =>
      (c.CrimeNo || '').toLowerCase().includes(q) ||
      (c.CaseNo || '').toLowerCase().includes(q) ||
      (c.CrimeTypeName || '').toLowerCase().includes(q)
    );
  }, [cases, search]);

  const stats = useMemo(() => {
    const total = cases.length;
    const investigation = cases.filter(c => c.CaseStatusName === 'Under Investigation').length;
    const closed = cases.filter(c => c.CaseStatusName === 'Closed').length;
    return { total, investigation, closed };
  }, [cases]);

  async function selectCase(caseMasterId) {
    try {
      const detail = await getCase(caseMasterId);
      setSelected(detail);
      setSelectedId(caseMasterId);
      if (onSelectCase) onSelectCase(caseMasterId);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleGenerateReport() {
    if (!selected) return;
    setReportStatus('Generating…');
    try {
      const { report } = await generateCaseReport(selected.caseMaster.CaseMasterID);
      setReportStatus(`Report ready: ${report.name || report.id}`);
    } catch (err) {
      setReportStatus(`Failed: ${err.message}`);
    }
  }

  function statusBadgeClass(statusName) {
    if (statusName === 'Under Investigation') return styles.badgeInvestigation;
    if (statusName === 'Charge Sheeted') return styles.badgeChargesheeted;
    return styles.badgeClosed;
  }

  return (
    <div>
      <p className={styles.sectionLabel}>Cases</p>

      <div className={styles.statsStrip}>
        <div className={styles.statCell}>
          <span className={styles.statValue}>{stats.total}</span>
          <span className={styles.statLabel}>Total cases</span>
        </div>
        <div className={styles.statCell}>
          <span className={styles.statValue}>{stats.investigation}</span>
          <span className={styles.statLabel}>Under investigation</span>
        </div>
        <div className={styles.statCell}>
          <span className={styles.statValue}>{stats.closed}</span>
          <span className={styles.statLabel}>Closed</span>
        </div>
      </div>

      <div className={styles.layout}>
        <div className={styles.listColumn}>
          <div className={styles.toolbar}>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search crime no., case no., type…"
              className={styles.searchInput}
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className={styles.statusSelect}
            style={{ width: '100%', marginBottom: 12 }}
          >
            <option value="">All statuses</option>
            <option value="1">Under Investigation</option>
            <option value="2">Charge Sheeted</option>
            <option value="3">Closed</option>
          </select>

          {error && <p className={styles.errorText}>{error}</p>}
          {!error && filteredCases.length === 0 && (
            <p className={styles.emptyState}>No cases match your search.</p>
          )}

          <ul className={styles.list}>
            {filteredCases.map(c => (
              <li key={c.CaseMasterID}>
                <button
                  onClick={() => selectCase(c.CaseMasterID)}
                  className={
                    c.GravityName === 'Heinous'
                      ? styles.caseCardHeinous
                      : (c.CaseMasterID === selectedId ? styles.caseCardActive : styles.caseCard)
                  }
                >
                  <span className={styles.caseCardTitle}>
                    {c.CrimeTypeName || 'Unclassified'}
                  </span>
                  <span className={styles.caseCardMeta}>{c.CrimeNo || `Case #${c.CaseMasterID}`}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.detailColumn}>
          {!selected && <p className={styles.emptyState}>Select a case from the list to view its file.</p>}

          {selected && (
            <div>
              <div className={styles.detailHeader}>
                <h2 className={styles.detailTitle}>{selected.caseMaster.CrimeTypeName || 'Unclassified case'}</h2>
                <span className={statusBadgeClass(selected.caseMaster.CaseStatusName)}>
                  {selected.caseMaster.CaseStatusName}
                </span>
                {selected.caseMaster.GravityName === 'Heinous' && (
                  <span className={styles.badgeHeinous}>Heinous</span>
                )}
              </div>
              <p className={styles.detailCrimeNo}>
                {selected.caseMaster.CrimeNo} · registered {selected.caseMaster.CrimeRegisteredDate}
              </p>

              <p className={styles.briefFacts}>{selected.caseMaster.BriefFacts}</p>

              <div className={styles.detailGrid}>
                <div className={styles.detailBlock}>
                  <p className={styles.detailBlockLabel}>Complainants ({selected.complainants.length})</p>
                  {selected.complainants.length === 0 && <p className={styles.detailBlockRow}>None on file</p>}
                  {selected.complainants.map((p, i) => (
                    <div key={i} className={styles.detailBlockRow}>{p.ComplainantName} · age {p.AgeYear}</div>
                  ))}
                </div>

                <div className={styles.detailBlock}>
                  <p className={styles.detailBlockLabel}>Victims ({selected.victims.length})</p>
                  {selected.victims.length === 0 && <p className={styles.detailBlockRow}>None on file</p>}
                  {selected.victims.map((p, i) => (
                    <div key={i} className={styles.detailBlockRow}>{p.VictimName} · age {p.AgeYear}</div>
                  ))}
                </div>

                <div className={styles.detailBlock}>
                  <p className={styles.detailBlockLabel}>Accused ({selected.accused.length})</p>
                  {selected.accused.length === 0 && <p className={styles.detailBlockRow}>None on file</p>}
                  {selected.accused.map((p, i) => (
                    <div key={i} className={`${styles.detailBlockRow} mono`}>{p.PersonID} — {p.AccusedName}</div>
                  ))}
                </div>

                <div className={styles.detailBlock}>
                  <p className={styles.detailBlockLabel}>Acts &amp; Sections ({selected.actSections.length})</p>
                  {selected.actSections.length === 0 && <p className={styles.detailBlockRow}>None on file</p>}
                  {selected.actSections.map((a, i) => (
                    <div key={i} className={`${styles.detailBlockRow} mono`}>{a.ActID} §{a.SectionID}</div>
                  ))}
                </div>
              </div>

              <div className={styles.actionRow}>
                <button onClick={handleGenerateReport} className={styles.reportButton}>Generate PDF report</button>
                <button
                  onClick={() => onViewNetwork && onViewNetwork(selected.caseMaster.CaseMasterID)}
                  className={styles.networkButton}
                >
                  View criminal network →
                </button>
              </div>
              {reportStatus && <p className={styles.reportStatus}>{reportStatus}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
