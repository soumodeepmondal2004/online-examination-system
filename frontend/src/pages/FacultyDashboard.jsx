import React, { useState, useEffect } from 'react';
import { useAuth, API_BASE_URL } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Plus, BookOpen, Users, AlertTriangle, CheckSquare, ArrowRight, Clipboard, Activity, Shield } from 'lucide-react';

export default function FacultyDashboard() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [stats, setStats] = useState({
    totalStudents: 120,
    examsCount: 0,
    pendingGrading: 4,
    proctoringAlerts: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFacultyData = async () => {
      try {
        // Fetch exams created by this teacher
        const examsRes = await fetch(`${API_BASE_URL}/exams/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (examsRes.ok) {
          const examsData = await examsRes.json();
          setExams(examsData || []);
          setStats(prev => ({ ...prev, examsCount: (examsData || []).length }));
        }

        // Fetch proctoring logs count
        const proctorRes = await fetch(`${API_BASE_URL}/proctoring/logs`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (proctorRes.ok) {
          const proctorData = await proctorRes.json();
          setStats(prev => ({ ...prev, proctoringAlerts: (proctorData || []).length }));
        }
      } catch (err) {
        console.error("Error fetching faculty data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchFacultyData();
  }, [token]);

  const statCards = [
    { label: 'Students Enrolled', value: stats.totalStudents,    icon: Users,         color: 'var(--brand-700)',   bg: 'var(--brand-100)' },
    { label: 'Total Exams',       value: stats.examsCount,       icon: BookOpen,      color: 'var(--accent-600)',  bg: 'var(--accent-100)' },
    { label: 'Pending Review',    value: stats.pendingGrading,   icon: CheckSquare,   color: 'var(--warning-600)', bg: 'var(--warning-100)' },
    { label: 'Proctoring Alerts', value: stats.proctoringAlerts, icon: AlertTriangle, color: 'var(--danger-600)',  bg: 'var(--danger-100)' },
  ];

  const facultyName = user?.full_name?.split(' ')[0] || user?.username || 'Professor';

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
              Welcome, {facultyName}! 🎓
            </h1>
            <p style={{ margin: '6px 0 0', fontSize: 14, color: 'rgba(255,255,255,0.65)' }}>
              Create examinations, review AI proctoring logs, and analyze student performance.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              className="btn btn-secondary"
              style={{ background: 'rgba(255,255,255,0.12)', color: '#fff', border: '1.5px solid rgba(255,255,255,0.28)' }}
              onClick={() => navigate('/exams')}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.22)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
            >
              Manage Exams
            </button>
            <button
              className="btn"
              style={{ background: '#fff', color: 'var(--brand-800)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}
              onClick={() => navigate('/exams')}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--brand-50)'}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}
            >
              <Plus size={15} /> Create Exam
            </button>
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

      {/* ── Main Content ───────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>

        {/* Exams List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 className="section-title">Recent Exams</h2>
            <button onClick={() => navigate('/exams')} className="btn btn-ghost" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px' }}>
              Manage All <ArrowRight size={12} />
            </button>
          </div>

          {loading ? (
            <div className="card" style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
              <div className="spinner" />
            </div>
          ) : exams.length === 0 ? (
            <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
              <BookOpen size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px', display: 'block' }} />
              <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-secondary)', fontSize: 14 }}>No exams created yet</p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>Click "Create Exam" in the banner to get started.</p>
              <button className="btn btn-primary" style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => navigate('/exams')}>
                <Plus size={14} /> Create Your First Exam
              </button>
            </div>
          ) : (
            exams.map((exam) => {
              const start = new Date(exam.start_time);
              const end = new Date(exam.end_time);
              const now = new Date();
              const isActive = start <= now && now <= end;
              const isUpcoming = now < start;

              return (
                <div key={exam.id} className="card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1, minWidth: 0 }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%', marginTop: 6, flexShrink: 0,
                      background: isActive ? 'var(--success-600)' : isUpcoming ? 'var(--warning-600)' : 'var(--text-muted)',
                      boxShadow: isActive ? '0 0 0 3px rgba(5,150,105,0.2)' : 'none',
                    }} />
                    <div style={{ minWidth: 0 }}>
                      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {exam.title}
                      </h3>
                      <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {exam.description}
                      </p>
                      <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                        {exam.duration_minutes} min &bull; {start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {isActive ? (
                      <span className="badge badge-green">Active</span>
                    ) : isUpcoming ? (
                      <span className="badge badge-amber">Upcoming</span>
                    ) : (
                      <span className="badge">Ended</span>
                    )}
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: 12, padding: '5px 12px' }}
                      onClick={() => navigate(`/exams?evaluate=${exam.id}`)}
                    >
                      Grade
                    </button>
                    <button
                      className="btn btn-ghost"
                      style={{ fontSize: 12, padding: '5px 12px', color: 'var(--danger-600)', border: '1px solid var(--danger-100)' }}
                      onClick={() => navigate(`/proctoring-logs?exam=${exam.id}`)}
                    >
                      Proctoring
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Quick Actions + System Status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Quick Actions */}
          <div className="card" style={{ padding: '20px 22px' }}>
            <h3 style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>Quick Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Mark Face Attendance', path: '/attendance', color: 'var(--brand-700)' },
                { label: 'Student Risk Predictor', path: '/prediction', color: 'var(--accent-600)' },
                { label: 'AI Proctoring Logs', path: '/proctoring-logs', color: 'var(--danger-600)' },
              ].map((item, i) => (
                <button
                  key={i}
                  onClick={() => navigate(item.path)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', borderRadius: 10, background: 'var(--surface-2)',
                    border: '1px solid var(--border)', cursor: 'pointer', transition: 'all 0.18s',
                    fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = item.color; e.currentTarget.style.background = 'var(--surface)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface-2)'; }}
                >
                  <span>{item.label}</span>
                  <ArrowRight size={14} color="var(--text-muted)" />
                </button>
              ))}
            </div>
          </div>

          {/* System Status */}
          <div className="card" style={{ padding: '20px 22px', borderLeft: '4px solid var(--success-600)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success-600)', boxShadow: '0 0 0 3px rgba(5,150,105,0.2)' }} />
              <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>AI Engine Active</h4>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Face Recognition Attendance and Proctoring monitoring APIs are online. All tracking services are operational.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
