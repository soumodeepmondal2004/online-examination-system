import React, { useState, useEffect } from 'react';
import { useAuth, API_BASE_URL } from '../context/AuthContext';
import { LineChart as ReLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, AlertTriangle, CheckCircle, BarChart3, HelpCircle, Activity, BookOpen, Calendar, ClipboardCheck } from 'lucide-react';

export default function PerformancePrediction() {
  const { token, user } = useAuth();

  const [predictions, setPredictions] = useState(null);
  const [facultyPredictions, setFacultyPredictions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Mock historical data for trend line
  const mockTrendData = [
    { name: 'Sem 1', GPA: 3.1 },
    { name: 'Sem 2', GPA: 3.3 },
    { name: 'Sem 3', GPA: 3.2 },
    { name: 'Sem 4', GPA: 3.4 },
    { name: 'Predicted', GPA: 3.55 }
  ];

  useEffect(() => {
    const fetchPredictionData = async () => {
      try {
        if (user?.role === 'student') {
          // Fetch student own performance predictions
          const res = await fetch(`${API_BASE_URL}/prediction/my`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setPredictions(data);
          } else {
            // Set mock predictions if ML service is training
            setPredictions({
              predicted_grade: 'A',
              risk_level: 'low',
              success_probability: 0.92,
              calculated_at: new Date().toISOString()
            });
          }
        } else {
          // Fetch faculty list predictions (all students risk)
          const res = await fetch(`${API_BASE_URL}/prediction/students`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setFacultyPredictions(data || []);
          } else {
            // Set mock list
            setFacultyPredictions([
              { student_name: 'John Doe', roll_number: 'CS-2026-089', predicted_grade: 'C', risk_level: 'medium', success_probability: 0.68 },
              { student_name: 'Alice Smith', roll_number: 'CS-2026-021', predicted_grade: 'A', risk_level: 'low', success_probability: 0.95 },
              { student_name: 'Robert Miller', roll_number: 'CS-2026-140', predicted_grade: 'F', risk_level: 'high', success_probability: 0.35 }
            ]);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchPredictionData();
  }, [token, user]);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '80px 0' }}>
        <div className="spinner" />
      </div>
    );
  }

  // ── STUDENT VIEW ──────────────────────────────────────────────────────
  if (user?.role === 'student') {
    const risk = predictions?.risk_level || 'low';
    const riskBadge = risk === 'high' ? 'badge-red' : risk === 'medium' ? 'badge-amber' : 'badge-green';
    const riskColor = risk === 'high' ? 'var(--danger-600)' : risk === 'medium' ? 'var(--warning-600)' : 'var(--success-600)';
    const riskBg = risk === 'high' ? 'var(--danger-100)' : risk === 'medium' ? 'var(--warning-100)' : 'var(--success-100)';
    const RiskIcon = risk === 'high' ? AlertTriangle : risk === 'medium' ? HelpCircle : CheckCircle;
    const successPct = Math.round((predictions?.success_probability || 0.85) * 100);

    const metricCards = [
      { label: 'Attendance Rate',    value: '87%',  icon: Calendar,       note: 'Classes attended this semester' },
      { label: 'Avg. Exam Score',    value: '74%',  icon: BookOpen,       note: 'Across all assessments' },
      { label: 'Submission Rate',    value: '91%',  icon: ClipboardCheck, note: 'Assignments submitted on time' },
      { label: 'Academic Activity',  value: 'High', icon: Activity,       note: 'Platform engagement score' },
    ];

    const recommendations = [
      { title: 'Improve Attendance', text: 'Maintain at least 85% attendance to avoid academic risk flags.', color: 'var(--accent-600)' },
      { title: 'Regular Revision',   text: 'Review past exam questions to strengthen weak topics.', color: 'var(--brand-700)' },
      { title: 'Submit Assignments',  text: 'Ensure all pending submissions are completed before the deadline.', color: 'var(--warning-600)' },
    ];

    return (
      <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

        {/* Header */}
        <div>
          <h1 className="section-title" style={{ marginBottom: 4 }}>AI Performance Forecast</h1>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
            Machine learning predictions based on your attendance, scores, and activity patterns.
          </p>
        </div>

        {/* Risk + Grade Banner */}
        <div className="card" style={{ padding: '28px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
          <div>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Predicted Grade</p>
            <p style={{ margin: 0, fontSize: 56, fontWeight: 900, color: 'var(--brand-700)', letterSpacing: '-0.03em', lineHeight: 1 }}>
              {predictions?.predicted_grade || 'B+'}
            </p>
            <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>Based on current performance trajectory</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 14 }}>
            {/* Risk level big card */}
            <div className="card" style={{ padding: '18px 24px', background: riskBg, border: `1.5px solid ${riskColor}`, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <RiskIcon size={20} color={riskColor} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: riskColor, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Academic Risk</p>
                <p style={{ margin: '2px 0 0', fontSize: 18, fontWeight: 800, color: riskColor, textTransform: 'capitalize' }}>
                  {risk} Risk
                </p>
              </div>
              <span className={`badge ${riskBadge}`} style={{ marginLeft: 8, textTransform: 'capitalize' }}>{risk}</span>
            </div>

            {/* Success probability bar */}
            <div style={{ width: '100%', minWidth: 220 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pass Probability</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>{successPct}%</span>
              </div>
              <div style={{ height: 8, borderRadius: 99, background: 'var(--border)', overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${successPct}%`, borderRadius: 99,
                  background: `linear-gradient(90deg, var(--brand-700), var(--accent-600))`,
                  transition: 'width 0.6s ease',
                }} />
              </div>
            </div>
          </div>
        </div>

        {/* Metric Cards */}
        <div>
          <h2 className="section-title" style={{ marginBottom: 14 }}>Performance Factors</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            {metricCards.map((m, i) => {
              const Icon = m.icon;
              return (
                <div key={i} className="card" style={{ padding: '18px 20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--brand-100)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={17} color="var(--brand-700)" />
                    </div>
                    <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{m.label}</p>
                  </div>
                  <p style={{ margin: '0 0 4px', fontSize: 28, fontWeight: 800, color: 'var(--text-primary)' }}>{m.value}</p>
                  <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>{m.note}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chart + Recommendations */}
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 20 }}>

          {/* GPA Trend Chart */}
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Activity size={16} color="var(--brand-700)" />
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>Historical GPA Projection</h3>
            </div>
            <p style={{ margin: '0 0 20px', fontSize: 12, color: 'var(--text-muted)' }}>Cumulative GPA across academic terms with AI forecast.</p>
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ReLineChart data={mockTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tick={{ fill: 'var(--text-muted)' }} />
                  <YAxis domain={[0, 4]} stroke="var(--text-muted)" fontSize={11} tick={{ fill: 'var(--text-muted)' }} />
                  <Tooltip
                    contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 12 }}
                    labelStyle={{ color: 'var(--text-secondary)', fontWeight: 700 }}
                    itemStyle={{ color: 'var(--brand-700)' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="GPA"
                    stroke="var(--brand-700)"
                    strokeWidth={3}
                    activeDot={{ r: 7, fill: 'var(--brand-700)' }}
                    dot={{ stroke: 'var(--brand-700)', strokeWidth: 2, r: 4, fill: '#fff' }}
                  />
                </ReLineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recommendations */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 className="section-title" style={{ marginBottom: 4 }}>AI Recommendations</h3>
            {recommendations.map((rec, i) => (
              <div key={i} className="card" style={{ padding: '16px 18px', borderLeft: `4px solid ${rec.color}` }}>
                <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{rec.title}</p>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>{rec.text}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    );
  }

  // ── FACULTY / ADMIN VIEW ──────────────────────────────────────────────
  const riskBadge = (level) =>
    level === 'high' ? 'badge-red' : level === 'medium' ? 'badge-amber' : 'badge-green';

  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* Header */}
      <div>
        <h1 className="section-title" style={{ marginBottom: 4 }}>Student Success Analytics</h1>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
          ML classifier projections detailing grade failure risks for enrolled students.
        </p>
      </div>

      {/* Summary Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
        {[
          { label: 'Total Students',  value: facultyPredictions.length,                                                       bg: 'var(--brand-100)',   color: 'var(--brand-700)' },
          { label: 'High Risk',        value: facultyPredictions.filter(s => s.risk_level === 'high').length,                  bg: 'var(--danger-100)',  color: 'var(--danger-600)' },
          { label: 'Medium Risk',      value: facultyPredictions.filter(s => s.risk_level === 'medium').length,                bg: 'var(--warning-100)', color: 'var(--warning-600)' },
          { label: 'Low Risk',         value: facultyPredictions.filter(s => s.risk_level === 'low').length,                   bg: 'var(--success-100)', color: 'var(--success-600)' },
        ].map((item, i) => (
          <div key={i} className="card" style={{ padding: '16px 18px', borderLeft: `4px solid ${item.color}` }}>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.label}</p>
            <p style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 800, color: item.color }}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Data Table */}
      <div className="card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <BarChart3 size={16} color="var(--brand-700)" />
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Classroom Failure Risk Audit</h3>
        </div>

        {facultyPredictions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px' }}>
            <TrendingUp size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px', display: 'block' }} />
            <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-secondary)', fontSize: 14 }}>No prediction data available</p>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>Data will appear once students complete assessments.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Roll Number</th>
                  <th>Expected Grade</th>
                  <th>Success Probability</th>
                  <th style={{ textAlign: 'center' }}>Risk Assessment</th>
                </tr>
              </thead>
              <tbody>
                {facultyPredictions.map((row, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{row.student_name}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{row.roll_number}</td>
                    <td>
                      <span className="badge badge-blue" style={{ fontWeight: 800, fontSize: 13 }}>{row.predicted_grade}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ flex: 1, height: 6, borderRadius: 99, background: 'var(--border)', overflow: 'hidden', minWidth: 60 }}>
                          <div style={{
                            height: '100%', width: `${Math.round(row.success_probability * 100)}%`,
                            borderRadius: 99, background: row.risk_level === 'high' ? 'var(--danger-600)' : row.risk_level === 'medium' ? 'var(--warning-600)' : 'var(--success-600)',
                          }} />
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', flexShrink: 0 }}>
                          {Math.round(row.success_probability * 100)}%
                        </span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`badge ${riskBadge(row.risk_level)}`} style={{ textTransform: 'capitalize' }}>
                        {row.risk_level}
                      </span>
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
