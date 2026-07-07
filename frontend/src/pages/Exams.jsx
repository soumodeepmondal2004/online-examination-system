import React, { useState, useEffect } from 'react';
import { useAuth, API_BASE_URL } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Plus, Calendar, Clock, Trash, HelpCircle, Save, FileText, X } from 'lucide-react';

export default function Exams() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [exams, setExams] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // New Exam Form Fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [duration, setDuration] = useState(60);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [randomize, setRandomize] = useState(false);

  // Questions list
  const [questions, setQuestions] = useState([
    { question_text: '', question_type: 'MCQ', options: ['', '', '', ''], correct_answer: 'A', marks: 1 }
  ]);

  const fetchExamsAndSubjects = async () => {
    try {
      const examRes = await fetch(`${API_BASE_URL}/exams/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (examRes.ok) {
        const data = await examRes.json();
        setExams(data || []);
      }

      if (user?.role === 'faculty') {
        const subRes = await fetch(`${API_BASE_URL}/exams/subjects`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (subRes.ok) {
          const subData = await subRes.json();
          setSubjects(subData || []);
          if (subData.length > 0) setSubjectId(subData[0].id.toString());
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExamsAndSubjects();
  }, [token, user]);

  const addQuestionField = () => {
    setQuestions([...questions, { question_text: '', question_type: 'MCQ', options: ['', '', '', ''], correct_answer: 'A', marks: 1 }]);
  };

  const removeQuestionField = (idx) => {
    if (questions.length === 1) return;
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const handleQuestionChange = (idx, field, value) => {
    const updated = [...questions];
    updated[idx][field] = value;
    setQuestions(updated);
  };

  const handleOptionChange = (qIdx, optIdx, value) => {
    const updated = [...questions];
    updated[qIdx].options[optIdx] = value;
    setQuestions(updated);
  };

  const handleCreateExam = async (e) => {
    e.preventDefault();
    try {
      const formattedQuestions = questions.map(q => {
        const isMcq = q.question_type === 'MCQ';
        return {
          question_text: q.question_text,
          question_type: q.question_type,
          options: isMcq ? q.options : null,
          correct_answer: q.correct_answer,
          marks: q.marks
        };
      });

      const res = await fetch(`${API_BASE_URL}/exams/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          description,
          subject_id: parseInt(subjectId),
          duration_minutes: duration,
          start_time: startTime,
          end_time: endTime,
          randomize_questions: randomize,
          questions: formattedQuestions
        })
      });

      if (res.ok) {
        setShowCreateForm(false);
        setTitle('');
        setDescription('');
        setQuestions([{ question_text: '', question_type: 'MCQ', options: ['', '', '', ''], correct_answer: 'A', marks: 1 }]);
        fetchExamsAndSubjects();
      } else {
        const errorData = await res.json();
        alert(`Error creating exam: ${errorData.detail || 'Request failed'}`);
      }
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  // ─── STUDENT VIEW ────────────────────────────────────────────────────────────
  if (user?.role === 'student') {
    return (
      <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Page Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 className="section-title" style={{ marginBottom: '0.25rem' }}>Examinations</h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
              Select and attempt examinations assigned to your courses.
            </p>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '5rem 0' }}>
            <div className="spinner" />
          </div>
        ) : exams.length === 0 ? (
          <div className="card" style={{ padding: '4rem', textAlign: 'center' }}>
            <BookOpen style={{ width: 48, height: 48, color: 'var(--text-muted)', margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              No Exams Registered
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
              There are currently no exams assigned to your roll number.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
            {exams.map((exam) => {
              const now = new Date();
              const start = new Date(exam.start_time);
              const end = new Date(exam.end_time);
              const isActive = start <= now && now <= end;
              const isUpcoming = now < start;

              return (
                <div key={exam.id} className="card fade-up" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {/* Card Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.375rem' }}>
                        {isActive && (
                          <span className="pulse-dot" style={{
                            display: 'inline-block',
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: 'var(--success-600)',
                            boxShadow: '0 0 0 0 var(--success-600)',
                            animation: 'pulse-ring 1.5s ease-out infinite',
                            flexShrink: 0
                          }} />
                        )}
                        <h3 style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9375rem', margin: 0 }}>
                          {exam.title}
                        </h3>
                      </div>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5,
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {exam.description}
                      </p>
                    </div>
                    <span className={`badge ${isActive ? 'badge-green' : isUpcoming ? 'badge-amber' : ''}`}
                      style={!isActive && !isUpcoming ? { color: 'var(--text-muted)', background: 'var(--surface-2)', border: '1px solid var(--border)' } : {}}>
                      {isActive ? 'LIVE' : isUpcoming ? 'Upcoming' : 'Expired'}
                    </span>
                  </div>

                  {/* Meta Info */}
                  <div style={{ display: 'flex', gap: '1.25rem', borderTop: '1px solid var(--border)', paddingTop: '0.875rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                      <Clock style={{ width: 14, height: 14, flexShrink: 0 }} />
                      <span>{exam.duration_minutes} min</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                      <Calendar style={{ width: 14, height: 14, flexShrink: 0 }} />
                      <span>{start.toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Action */}
                  {isActive ? (
                    <button
                      className="btn btn-success"
                      onClick={() => navigate(`/exam/${exam.id}`)}
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      Enter Exam Portal
                    </button>
                  ) : (
                    <button
                      className="btn btn-secondary"
                      disabled
                      style={{ width: '100%', justifyContent: 'center', opacity: 0.55, cursor: 'not-allowed' }}
                    >
                      {isUpcoming ? 'Not Available Yet' : 'Portal Closed'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <style>{`
          @keyframes pulse-ring {
            0% { box-shadow: 0 0 0 0 rgba(22,163,74,0.6); }
            70% { box-shadow: 0 0 0 8px rgba(22,163,74,0); }
            100% { box-shadow: 0 0 0 0 rgba(22,163,74,0); }
          }
        `}</style>
      </div>
    );
  }

  // ─── FACULTY / ADMIN VIEW ────────────────────────────────────────────────────
  const getExamStatus = (exam) => {
    const now = new Date();
    const start = new Date(exam.start_time);
    const end = new Date(exam.end_time);
    if (start <= now && now <= end) return 'active';
    if (now < start) return 'upcoming';
    return 'expired';
  };

  return (
    <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="section-title" style={{ marginBottom: '0.25rem' }}>Manage Examinations</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0 }}>
            Add, update, or remove exam schedules and question sheets.
          </p>
        </div>
        {!showCreateForm && (
          <button className="btn btn-primary" onClick={() => setShowCreateForm(true)}>
            <Plus style={{ width: 16, height: 16 }} />
            <span>Create New Exam</span>
          </button>
        )}
      </div>

      {/* CREATE EXAM MODAL / FORM */}
      {showCreateForm && (
        <div className="card" style={{ padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
              <div className="stat-blue" style={{ width: 36, height: 36, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <FileText style={{ width: 18, height: 18 }} />
              </div>
              <div>
                <h2 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)', margin: 0 }}>New Exam Details</h2>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0 }}>Fill in the details below to schedule an examination</p>
              </div>
            </div>
            <button className="btn btn-ghost" onClick={() => setShowCreateForm(false)} style={{ padding: '0.5rem' }}>
              <X style={{ width: 18, height: 18 }} />
            </button>
          </div>

          <form onSubmit={handleCreateExam} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
              <div>
                <label className="form-label">Exam Title</label>
                <input
                  className="form-input" type="text" required placeholder="Midterm Examination"
                  value={title} onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="form-label">Select Subject</label>
                <select className="form-input" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                  {subjects.map(sub => (
                    <option key={sub.id} value={sub.id}>{sub.name} ({sub.code})</option>
                  ))}
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Description</label>
                <textarea
                  className="form-input" required placeholder="Enter exam syllabus, instructions..."
                  value={description} onChange={(e) => setDescription(e.target.value)}
                  style={{ minHeight: 80, resize: 'vertical' }}
                />
              </div>
              <div>
                <label className="form-label">Duration (Minutes)</label>
                <input
                  className="form-input" type="number" required min="5" value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                />
              </div>
              <div>
                <label className="form-label">Randomize Question Order</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: 42 }}>
                  <input
                    type="checkbox" id="randomize" checked={randomize}
                    onChange={(e) => setRandomize(e.target.checked)}
                    style={{ width: 16, height: 16, accentColor: 'var(--brand-700)', cursor: 'pointer' }}
                  />
                  <label htmlFor="randomize" style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
                    Enable randomization for students
                  </label>
                </div>
              </div>
              <div>
                <label className="form-label">Start Time</label>
                <input
                  className="form-input" type="datetime-local" required value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div>
                <label className="form-label">End Time</label>
                <input
                  className="form-input" type="datetime-local" required value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>

            {/* Questions Section */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700,
                  fontSize: '0.9375rem', color: 'var(--text-primary)', margin: 0 }}>
                  <HelpCircle style={{ width: 16, height: 16, color: 'var(--accent-600)' }} />
                  Questions Inventory
                </h3>
                <button
                  type="button" className="btn btn-secondary"
                  onClick={addQuestionField}
                  style={{ padding: '0.375rem 0.875rem', fontSize: '0.8125rem' }}
                >
                  <Plus style={{ width: 14, height: 14 }} />
                  Add Question
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {questions.map((q, idx) => (
                  <div key={idx} className="card" style={{
                    padding: '1.25rem', background: 'var(--surface-2)', position: 'relative',
                    border: '1px solid var(--border)'
                  }}>
                    <button
                      type="button" className="btn btn-danger"
                      onClick={() => removeQuestionField(idx)}
                      style={{ position: 'absolute', top: '1rem', right: '1rem', padding: '0.375rem', borderRadius: 6 }}
                    >
                      <Trash style={{ width: 14, height: 14 }} />
                    </button>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '0.75rem', marginBottom: '0.875rem', paddingRight: '2.5rem' }}>
                      <div>
                        <label className="form-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Question {idx + 1}
                        </label>
                        <input
                          className="form-input" type="text" required
                          placeholder="What is the time complexity of binary search?"
                          value={q.question_text}
                          onChange={(e) => handleQuestionChange(idx, 'question_text', e.target.value)}
                        />
                      </div>
                      <div style={{ minWidth: 110 }}>
                        <label className="form-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type</label>
                        <select
                          className="form-input" value={q.question_type}
                          onChange={(e) => handleQuestionChange(idx, 'question_type', e.target.value)}
                        >
                          <option value="MCQ">MCQ</option>
                          <option value="SUBJECTIVE">Subjective</option>
                        </select>
                      </div>
                      <div style={{ minWidth: 80 }}>
                        <label className="form-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Marks</label>
                        <input
                          className="form-input" type="number" required min="1" value={q.marks}
                          onChange={(e) => handleQuestionChange(idx, 'marks', parseInt(e.target.value))}
                        />
                      </div>
                    </div>

                    {q.question_type === 'MCQ' ? (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        {['A', 'B', 'C', 'D'].map((letter, optIdx) => (
                          <div key={letter} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.8125rem', color: 'var(--accent-600)', minWidth: 16 }}>{letter}</span>
                            <input
                              className="form-input" type="text" required placeholder={`Option ${letter}`}
                              value={q.options[optIdx]}
                              onChange={(e) => handleOptionChange(idx, optIdx, e.target.value)}
                            />
                          </div>
                        ))}
                        <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
                          <label className="form-label" style={{ margin: 0, whiteSpace: 'nowrap' }}>Correct Option:</label>
                          <select
                            className="form-input" style={{ maxWidth: 140 }}
                            value={q.correct_answer}
                            onChange={(e) => handleQuestionChange(idx, 'correct_answer', e.target.value)}
                          >
                            <option value="A">Option A</option>
                            <option value="B">Option B</option>
                            <option value="C">Option C</option>
                            <option value="D">Option D</option>
                          </select>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <label className="form-label">Model Keywords for Auto-Evaluation (comma-separated):</label>
                        <input
                          className="form-input" type="text" required
                          placeholder="logarithmic, division, divide and conquer, recursive"
                          value={q.correct_answer}
                          onChange={(e) => handleQuestionChange(idx, 'correct_answer', e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Submit */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem',
              paddingTop: '1.25rem', borderTop: '1px solid var(--border)' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setShowCreateForm(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                <Save style={{ width: 16, height: 16 }} />
                <span>Save and Schedule Exam</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EXAMS TABLE */}
      {!showCreateForm && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <h2 style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary)', margin: 0 }}>
              Scheduled Exams
            </h2>
            <span className="badge badge-blue">{exams.length}</span>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
              <div className="spinner" />
            </div>
          ) : exams.length === 0 ? (
            <div style={{ padding: '4rem', textAlign: 'center' }}>
              <FileText style={{ width: 44, height: 44, color: 'var(--text-muted)', margin: '0 auto 0.75rem' }} />
              <h3 style={{ fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>No Scheduled Exams</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: 0 }}>
                Click "Create New Exam" to populate this workspace.
              </p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Subject</th>
                    <th>Duration</th>
                    <th>Start Time</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {exams.map((exam) => {
                    const status = getExamStatus(exam);
                    const start = new Date(exam.start_time);
                    return (
                      <tr key={exam.id}>
                        <td>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem' }}>{exam.title}</div>
                          <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 2,
                            overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', maxWidth: 220 }}>
                            {exam.description}
                          </div>
                        </td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                          {exam.subject_name || '—'}
                        </td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                            <Clock style={{ width: 13, height: 13, color: 'var(--text-muted)' }} />
                            {exam.duration_minutes} min
                          </div>
                        </td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                            <Calendar style={{ width: 13, height: 13, color: 'var(--text-muted)' }} />
                            {start.toLocaleString()}
                          </div>
                        </td>
                        <td>
                          <span className={`badge ${status === 'active' ? 'badge-green' : status === 'upcoming' ? 'badge-amber' : ''}`}
                            style={status === 'expired' ? { color: 'var(--text-muted)', background: 'var(--surface-2)', border: '1px solid var(--border)' } : {}}>
                            {status === 'active' ? 'Active' : status === 'upcoming' ? 'Upcoming' : 'Expired'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                            <button className="btn btn-ghost" style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }}>
                              Edit
                            </button>
                            <button className="btn btn-danger" style={{ padding: '0.375rem 0.75rem', fontSize: '0.8125rem' }}>
                              <Trash style={{ width: 13, height: 13 }} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
