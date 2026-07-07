import React, { useState, useEffect, useRef } from 'react';
import { useAuth, API_BASE_URL } from '../context/AuthContext';
import { FileText, Send, Upload, BookOpen, Brain, RefreshCw, MessageSquare } from 'lucide-react';

export default function AIStudyAssistant() {
  const { token } = useAuth();

  const [subjects, setSubjects] = useState([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [materials, setMaterials] = useState([]);
  const [selectedMaterial, setSelectedMaterial] = useState(null);

  // Tabs
  const [activeTab, setActiveTab] = useState('chat'); // chat, summary, quiz

  // Chat States
  const [chatMessages, setChatMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Summary States
  const [summary, setSummary] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Quiz States
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [selectedQuizAnswers, setSelectedQuizAnswers] = useState({}); // { questionIdx: optionLetter }
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);

  // Upload States
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef(null);
  const chatEndRef = useRef(null);

  useEffect(() => {
    // Scroll chat to bottom
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch subjects
        const subRes = await fetch(`${API_BASE_URL}/exams/subjects`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (subRes.ok) {
          const subData = await subRes.json();
          setSubjects(subData || []);
          if (subData.length > 0) setSelectedSubjectId(subData[0].id.toString());
        }

        // Fetch uploaded materials
        const matRes = await fetch(`${API_BASE_URL}/assistant/materials`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (matRes.ok) {
          const matData = await matRes.json();
          setMaterials(matData || []);
          if (matData.length > 0) setSelectedMaterial(matData[0]);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, [token]);

  // Handle document upload
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile || !uploadTitle || !selectedSubjectId) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', uploadFile);
    formData.append('title', uploadTitle);
    formData.append('subject_id', selectedSubjectId);

    try {
      const res = await fetch(`${API_BASE_URL}/assistant/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (res.ok) {
        const newMaterial = await res.json();
        setMaterials([newMaterial, ...materials]);
        setSelectedMaterial(newMaterial);
        setUploadTitle('');
        setUploadFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        alert("Study material uploaded and indexed successfully!");
      } else {
        alert("Upload failed. Make sure server is running.");
      }
    } catch (err) {
      alert(`Error uploading: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  // Chat with PDF
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !selectedMaterial || chatLoading) return;

    const userMsg = inputMessage;
    setInputMessage('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setChatLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/assistant/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          material_id: selectedMaterial.id,
          message: userMsg
        })
      });

      if (res.ok) {
        const data = await res.json();
        setChatMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      } else {
        setChatMessages(prev => [...prev, { role: 'assistant', content: "Error: I couldn't reach the AI model right now. Please check if your API keys are configured." }]);
      }
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: `Network error: ${err.message}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Summarize PDF
  const handleSummarize = async () => {
    if (!selectedMaterial || summaryLoading) return;
    setSummaryLoading(true);
    setSummary('');

    try {
      const res = await fetch(`${API_BASE_URL}/assistant/summarize/${selectedMaterial.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary);
      } else {
        setSummary("Failed to generate summary. Make sure API keys are configured in your environment.");
      }
    } catch (e) {
      setSummary(`Network error: ${e.message}`);
    } finally {
      setSummaryLoading(false);
    }
  };

  // Generate Quiz
  const handleGenerateQuiz = async () => {
    if (!selectedMaterial || quizLoading) return;
    setQuizLoading(true);
    setQuizQuestions([]);
    setQuizSubmitted(false);
    setSelectedQuizAnswers({});

    try {
      const res = await fetch(`${API_BASE_URL}/assistant/quiz/${selectedMaterial.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setQuizQuestions(data.quiz || []);
      } else {
        alert("Failed to generate quiz. Make sure API keys are configured.");
      }
    } catch (e) {
      alert(`Network error: ${e.message}`);
    } finally {
      setQuizLoading(false);
    }
  };

  // ── Tab config ──────────────────────────────────────────
  const tabs = [
    { id: 'chat', label: 'Ask Document', icon: MessageSquare },
    { id: 'summary', label: 'PDF Summary', icon: Brain },
    { id: 'quiz', label: 'Practice Quiz', icon: BookOpen },
  ];

  return (
    <div
      className="fade-up"
      style={{
        display: 'flex',
        gap: '0',
        height: 'calc(100vh - 10rem)',
        border: '1px solid var(--border)',
        borderRadius: '14px',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-md)',
        background: 'var(--surface)',
      }}
    >
      {/* ── LEFT SIDEBAR ────────────────────────────────────── */}
      <div
        style={{
          width: '260px',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid var(--border)',
          background: 'var(--surface)',
          overflow: 'hidden',
        }}
      >
        {/* Sidebar header */}
        <div
          style={{
            padding: '1rem 1.1rem 0.75rem',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <FileText size={16} color="var(--brand-700)" />
          <span className="section-title" style={{ fontSize: '0.82rem', margin: 0 }}>
            Study Materials
          </span>
        </div>

        {/* Material list */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '0.75rem 0.75rem 0',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          {materials.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2rem 0.5rem',
                textAlign: 'center',
              }}
            >
              <FileText size={28} color="var(--text-muted)" style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
              <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                No PDF documents uploaded yet.
              </p>
            </div>
          ) : (
            materials.map((mat) => {
              const isActive = selectedMaterial?.id === mat.id;
              return (
                <button
                  key={mat.id}
                  onClick={() => {
                    setSelectedMaterial(mat);
                    setChatMessages([]);
                    setSummary('');
                    setQuizQuestions([]);
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '0.65rem 0.75rem',
                    borderRadius: '10px',
                    border: isActive ? '1.5px solid var(--brand-700)' : '1.5px solid var(--border)',
                    borderLeft: isActive ? '3px solid var(--brand-700)' : '3px solid transparent',
                    background: isActive ? 'var(--brand-50)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: '600',
                      color: isActive ? 'var(--brand-700)' : 'var(--text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {mat.title}
                  </div>
                  <div
                    style={{
                      fontSize: '0.68rem',
                      color: 'var(--text-muted)',
                      marginTop: '2px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    ID: {mat.id}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Separator */}
        <div style={{ height: '1px', background: 'var(--border)', margin: '0.5rem 0' }} />

        {/* Upload form */}
        <div style={{ padding: '0.75rem', flexShrink: 0 }}>
          <p
            style={{
              fontSize: '0.75rem',
              fontWeight: '700',
              color: 'var(--text-secondary)',
              marginBottom: '0.6rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}
          >
            Upload PDF
          </p>
          <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <input
              type="text"
              required
              placeholder="Material title (e.g. Lec 1)"
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
              className="form-input"
              style={{ fontSize: '0.78rem', padding: '0.45rem 0.6rem' }}
            />

            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="form-input"
              style={{ fontSize: '0.78rem', padding: '0.45rem 0.6rem' }}
            >
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            <input
              type="file"
              required
              ref={fileInputRef}
              accept=".pdf"
              onChange={(e) => setUploadFile(e.target.files[0])}
              style={{
                width: '100%',
                fontSize: '0.72rem',
                color: 'var(--text-muted)',
              }}
            />

            <button
              type="submit"
              disabled={uploading || !uploadFile}
              className="btn btn-primary"
              style={{
                width: '100%',
                fontSize: '0.78rem',
                padding: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                opacity: uploading || !uploadFile ? 0.5 : 1,
              }}
            >
              {uploading ? (
                <>
                  <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Indexing...</span>
                </>
              ) : (
                <>
                  <Upload size={13} />
                  <span>Upload &amp; Index</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* ── RIGHT MAIN CONTENT ──────────────────────────────── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: 'var(--bg)',
        }}
      >
        {/* Tab bar */}
        <div
          style={{
            display: 'flex',
            borderBottom: '2px solid var(--border)',
            background: 'var(--surface)',
            padding: '0 1.25rem',
            flexShrink: 0,
          }}
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id === 'summary' && !summary && selectedMaterial) handleSummarize();
                  if (tab.id === 'quiz' && quizQuestions.length === 0 && selectedMaterial) handleGenerateQuiz();
                }}
                disabled={!selectedMaterial}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0.9rem 1rem',
                  fontSize: '0.82rem',
                  fontWeight: '600',
                  border: 'none',
                  borderBottom: active ? '2px solid var(--brand-700)' : '2px solid transparent',
                  marginBottom: '-2px',
                  background: 'transparent',
                  color: active ? 'var(--brand-700)' : 'var(--text-muted)',
                  cursor: selectedMaterial ? 'pointer' : 'not-allowed',
                  opacity: !selectedMaterial ? 0.4 : 1,
                  transition: 'color 0.15s, border-color 0.15s',
                  whiteSpace: 'nowrap',
                }}
              >
                <Icon size={15} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Active document indicator */}
        <div
          style={{
            padding: '0.5rem 1.25rem',
            borderBottom: '1px solid var(--border)',
            background: 'var(--surface-2)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Active Document:</span>
          {selectedMaterial ? (
            <span className="badge badge-blue" style={{ fontSize: '0.72rem', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selectedMaterial.title}
            </span>
          ) : (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No document selected</span>
          )}
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>

          {/* ── TAB 1: CHAT ── */}
          {activeTab === 'chat' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>

              {/* Chat messages */}
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '1rem', paddingRight: '4px' }}>
                {chatMessages.length === 0 ? (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingTop: '5rem',
                      paddingBottom: '5rem',
                      textAlign: 'center',
                      gap: '12px',
                    }}
                  >
                    <Brain size={44} color="var(--text-muted)" style={{ opacity: 0.5 }} />
                    <div>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        Ask your Study Assistant
                      </h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '320px', lineHeight: 1.6 }}>
                        Send a message to ask questions about the selected PDF lecture note or syllabus sheet.
                      </p>
                    </div>
                  </div>
                ) : (
                  chatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                      }}
                    >
                      {msg.role === 'user' ? (
                        <div
                          style={{
                            maxWidth: '70%',
                            padding: '0.65rem 1rem',
                            borderRadius: '16px 16px 4px 16px',
                            background: 'var(--brand-700)',
                            color: '#fff',
                            fontSize: '0.85rem',
                            lineHeight: 1.6,
                            boxShadow: 'var(--shadow-sm)',
                          }}
                        >
                          {msg.content}
                        </div>
                      ) : (
                        <div
                          className="card"
                          style={{
                            maxWidth: '72%',
                            padding: '0.65rem 1rem',
                            borderRadius: '4px 16px 16px 16px',
                            background: 'var(--surface-2)',
                            fontSize: '0.85rem',
                            lineHeight: 1.7,
                            color: 'var(--text-primary)',
                          }}
                        >
                          {msg.content}
                        </div>
                      )}
                    </div>
                  ))
                )}

                {chatLoading && (
                  <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                    <div
                      className="card"
                      style={{
                        padding: '0.65rem 1rem',
                        borderRadius: '4px 16px 16px 16px',
                        background: 'var(--surface-2)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '0.8rem',
                        color: 'var(--text-muted)',
                      }}
                    >
                      <RefreshCw size={13} color="var(--brand-700)" style={{ animation: 'spin 1s linear infinite' }} />
                      <span>Assistant is reading...</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat input */}
              <form
                onSubmit={handleSendMessage}
                style={{
                  display: 'flex',
                  gap: '8px',
                  flexShrink: 0,
                  borderTop: '1px solid var(--border)',
                  paddingTop: '1rem',
                }}
              >
                <input
                  type="text"
                  required
                  placeholder="Ask a question about this lecture..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  className="form-input"
                  style={{ flex: 1 }}
                />
                <button
                  type="submit"
                  disabled={chatLoading || !selectedMaterial || !inputMessage.trim()}
                  className="btn btn-primary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    flexShrink: 0,
                    opacity: (chatLoading || !selectedMaterial || !inputMessage.trim()) ? 0.45 : 1,
                  }}
                >
                  <Send size={14} />
                  <span>Send</span>
                </button>
              </form>
            </div>
          )}

          {/* ── TAB 2: SUMMARY ── */}
          {activeTab === 'summary' && (
            <div style={{ maxWidth: '760px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3
                  style={{
                    fontSize: '0.9rem',
                    fontWeight: '700',
                    color: 'var(--text-primary)',
                  }}
                >
                  Automated Summary
                </h3>
                <button
                  onClick={handleSummarize}
                  disabled={summaryLoading}
                  className="btn btn-secondary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '0.78rem',
                    padding: '0.4rem 0.9rem',
                    opacity: summaryLoading ? 0.6 : 1,
                  }}
                >
                  <RefreshCw size={13} style={summaryLoading ? { animation: 'spin 1s linear infinite' } : {}} />
                  <span>Regenerate</span>
                </button>
              </div>

              <div
                className="card"
                style={{
                  padding: '1.5rem',
                  minHeight: '200px',
                  lineHeight: 1.8,
                  fontSize: '0.88rem',
                  color: 'var(--text-primary)',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {summaryLoading ? (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '4rem 0',
                      gap: '12px',
                    }}
                  >
                    <RefreshCw size={28} color="var(--brand-700)" style={{ animation: 'spin 1s linear infinite' }} />
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Summarizing document contents. Please wait...
                    </p>
                  </div>
                ) : (
                  <span style={{ color: summary ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {summary || 'No summary available yet. Click Regenerate to query the AI parser.'}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* ── TAB 3: QUIZ ── */}
          {activeTab === 'quiz' && (
            <div style={{ maxWidth: '760px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '2px' }}>
                    Generated Practice MCQ
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Quiz generated based on text extracts.
                  </p>
                </div>
                <button
                  onClick={handleGenerateQuiz}
                  disabled={quizLoading}
                  className="btn btn-secondary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '0.78rem',
                    padding: '0.4rem 0.9rem',
                    opacity: quizLoading ? 0.6 : 1,
                  }}
                >
                  <RefreshCw size={13} style={quizLoading ? { animation: 'spin 1s linear infinite' } : {}} />
                  <span>New Quiz</span>
                </button>
              </div>

              {quizLoading ? (
                <div
                  className="card"
                  style={{
                    padding: '4rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                  }}
                >
                  <RefreshCw size={28} color="var(--brand-700)" style={{ animation: 'spin 1s linear infinite' }} />
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Creating custom test questions from document embeddings...
                  </p>
                </div>
              ) : quizQuestions.length === 0 ? (
                <div
                  className="card"
                  style={{
                    padding: '3rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    textAlign: 'center',
                  }}
                >
                  <BookOpen size={36} color="var(--text-muted)" style={{ opacity: 0.5 }} />
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
                    No quiz generated
                  </p>
                  <button
                    onClick={handleGenerateQuiz}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.82rem' }}
                  >
                    Generate Now
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '2rem' }}>
                  {quizQuestions.map((q, qIdx) => (
                    <div
                      key={qIdx}
                      className="card"
                      style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}
                    >
                      <h4 style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                        {qIdx + 1}. {q.question}
                      </h4>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        {Object.entries(q.options).map(([letter, text]) => {
                          const isSelected = selectedQuizAnswers[qIdx] === letter;
                          const isCorrect = q.answer === letter;

                          let borderColor = 'var(--border-strong)';
                          let bgColor = 'transparent';
                          let textColor = 'var(--text-secondary)';

                          if (quizSubmitted) {
                            if (isCorrect) {
                              borderColor = 'var(--success-600)';
                              bgColor = 'var(--success-100)';
                              textColor = 'var(--success-600)';
                            } else if (isSelected) {
                              borderColor = 'var(--danger-600)';
                              bgColor = 'var(--danger-100)';
                              textColor = 'var(--danger-600)';
                            }
                          } else if (isSelected) {
                            borderColor = 'var(--brand-700)';
                            bgColor = 'var(--brand-100)';
                            textColor = 'var(--brand-800)';
                          }

                          return (
                            <button
                              key={letter}
                              disabled={quizSubmitted}
                              onClick={() => setSelectedQuizAnswers(prev => ({ ...prev, [qIdx]: letter }))}
                              style={{
                                textAlign: 'left',
                                padding: '0.6rem 0.75rem',
                                borderRadius: '10px',
                                border: `1.5px solid ${borderColor}`,
                                background: bgColor,
                                color: textColor,
                                fontSize: '0.8rem',
                                fontWeight: '500',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                cursor: quizSubmitted ? 'default' : 'pointer',
                                transition: 'all 0.15s',
                              }}
                            >
                              <span
                                style={{
                                  flexShrink: 0,
                                  width: '20px',
                                  height: '20px',
                                  borderRadius: '6px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontSize: '0.7rem',
                                  fontWeight: '700',
                                  background: isSelected && !quizSubmitted ? 'var(--brand-700)' : 'var(--surface-2)',
                                  color: isSelected && !quizSubmitted ? '#fff' : 'var(--text-muted)',
                                  border: '1px solid var(--border)',
                                }}
                              >
                                {letter}
                              </span>
                              <span style={{ lineHeight: 1.4 }}>{text}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {!quizSubmitted && (
                    <button
                      onClick={() => setQuizSubmitted(true)}
                      className="btn btn-primary"
                      style={{ width: '100%' }}
                    >
                      Submit Answers
                    </button>
                  )}
                </div>
              )}
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
