import React, { useState, useEffect } from 'react';
import { useAuth, API_BASE_URL } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Calendar, Award, ArrowRight, Play, Activity, TrendingUp, Clock } from 'lucide-react';

export default function StudentDashboard() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [results, setResults] = useState([]);
  const [stats, setStats] = useState({ attendance: '87%', activeExams: 0, gpa: '3.4', risk: 'Low' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [examsRes, resultsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/exams/`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE_URL}/exams/results/my`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (examsRes.ok) {
          const data = await examsRes.json();
          setExams(data || []);
          const now = new Date();
          setStats(p => ({
            ...p,
            activeExams: (data || []).filter(e => new Date(e.start_time) <= now && now <= new Date(e.end_time)).length
          }));
        }
        if (resultsRes.ok) setResults((await resultsRes.json()) || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [token]);

  const statCards = [
    { label: 'Attendance Rate', value: stats.attendance,   icon: Calendar,    cls: 'stat-green',  iconColor: '#059669' },
    { label: 'Active Exams',    value: stats.activeExams,  icon: BookOpen,    cls: 'stat-blue',   iconColor: '#2b5282' },
    { label: 'Predicted GPA',   value: stats.gpa,          icon: TrendingUp,  cls: 'stat-indigo', iconColor: '#4f46e5' },
    { label: 'Performance Risk',value: stats.risk,         icon: Activity,    cls: 'stat-teal',   iconColor: '#0891b2' },
  ];

  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* ── Welcome banner ──────────────────────────────────────────────── */}
      <div className="card" style={{ padding: '28px 32px', background: 'linear-gradient(135deg, var(--brand-900) 0%, var(--brand-700) 100%)', border: 'none', borderRadius: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' }}>
              Welcome back, {user?.student?.full_name?.split(' ')[0]}! 👋
            </h1>
            <p style={{ margin: '6px 0 0', fontSize: 14, color: 'rgba(255,255,255,0.65)' }}>
              Access your exams, attendance, and AI-powered study tools.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn btn-secondary" style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1.5px solid rgba(255,255,255,0.25)' }}
              onClick={() => navigate('/study-assistant')}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            >
              AI Study Partner
            </button>
            <button className="btn" style={{ background: '#fff', color: 'var(--brand-800)', fontWeight: 700 }}
              onClick={() => navigate('/exams')}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--brand-50)'}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}
            >
              View Exams
            </button>
          </div>
        </div>
      </div>

      {/* ── Stat cards ──────────────────────────────────────────────────── */}
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
              <div className={card.cls} style={{ width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon size={20} color={card.iconColor} />
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Two-column content ──────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>

        {/* Exams list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 className="section-title">Active &amp; Upcoming Exams</h2>
            <button onClick={() => navigate('/exams')} className="btn btn-ghost" style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px' }}>
              View All <ArrowRight size={12} />
            </button>
          </div>

          {loading ? (
            <div className="card" style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
              <div className="spinner" />
            </div>
          ) : exams.length === 0 ? (
            <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
              <BookOpen size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px', display: 'block' }} />
              <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-secondary)', fontSize: 14 }}>No examinations scheduled right now</p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>Check back later or ask your faculty advisor</p>
            </div>
          ) : (
            exams.map(exam => {
              const now   = new Date();
              const start = new Date(exam.start_time);
              const end   = new Date(exam.end_time);
              const isActive   = start <= now && now <= end;
              const isUpcoming = now < start;
              return (
                <div key={exam.id} className="card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flex: 1, minWidth: 0 }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%', marginTop: 6, flexShrink: 0,
                      background: isActive ? '#059669' : isUpcoming ? '#d97706' : '#94a3b8',
                      boxShadow: isActive ? '0 0 0 3px rgba(5,150,105,0.2)' : 'none',
                    }} className={isActive ? 'pulse-dot' : ''} />
                    <div style={{ minWidth: 0 }}>
                      <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {exam.title}
                      </h3>
                      <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {exam.description}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 6 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Clock size={10} /> {exam.duration_minutes} min
                        </span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                  {isActive ? (
                    <button className="btn btn-success" style={{ fontSize: 12, padding: '7px 16px' }} onClick={() => navigate(`/exam/${exam.id}`)}>
                      <Play size={12} style={{ fill: 'currentColor' }} /> Start Exam
                    </button>
                  ) : isUpcoming ? (
                    <span className="badge badge-amber">Upcoming</span>
                  ) : (
                    <span className="badge" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>Expired</span>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Recent Results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 className="section-title">Recent Results</h2>
          {loading ? (
            <div className="card" style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
              <div className="spinner" />
            </div>
          ) : results.length === 0 ? (
            <div className="card" style={{ padding: '48px 24px', textAlign: 'center' }}>
              <Award size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px', display: 'block' }} />
              <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-secondary)', fontSize: 14 }}>No results published yet</p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>Complete examinations to view scores</p>
            </div>
          ) : (
            results.map(res => (
              <div key={res.id} className="card" style={{ padding: '16px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <h4 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {res.exam_title || 'General Examination'}
                    </h4>
                    <p style={{ margin: '3px 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                      {new Date(res.submitted_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`badge ${res.status === 'pass' ? 'status-pass badge-green' : 'status-fail badge-red'}`} style={{ marginLeft: 8, flexShrink: 0 }}>
                    {res.status.toUpperCase()}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid var(--border)' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Score</p>
                    <p style={{ margin: '2px 0 0', fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>{res.percentage}%</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: 0, fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Grade</p>
                    <p style={{ margin: '2px 0 0', fontSize: 20, fontWeight: 800, color: 'var(--accent-600)' }}>{res.grade}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
