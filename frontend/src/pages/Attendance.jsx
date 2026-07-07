import React, { useState, useEffect, useRef } from 'react';
import { useAuth, API_BASE_URL } from '../context/AuthContext';
import { Camera, CheckCircle, RefreshCw, UserCheck, Calendar, AlertCircle, Trash2, Trash } from 'lucide-react';
import Webcam from 'react-webcam';

export default function Attendance() {
  const { token, user } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [logs, setLogs] = useState([]);

  // Webcam & Status states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [marking, setMarking] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [isRegistered, setIsRegistered] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState(true);

  const webcamRef = useRef(null);

  const fetchLogsAndSubjects = async () => {
    try {
      const subRes = await fetch(`${API_BASE_URL}/exams/subjects`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (subRes.ok) {
        const subData = await subRes.json();
        setSubjects(subData || []);
        if (subData.length > 0) setSelectedSubjectId(subData[0].id.toString());
      }

      if (user?.role === 'student') {
        const meRes = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (meRes.ok) {
          const meData = await meRes.json();
          setIsRegistered(!!meData.student?.face_encoding);
        }

        const logRes = await fetch(`${API_BASE_URL}/attendance/logs/my`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (logRes.ok) {
          const logData = await logRes.json();
          setLogs(logData || []);
        }
      } else {
        const logRes = await fetch(`${API_BASE_URL}/attendance/logs`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (logRes.ok) {
          const logData = await logRes.json();
          setLogs(logData || []);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchLogsAndSubjects();
  }, [token, user]);

  const handleRegisterFace = async () => {
    if (!webcamRef.current) return;
    setRegistering(true);
    setStatusMsg('');

    try {
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) throw new Error("Could not capture snapshot from webcam.");

      const base64Image = imageSrc.includes(',') ? imageSrc.split(',')[1] : imageSrc;

      const res = await fetch(`${API_BASE_URL}/attendance/register-face`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ image_base64: base64Image })
      });

      const data = await res.json();
      if (res.ok) {
        setIsRegistered(true);
        setStatusMsg('✅ Face profile registered! You can now mark attendance.');
      } else {
        setStatusMsg(`Registration failed: ${data.detail || 'Error'}`);
      }
    } catch (err) {
      setStatusMsg(`Error: ${err.message}`);
    } finally {
      setRegistering(false);
    }
  };

  const handleMarkAttendance = async () => {
    if (!webcamRef.current || !selectedSubjectId) return;
    setMarking(true);
    setStatusMsg('');

    try {
      const imageSrc = webcamRef.current.getScreenshot();
      if (!imageSrc) throw new Error("Could not capture snapshot from webcam.");

      const base64Image = imageSrc.includes(',') ? imageSrc.split(',')[1] : imageSrc;

      const res = await fetch(`${API_BASE_URL}/attendance/mark`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          subject_id: parseInt(selectedSubjectId),
          image_base64: base64Image
        })
      });

      const data = await res.json();
      if (res.ok) {
        setStatusMsg(data.message || 'Attendance marked successfully!');
        fetchLogsAndSubjects();
      } else {
        setStatusMsg(`Verification failed: ${data.detail || 'Face did not match.'}`);
      }
    } catch (err) {
      setStatusMsg(`Error: ${err.message}`);
    } finally {
      setMarking(false);
    }
  };

  const isError = statusMsg && (statusMsg.toLowerCase().startsWith('error') || statusMsg.toLowerCase().includes('failed'));

  // Delete a single log (faculty/admin)
  const handleDeleteLog = async (logId) => {
    if (!window.confirm('Delete this attendance record?')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/attendance/logs/${logId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setLogs(prev => prev.filter(l => l.id !== logId));
      } else {
        const d = await res.json();
        alert(d.detail || 'Failed to delete record.');
      }
    } catch (e) {
      alert(`Error: ${e.message}`);
    }
  };

  // Delete ALL of today's attendance (faculty/admin)
  const handleDeleteToday = async () => {
    const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    if (!window.confirm(`Delete ALL attendance records for today (${today})?\n\nThis cannot be undone.`)) return;
    try {
      const res = await fetch(`${API_BASE_URL}/attendance/logs/today/all`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const d = await res.json();
      if (res.ok) {
        setLogs([]);
        alert(d.message);
      } else {
        alert(d.detail || 'Failed to delete today\'s records.');
      }
    } catch (e) {
      alert(`Error: ${e.message}`);
    }
  };

  const handleDeleteMyToday = async (logId) => {
    if (!window.confirm('Delete your attendance record for today? You can re-mark it again with your face.')) return;
    try {
      const res = await fetch(`${API_BASE_URL}/attendance/logs/my/today`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const d = await res.json();
      if (res.ok) {
        setLogs(prev => prev.filter(l => l.id !== logId));
        setStatusMsg('');
      } else {
        alert(d.detail || 'Could not delete today\'s record.');
      }
    } catch (e) {
      alert(`Error: ${e.message}`);
    }
  };

  // ─── FACULTY / ADMIN VIEW ────────────────────────────────────────────────────
  if (user?.role !== 'student') {
    return (
      <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div>
          <h1 className="section-title" style={{ marginBottom: '0.25rem' }}>Attendance Records</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
            Biometric attendance logs for all enrolled students.
          </p>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.625rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <Calendar style={{ width: 18, height: 18, color: 'var(--accent-600)' }} />
              <h2 style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary)', margin: 0 }}>
                Biometric Attendance Logs
              </h2>
              <span className="badge badge-blue">{logs.length} records</span>
            </div>
            <button
              className="btn btn-danger"
              style={{ fontSize: 12, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 6 }}
              onClick={handleDeleteToday}
            >
              <Trash size={13} /> Delete Today's
            </button>
          </div>

          {loadingLogs ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
              <div className="spinner" />
            </div>
          ) : logs.length === 0 ? (
            <div style={{ padding: '4rem', textAlign: 'center' }}>
              <Calendar style={{ width: 44, height: 44, color: 'var(--text-muted)', margin: '0 auto 0.75rem' }} />
              <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', margin: 0 }}>No attendance logs saved yet.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Roll Number</th>
                    <th>Date / Time</th>
                    <th>Method</th>
                    <th style={{ textAlign: 'right' }}>Status</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{log.student_name}</td>
                      <td>
                        <span className="badge badge-indigo">{log.roll_number}</span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textTransform: 'capitalize' }}>
                        {log.verification_method.replace('_', ' ')}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span className={`badge ${log.status === 'present' ? 'badge-green' : 'badge-red'}`}>
                          {log.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn btn-ghost"
                          title="Delete this record"
                          onClick={() => handleDeleteLog(log.id)}
                          style={{ padding: '4px 8px', color: 'var(--danger-600)' }}
                          onMouseEnter={e => e.currentTarget.style.background = 'var(--danger-100)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── STUDENT VIEW ────────────────────────────────────────────────────────────
  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h1 className="section-title" style={{ marginBottom: '0.25rem' }}>Attendance</h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
          Mark your attendance using facial recognition.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1.25rem', alignItems: 'start' }}>

        {/* ── LEFT PANEL: Webcam ─────────────────────────────────────────────── */}
        <div className="card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Panel Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem',
            borderBottom: '1px solid var(--border)', paddingBottom: '0.875rem' }}>
            <div className="stat-blue" style={{ width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Camera style={{ width: 16, height: 16 }} />
            </div>
            <div>
              <h2 style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary)', margin: 0 }}>
                Mark Self Attendance
              </h2>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>Biometric verification</p>
            </div>
          </div>

          {/* Subject Selector */}
          <div>
            <label className="form-label">Select Lecture Subject</label>
            <select
              className="form-input"
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
            >
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
              ))}
            </select>
          </div>

          {/* Camera Area */}
          {isCameraActive ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div style={{
                width: '100%', aspectRatio: '4/3', borderRadius: 12,
                overflow: 'hidden', border: '2px solid var(--border-strong)',
                background: 'var(--surface-2)', position: 'relative'
              }}>
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {!isRegistered ? (
                  <button
                    className="btn btn-primary"
                    onClick={handleRegisterFace}
                    disabled={registering}
                    style={{ justifyContent: 'center', width: '100%' }}
                  >
                    {registering && <RefreshCw style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />}
                    <span>Register Face Profile</span>
                  </button>
                ) : (
                  <>
                    <button
                      className="btn btn-success"
                      onClick={handleMarkAttendance}
                      disabled={marking || !selectedSubjectId}
                      style={{ justifyContent: 'center', width: '100%' }}
                    >
                      {marking
                        ? <RefreshCw style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />
                        : <UserCheck style={{ width: 14, height: 14 }} />
                      }
                      <span>Verify Face</span>
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={handleRegisterFace}
                      disabled={registering}
                      style={{ justifyContent: 'center', width: '100%' }}
                    >
                      {registering && <RefreshCw style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />}
                      <span>Update Face</span>
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setIsCameraActive(false)}
                  style={{ justifyContent: 'center', width: '100%', fontSize: '0.8125rem' }}
                >
                  Turn Off Camera
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '1.5rem 0', textAlign: 'center' }}>
              <div style={{
                width: 64, height: 64, borderRadius: 16,
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <Camera style={{ width: 28, height: 28, color: 'var(--text-muted)' }} />
              </div>
              <div>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '0.25rem' }}>
                  Mark attendance securely using biometric verification.
                </p>
                {!isRegistered && (
                  <p style={{ fontSize: '0.8125rem', color: 'var(--warning-600)', margin: 0 }}>
                    First time? Register your face in good lighting, facing the camera directly.
                  </p>
                )}
              </div>
              <button
                className="btn btn-primary"
                onClick={() => setIsCameraActive(true)}
                style={{ justifyContent: 'center', width: '100%' }}
              >
                <Camera style={{ width: 15, height: 15 }} />
                Turn On Webcam
              </button>
            </div>
          )}

          {/* Status Message */}
          {statusMsg && (
            <div style={{
              padding: '0.875rem 1rem',
              borderRadius: 10,
              fontSize: '0.875rem',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.5rem',
              lineHeight: 1.5,
              background: isError ? 'var(--danger-100)' : 'var(--success-100)',
              color: isError ? 'var(--danger-600)' : 'var(--success-600)',
              border: `1px solid ${isError ? 'var(--danger-600)' : 'var(--success-600)'}`,
              borderOpacity: 0.2
            }}>
              {isError
                ? <AlertCircle style={{ width: 16, height: 16, flexShrink: 0, marginTop: 2 }} />
                : <CheckCircle style={{ width: 16, height: 16, flexShrink: 0, marginTop: 2 }} />
              }
              <span>{statusMsg}</span>
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL: Attendance Logs ───────────────────────────────────── */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.625rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <Calendar style={{ width: 18, height: 18, color: 'var(--accent-600)' }} />
              <h2 style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary)', margin: 0 }}>
                My Attendance Logs
              </h2>
              <span className="badge badge-blue">{logs.length} records</span>
            </div>
            {logs.some(l => l.timestamp && new Date(l.timestamp).toDateString() === new Date().toDateString()) && (
              <button
                className="btn btn-danger"
                style={{ fontSize: 12, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 6 }}
                onClick={() => {
                  const todayLog = logs.find(l => l.timestamp && new Date(l.timestamp).toDateString() === new Date().toDateString());
                  if (todayLog) handleDeleteMyToday(todayLog.id);
                }}
              >
                <Trash size={13} /> Delete Today's
              </button>
            )}
          </div>

          {loadingLogs ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
              <div className="spinner" />
            </div>
          ) : logs.length === 0 ? (
            <div style={{ padding: '4rem', textAlign: 'center' }}>
              <Calendar style={{ width: 44, height: 44, color: 'var(--text-muted)', margin: '0 auto 0.75rem' }} />
              <p style={{ fontSize: '0.9375rem', color: 'var(--text-muted)', margin: 0 }}>
                No attendance logs saved yet.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date / Time</th>
                    <th>Method</th>
                    <th style={{ textAlign: 'right' }}>Status</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} style={{
                      background: log.timestamp && new Date(log.timestamp).toDateString() === new Date().toDateString()
                        ? 'var(--brand-50)' : 'transparent'
                    }}>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                        {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'}
                      </td>
                      <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textTransform: 'capitalize' }}>
                        {log.verification_method.replace('_', ' ')}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span className={`badge ${log.status === 'present' ? 'badge-green' : 'badge-red'}`}>
                          {log.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {log.timestamp && new Date(log.timestamp).toDateString() === new Date().toDateString() && (
                          <button
                            className="btn btn-ghost"
                            title="Delete today's record"
                            onClick={() => handleDeleteMyToday(log.id)}
                            style={{ padding: '4px 8px', color: 'var(--danger-600)' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--danger-100)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
