import React, { useState, useEffect } from 'react';
import { useAuth, API_BASE_URL } from '../context/AuthContext';
import { Users, Server, Shield, Plus, Database, CheckCircle, XCircle } from 'lucide-react';

export default function AdminDashboard() {
  const { token } = useAuth();
  const [courses, setCourses] = useState([]);
  const [stats, setStats] = useState({
    totalStudents: 120,
    totalFaculty: 12,
    databaseStatus: 'Optimal',
    systemUptime: '99.98%'
  });
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseCode, setNewCourseCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const fetchCourses = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/exams/courses`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setCourses(data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [token]);

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      const res = await fetch(`${API_BASE_URL}/exams/courses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newCourseName, code: newCourseCode })
      });
      if (res.ok) {
        setMessage('Course created successfully!');
        setNewCourseName('');
        setNewCourseCode('');
        fetchCourses();
      } else {
        const data = await res.json();
        setMessage(`Error: ${data.detail || 'Failed to create course'}`);
      }
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const statCards = [
    { label: 'Total Students',  value: stats.totalStudents,  icon: Users,     color: 'var(--brand-700)',   bg: 'var(--brand-100)' },
    { label: 'Total Faculty',   value: stats.totalFaculty,   icon: Shield,    color: 'var(--accent-600)',  bg: 'var(--accent-100)' },
    { label: 'DB Health',       value: stats.databaseStatus, icon: Database,  color: 'var(--success-600)', bg: 'var(--success-100)' },
    { label: 'System Uptime',   value: stats.systemUptime,   icon: Server,    color: 'var(--brand-600)',   bg: 'var(--brand-100)' },
  ];

  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* ── Welcome Banner ─────────────────────────────────────────────── */}
      <div
        className="card"
        style={{
          padding: '28px 32px',
          background: 'linear-gradient(135deg, var(--brand-800) 0%, var(--brand-700) 60%, var(--accent-600) 100%)',
          border: 'none',
          borderRadius: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
              Admin Control Panel 🛡️
            </h1>
            <p style={{ margin: '6px 0 0', fontSize: 14, color: 'rgba(255,255,255,0.65)' }}>
              Manage courses, faculty, students, and system-wide configurations.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 7, padding: '7px 14px',
              background: 'rgba(255,255,255,0.12)', border: '1.5px solid rgba(255,255,255,0.25)',
              borderRadius: 10, fontSize: 13, color: '#fff', fontWeight: 600,
            }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 0 2px rgba(74,222,128,0.35)' }} />
              Server: Connected
            </div>
          </div>
        </div>
      </div>

      {/* ── Stat Cards ─────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div key={i} className="card" style={{ padding: '20px 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {card.label}
                </p>
                <p style={{ margin: '6px 0 0', fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                  {card.value}
                </p>
              </div>
              <div style={{ width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: card.bg }}>
                <Icon size={20} color={card.color} />
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Two-Column Layout ──────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 20, alignItems: 'start' }}>

        {/* Create Course Form */}
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Register New Course</h3>

          {message && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 14px', borderRadius: 10, marginBottom: 14, fontSize: 13,
              background: message.startsWith('Error') ? 'var(--danger-100)' : 'var(--success-100)',
              color: message.startsWith('Error') ? 'var(--danger-600)' : 'var(--success-600)',
              border: `1px solid ${message.startsWith('Error') ? 'var(--danger-100)' : 'var(--success-100)'}`,
            }}>
              {message.startsWith('Error')
                ? <XCircle size={15} />
                : <CheckCircle size={15} />}
              {message}
            </div>
          )}

          <form onSubmit={handleCreateCourse} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label className="form-label">Course Name</label>
              <input
                type="text"
                required
                placeholder="Bachelor of Technology"
                value={newCourseName}
                onChange={(e) => setNewCourseName(e.target.value)}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Course Code</label>
              <input
                type="text"
                required
                placeholder="B-TECH"
                value={newCourseCode}
                onChange={(e) => setNewCourseCode(e.target.value)}
                className="form-input"
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Plus size={15} /> Add Course
            </button>
          </form>
        </div>

        {/* Registered Courses Table */}
        <div className="card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Registered Courses</h3>
            <span className="badge badge-blue">{courses.length} Total</span>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
              <div className="spinner" />
            </div>
          ) : courses.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 24px' }}>
              <Database size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px', display: 'block' }} />
              <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-secondary)', fontSize: 14 }}>No courses in the system yet</p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>Use the form to register the first course.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Course Name</th>
                    <th>Code</th>
                    <th>Subjects</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((course, idx) => (
                    <tr key={course.id}>
                      <td style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{idx + 1}</td>
                      <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{course.name}</td>
                      <td>
                        <span className="badge badge-indigo">{course.code}</span>
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>{course.subjects?.length || 0} subjects</td>
                      <td>
                        <span className="badge badge-green">Active</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* ── System Stats Card ──────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        {[
          { label: 'Total Exams Created',    value: '—', note: 'across all faculty',       color: 'var(--brand-700)' },
          { label: 'Average System Response', value: '120ms', note: 'API latency p95',       color: 'var(--accent-600)' },
          { label: 'Active Proctoring Sessions', value: '0', note: 'live right now',         color: 'var(--warning-600)' },
          { label: 'Database Records',        value: '—', note: 'total rows indexed',        color: 'var(--success-600)' },
        ].map((item, i) => (
          <div key={i} className="card" style={{ padding: '18px 20px', borderLeft: `4px solid ${item.color}` }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.label}</p>
            <p style={{ margin: '6px 0 2px', fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>{item.value}</p>
            <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>{item.note}</p>
          </div>
        ))}
      </div>

    </div>
  );
}
