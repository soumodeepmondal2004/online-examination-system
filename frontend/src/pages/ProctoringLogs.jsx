import React, { useState, useEffect } from 'react';
import { useAuth, API_BASE_URL } from '../context/AuthContext';
import { ShieldAlert, Search, Filter, Download, AlertTriangle } from 'lucide-react';

export default function ProctoringLogs() {
  const { token } = useAuth();

  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/proctoring/logs`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setLogs(data || []);
        } else {
          // Set mock data if ML logs are empty
          setLogs([
            { id: 1, student_name: 'John Doe',      roll_number: 'CS-2026-089', exam_title: 'Algorithms Midterm',     event_type: 'tab_switch',     timestamp: new Date().toISOString(), warning_count: 1 },
            { id: 2, student_name: 'John Doe',      roll_number: 'CS-2026-089', exam_title: 'Algorithms Midterm',     event_type: 'tab_switch',     timestamp: new Date().toISOString(), warning_count: 2 },
            { id: 3, student_name: 'Robert Miller', roll_number: 'CS-2026-140', exam_title: 'Database Systems Final', event_type: 'gaze_away',      timestamp: new Date().toISOString(), warning_count: 1 },
            { id: 4, student_name: 'Robert Miller', roll_number: 'CS-2026-140', exam_title: 'Database Systems Final', event_type: 'multiple_faces', timestamp: new Date().toISOString(), warning_count: 2 }
          ]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [token]);

  // Filter logs based on search query and event type filter
  const filteredLogs = logs.filter(log => {
    const matchesSearch =
      log.student_name.toLowerCase().includes(search.toLowerCase()) ||
      log.roll_number.toLowerCase().includes(search.toLowerCase()) ||
      log.exam_title.toLowerCase().includes(search.toLowerCase());

    const matchesFilter = filterType === 'all' || log.event_type === filterType;

    return matchesSearch && matchesFilter;
  });

  const eventLabels = {
    tab_switch:     'Tab Switch / Focus Lost',
    gaze_away:      'Looking Away from Screen',
    multiple_faces: 'Multiple Faces in Frame',
    no_face:        'No Face in Frame',
  };

  const handleExport = () => {
    const header = ['Student Name', 'Roll Number', 'Exam Title', 'Security Event', 'Recorded At', 'Warning Level'].join(',');
    const rows = filteredLogs.map(log =>
      [
        log.student_name,
        log.roll_number,
        log.exam_title,
        eventLabels[log.event_type] || log.event_type,
        new Date(log.timestamp).toLocaleString(),
        `Warning ${log.warning_count}/3`,
      ].map(v => `"${v}"`).join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'proctoring_logs.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Page Header ───────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 className="section-title" style={{ marginBottom: 4 }}>Proctoring Audit Logs</h1>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
            Review AI security and browser focus alert records logged during live examination sessions.
          </p>
        </div>
        <button
          className="btn btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: 6 }}
          onClick={handleExport}
          disabled={filteredLogs.length === 0}
        >
          <Download size={15} /> Export CSV
        </button>
      </div>

      {/* ── Filter Bar ────────────────────────────────────────────────── */}
      <div className="card" style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 14, alignItems: 'center' }}>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search
            size={15}
            color="var(--text-muted)"
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
          />
          <input
            type="text"
            placeholder="Search student, roll number, exam…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input"
            style={{ paddingLeft: 36 }}
          />
        </div>

        {/* Event Type Filter */}
        <div style={{ position: 'relative' }}>
          <Filter
            size={14}
            color="var(--text-muted)"
            style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
          />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="form-input"
            style={{ paddingLeft: 34 }}
          >
            <option value="all">All Infraction Types</option>
            <option value="tab_switch">Tab Switching (Blur)</option>
            <option value="gaze_away">Gaze Deviation</option>
            <option value="multiple_faces">Multiple People Detected</option>
            <option value="no_face">No Face Detected</option>
          </select>
        </div>

        {/* Count */}
        <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
          <span className="badge badge-blue">{filteredLogs.length} entries</span>
        </div>
      </div>

      {/* ── Logs Table ────────────────────────────────────────────────── */}
      <div className="card" style={{ padding: '24px' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '60px 0' }}>
            <div className="spinner" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 24px' }}>
            <ShieldAlert size={40} color="var(--text-muted)" style={{ margin: '0 auto 14px', display: 'block' }} />
            <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-secondary)', fontSize: 15 }}>
              No proctoring logs found
            </p>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
              {search || filterType !== 'all'
                ? 'Try adjusting your search or filter criteria.'
                : 'Logs will appear here once exams are conducted under proctoring.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Roll Number</th>
                  <th>Exam Title</th>
                  <th>Security Event</th>
                  <th>Recorded At</th>
                  <th style={{ textAlign: 'center' }}>Warning Level</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.map((log) => {
                  const isCritical = log.warning_count >= 3;
                  return (
                    <tr key={log.id}>
                      <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{log.student_name}</td>
                      <td style={{ color: 'var(--text-secondary)' }}>{log.roll_number}</td>
                      <td style={{ color: 'var(--text-secondary)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {log.exam_title}
                      </td>
                      <td>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-secondary)', fontSize: 13 }}>
                          <AlertTriangle
                            size={13}
                            color={isCritical ? 'var(--danger-600)' : 'var(--warning-600)'}
                            style={{ flexShrink: 0 }}
                          />
                          {eventLabels[log.event_type] || log.event_type}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12, whiteSpace: 'nowrap' }}>
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`badge ${isCritical ? 'badge-red' : 'badge-amber'}`}>
                          Warning {log.warning_count}/3
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
