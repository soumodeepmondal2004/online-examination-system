import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth, API_BASE_URL } from '../context/AuthContext';
import {
  Clock, ShieldAlert, Camera, ArrowRight, ArrowLeft, Send,
  Sun, Moon, Eye, EyeOff, Volume2, VolumeX, Mic, CheckCircle2,
  AlertTriangle, User
} from 'lucide-react';
import Webcam from 'react-webcam';

// ─────────────────────────────────────────────
// THEME TOKENS
// ─────────────────────────────────────────────
const DARK = {
  bg: '#070b13',
  surface: 'rgba(10,14,23,0.95)',
  panel: 'rgba(17,24,39,0.85)',
  border: 'rgba(255,255,255,0.07)',
  borderStrong: 'rgba(255,255,255,0.13)',
  text: '#f1f5f9',
  textMuted: '#64748b',
  textSub: '#94a3b8',
  blue: '#3b82f6',
  blueGlow: 'rgba(59,130,246,0.18)',
  green: '#10b981',
  greenGlow: 'rgba(16,185,129,0.15)',
  red: '#ef4444',
  redGlow: 'rgba(239,68,68,0.15)',
  amber: '#f59e0b',
};

const LIGHT = {
  bg: '#f0f4ff',
  surface: 'rgba(255,255,255,0.97)',
  panel: 'rgba(241,245,255,0.92)',
  border: 'rgba(0,0,0,0.09)',
  borderStrong: 'rgba(0,0,0,0.18)',
  text: '#0f172a',
  textMuted: '#64748b',
  textSub: '#475569',
  blue: '#2563eb',
  blueGlow: 'rgba(37,99,235,0.12)',
  green: '#059669',
  greenGlow: 'rgba(5,150,105,0.12)',
  red: '#dc2626',
  redGlow: 'rgba(220,38,38,0.12)',
  amber: '#d97706',
};

// ─────────────────────────────────────────────
// NOISE DETECTION — Web Audio API (real dB analysis)
// ─────────────────────────────────────────────
function useNoiseDetector({ enabled, onAlert }) {
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const rafRef = useRef(null);
  const [decibels, setDecibels] = useState(0);
  const [micGranted, setMicGranted] = useState(false);
  const alertCooldownRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    let stream = null;

    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        setMicGranted(true);
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        analyser.smoothingTimeConstant = 0.4;
        const source = ctx.createMediaStreamSource(stream);
        source.connect(analyser);

        audioCtxRef.current = ctx;
        analyserRef.current = analyser;
        sourceRef.current = source;

        const data = new Uint8Array(analyser.frequencyBinCount);

        const loop = () => {
          analyser.getByteFrequencyData(data);
          // RMS-based dB approximation
          const rms = Math.sqrt(data.reduce((s, v) => s + v * v, 0) / data.length);
          const db = Math.min(100, Math.round(rms * 1.2));
          setDecibels(db);

          // Trigger alert if db > 60 and not in cooldown
          if (db > 60 && !alertCooldownRef.current) {
            alertCooldownRef.current = true;
            onAlert('noise');
            setTimeout(() => { alertCooldownRef.current = false; }, 8000);
          }

          rafRef.current = requestAnimationFrame(loop);
        };
        loop();
      } catch (e) {
        console.warn('Microphone access denied:', e);
        setMicGranted(false);
      }
    };

    start();

    return () => {
      cancelAnimationFrame(rafRef.current);
      if (sourceRef.current) sourceRef.current.disconnect();
      if (audioCtxRef.current) audioCtxRef.current.close();
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, [enabled]);

  return { decibels, micGranted };
}

// ─────────────────────────────────────────────
// FACE DETECTION — Canvas + pixel analysis (no external lib needed)
// Uses skin-tone pixel ratio + face area heuristics
// ─────────────────────────────────────────────
function useFaceDetector({ enabled, webcamRef, onAlert }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const alertCooldownRef = useRef(false);
  const [faceStatus, setFaceStatus] = useState('detecting'); // 'ok' | 'missing' | 'multiple' | 'detecting'
  const [faceBox, setFaceBox] = useState(null);

  const analyze = useCallback(() => {
    if (!enabled) return;

    const video = webcamRef.current?.video;
    if (!video || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(analyze);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) { rafRef.current = requestAnimationFrame(analyze); return; }

    const W = video.videoWidth || 320;
    const H = video.videoHeight || 240;
    canvas.width = W;
    canvas.height = H;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, W, H);
    const frame = ctx.getImageData(0, 0, W, H);
    const d = frame.data;

    // Skin-tone detection in YCbCr space (works for diverse skin tones)
    // A pixel is "skin" if Y ∈ [80,240], Cb ∈ [85,135], Cr ∈ [135,180]
    let skinCount = 0;
    // Divide image into a 4x4 grid to locate face regions
    const cellW = Math.floor(W / 4);
    const cellH = Math.floor(H / 4);
    const cellSkin = new Array(16).fill(0);
    const cellTotal = cellW * cellH;

    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      // RGB → YCbCr
      const Y  =  0.299 * r + 0.587 * g + 0.114 * b;
      const Cb = -0.169 * r - 0.331 * g + 0.500 * b + 128;
      const Cr =  0.500 * r - 0.419 * g - 0.081 * b + 128;

      const isSkin = Y > 80 && Y < 240 && Cb > 85 && Cb < 135 && Cr > 135 && Cr < 180;
      if (isSkin) {
        skinCount++;
        const pixelIdx = (i / 4);
        const px = pixelIdx % W;
        const py = Math.floor(pixelIdx / W);
        const cx = Math.min(3, Math.floor(px / cellW));
        const cy = Math.min(3, Math.floor(py / cellH));
        cellSkin[cy * 4 + cx]++;
      }
    }

    // A "face zone" is a cell where >15% pixels are skin
    const faceCells = cellSkin.filter(s => s / cellTotal > 0.15);
    const skinRatio = skinCount / (W * H);

    let status = 'missing';
    let box = null;

    if (skinRatio > 0.04 && faceCells.length >= 1) {
      status = 'ok';
      // Estimate face box from skin bounding box
      let minX = W, maxX = 0, minY = H, maxY = 0;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i + 1], b = d[i + 2];
        const Y  =  0.299 * r + 0.587 * g + 0.114 * b;
        const Cb = -0.169 * r - 0.331 * g + 0.500 * b + 128;
        const Cr =  0.500 * r - 0.419 * g - 0.081 * b + 128;
        if (Y > 80 && Y < 240 && Cb > 85 && Cb < 135 && Cr > 135 && Cr < 180) {
          const px = (i / 4) % W;
          const py = Math.floor((i / 4) / W);
          if (px < minX) minX = px; if (px > maxX) maxX = px;
          if (py < minY) minY = py; if (py > maxY) maxY = py;
        }
      }
      // Scale box to display percentages for overlay
      box = {
        left: `${Math.round((minX / W) * 100)}%`,
        top: `${Math.round((minY / H) * 100)}%`,
        width: `${Math.round(((maxX - minX) / W) * 100)}%`,
        height: `${Math.round(((maxY - minY) / H) * 100)}%`,
      };

      // If skin clusters in 2+ disconnected regions → possible multiple faces
      if (faceCells.length >= 6 && skinRatio > 0.14) {
        status = 'multiple';
      }
    }

    setFaceStatus(status);
    setFaceBox(box);

    // Alert for no-face or multiple-face
    if ((status === 'missing' || status === 'multiple') && !alertCooldownRef.current) {
      alertCooldownRef.current = true;
      onAlert(status === 'missing' ? 'no_face' : 'multiple_faces');
      setTimeout(() => { alertCooldownRef.current = false; }, 10000);
    }

    // Run analysis every 2 seconds
    rafRef.current = setTimeout(analyze, 2000);
  }, [enabled, webcamRef]);

  useEffect(() => {
    if (!enabled) return;
    // Small delay to let webcam warm up
    const t = setTimeout(analyze, 2500);
    return () => {
      clearTimeout(rafRef.current);
      clearTimeout(t);
    };
  }, [enabled, analyze]);

  return { faceStatus, faceBox, canvasRef };
}


// ─────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────
export default function ExamPortal() {
  const { id } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();

  // ── Core state ─────────────────────────────
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const submittedRef = useRef(false);

  // ── UI prefs ────────────────────────────────
  const [darkMode, setDarkMode] = useState(true);
  const [noiseEnabled, setNoiseEnabled] = useState(true);
  const [faceEnabled, setFaceEnabled] = useState(true);
  const T = darkMode ? DARK : LIGHT;

  // ── Proctoring state ────────────────────────
  const [warnings, setWarnings] = useState(0);
  const warningsRef = useRef(0);
  const [proctoringAlerts, setProctoringAlerts] = useState([]); // live feed
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [warningMsg, setWarningMsg] = useState('');
  const [warningType, setWarningType] = useState('tab'); // 'tab'|'face'|'noise'|'multi'

  const timerRef = useRef(null);
  const webcamRef = useRef(null);

  // ── Log proctoring event to backend ─────────
  const logWarning = useCallback(async (eventType) => {
    try {
      await fetch(`${API_BASE_URL}/proctoring/log-warning/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ event_type: eventType, warning_count: 1 })
      });
    } catch { /* silent — don't block UI */ }
  }, [id, token]);

  // ── Master alert handler ─────────────────────
  const triggerAlert = useCallback((type) => {
    const msgs = {
      tab:            'Tab switching or leaving the exam window is prohibited.',
      no_face:        'No face detected in the webcam feed. Please ensure your face is visible.',
      multiple_faces: 'Multiple faces detected. Only the registered student may be in frame.',
      noise:          'Loud background noise detected. Please work in a quiet environment.',
    };
    const icons = { tab: '🔀', no_face: '👤', multiple_faces: '👥', noise: '🔊' };

    const next = warningsRef.current + 1;
    warningsRef.current = next;
    setWarnings(next);

    const alert = { id: Date.now(), type, icon: icons[type] || '⚠️', msg: msgs[type] || 'Violation detected.', time: new Date().toLocaleTimeString() };
    setProctoringAlerts(prev => [alert, ...prev].slice(0, 8));

    setWarningMsg(`Warning ${next}/5: ${msgs[type]}`);
    setWarningType(type);
    setShowWarningModal(true);
    logWarning(type);

    if (next >= 5) {
      setTimeout(() => handleSubmitExam(), 1500);
    }
  }, [logWarning]);

  // ── Noise detector ──────────────────────────
  const { decibels, micGranted } = useNoiseDetector({
    enabled: noiseEnabled && !loading && !submitted && !!exam,
    onAlert: () => triggerAlert('noise'),
  });

  // ── Face detector ───────────────────────────
  const { faceStatus, faceBox, canvasRef } = useFaceDetector({
    enabled: faceEnabled && !loading && !submitted && !!exam,
    webcamRef,
    onAlert: (t) => triggerAlert(t),
  });

  // ── Fetch exam ───────────────────────────────
  useEffect(() => {
    const fetchExam = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/exams/${id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setExam(data);
          setQuestions(data.questions || []);
          setTimeLeft(data.duration_minutes * 60);
          const init = {};
          data.questions.forEach(q => { init[q.id] = { selected_option: '', subjective_answer: '' }; });
          setAnswers(init);
        } else {
          navigate('/student');
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchExam();
  }, [id, token]);

  // ── Tab-switch detection ─────────────────────
  useEffect(() => {
    if (loading || submitted || !exam) return;
    const handleBlur = () => triggerAlert('tab');
    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, [loading, submitted, exam, triggerAlert]);

  // ── Timer ────────────────────────────────────
  useEffect(() => {
    if (timeLeft <= 0 || loading || submitted || !exam) {
      if (timeLeft === 0 && exam && !submitted) handleSubmitExam();
      return;
    }
    timerRef.current = setInterval(() => setTimeLeft(p => p - 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [timeLeft, loading, submitted, exam]);

  // ── Answer handlers ──────────────────────────
  const handleAnswerSelect = (qId, opt) =>
    setAnswers(p => ({ ...p, [qId]: { ...p[qId], selected_option: opt } }));

  const handleSubjectiveChange = (qId, text) =>
    setAnswers(p => ({ ...p, [qId]: { ...p[qId], subjective_answer: text } }));

  // ── Submit ───────────────────────────────────
  const handleSubmitExam = async () => {
    if (submittedRef.current || submitted) return;
    submittedRef.current = true;
    clearInterval(timerRef.current);
    setSubmitted(true);
    setLoading(true);
    try {
      const payload = Object.entries(answers).map(([qId, v]) => ({
        question_id: parseInt(qId),
        selected_option: v.selected_option || null,
        subjective_answer: v.subjective_answer || null,
      }));
      const res = await fetch(`${API_BASE_URL}/exams/${id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ answers: payload })
      });
      if (res.ok) navigate('/student');
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isTimeCritical = timeLeft < 300 && timeLeft > 0;

  // ── Status badge color ───────────────────────
  const faceStatusConfig = {
    detecting: { color: T.amber, label: 'Detecting...' },
    ok:        { color: T.green, label: 'Face OK' },
    missing:   { color: T.red,   label: 'No Face' },
    multiple:  { color: T.amber, label: 'Multi-face' },
  };
  const fsc = faceStatusConfig[faceStatus] || faceStatusConfig.detecting;

  const noiseLevel = decibels < 20 ? 'Silent' : decibels < 45 ? 'Low' : decibels < 62 ? 'Moderate' : 'LOUD';
  const noiseColor = decibels < 45 ? T.green : decibels < 62 ? T.amber : T.red;

  const currentQuestion = questions[currentIdx];
  const answeredCount = Object.values(answers).filter(a => a.selected_option || a.subjective_answer).length;

  // ─────────────────────────────────────────────
  // LOADING SCREEN
  // ─────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 52, height: 52, border: `4px solid ${T.blue}30`, borderTop: `4px solid ${T.blue}`, borderRadius: '50%', animation: 'spin 0.9s linear infinite' }} />
      <p style={{ color: T.textMuted, fontSize: 13, fontWeight: 600, letterSpacing: '0.04em' }}>Configuring Secure Examination Environment…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  // ─────────────────────────────────────────────
  // MAIN PORTAL
  // ─────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh',
      background: darkMode
        ? 'linear-gradient(135deg, #060a12 0%, #0a0f1c 50%, #070d18 100%)'
        : 'linear-gradient(135deg, #e8eeff 0%, #f0f4ff 50%, #eaf0ff 100%)',
      color: T.text,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      fontFamily: "'Outfit', sans-serif",
      transition: 'background 0.3s, color 0.3s',
    }}>

      {/* ── HEADER ─────────────────────────────────── */}
      <header style={{
        height: 60,
        borderBottom: `1px solid ${T.border}`,
        background: darkMode ? 'rgba(6,10,18,0.96)' : 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(14px)',
        padding: '0 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0, zIndex: 10,
        boxShadow: darkMode ? '0 1px 20px rgba(0,0,0,0.5)' : '0 1px 12px rgba(0,0,0,0.08)',
      }}>
        {/* Left: exam title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: T.red, boxShadow: `0 0 8px ${T.red}`, animation: 'pulse 1.5s infinite' }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>LIVE EXAM</span>
          <span style={{ color: T.borderStrong }}>|</span>
          <h1 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: T.text }}>{exam?.title}</h1>
        </div>

        {/* Center: quick proctoring status pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Face status pill */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
            background: `${fsc.color}18`, border: `1px solid ${fsc.color}40`, color: fsc.color,
          }}>
            <User size={11} />
            <span>{fsc.label}</span>
          </div>
          {/* Noise pill */}
          {micGranted && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
              background: `${noiseColor}18`, border: `1px solid ${noiseColor}40`, color: noiseColor,
            }}>
              <Mic size={11} />
              <span>{noiseLevel}</span>
            </div>
          )}
        </div>

        {/* Right: timer + controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Timer */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 14px', borderRadius: 12, fontWeight: 700, fontSize: 15,
            background: isTimeCritical ? `${T.red}18` : `${T.blue}15`,
            border: `1px solid ${isTimeCritical ? T.red : T.blue}35`,
            color: isTimeCritical ? T.red : T.blue,
            transition: 'all 0.3s',
          }}>
            <Clock size={14} />
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{formatTime(timeLeft)}</span>
          </div>

          {/* Theme toggle */}
          <button
            onClick={() => setDarkMode(p => !p)}
            style={{ width: 34, height: 34, borderRadius: 10, border: `1px solid ${T.border}`, background: T.panel, color: T.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Toggle light/dark mode"
          >
            {darkMode ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          {/* Submit button */}
          <button
            onClick={() => { if (window.confirm('Are you sure you want to finish and submit the exam?')) handleSubmitExam(); }}
            style={{
              padding: '7px 16px', borderRadius: 10, fontSize: 12, fontWeight: 700,
              background: `linear-gradient(135deg, ${T.red}, #be123c)`,
              border: 'none', color: '#fff', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 5,
              boxShadow: `0 4px 14px ${T.red}30`,
            }}
          >
            <Send size={12} /> Finish Exam
          </button>
        </div>
      </header>

      {/* ── BODY ────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── LEFT: Questions ─────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Progress bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12, color: T.textMuted, fontWeight: 600 }}>
              {answeredCount}/{questions.length} answered
            </span>
            <div style={{ flex: 1, height: 5, borderRadius: 10, background: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 10,
                width: `${questions.length ? (answeredCount / questions.length) * 100 : 0}%`,
                background: `linear-gradient(90deg, ${T.blue}, ${T.green})`,
                transition: 'width 0.4s ease',
              }} />
            </div>
          </div>

          {/* Question card */}
          {currentQuestion && (
            <div style={{
              background: T.panel,
              backdropFilter: 'blur(12px)',
              border: `1px solid ${T.border}`,
              borderRadius: 20,
              padding: '28px 32px',
              boxShadow: darkMode ? `0 0 30px ${T.blueGlow}` : `0 4px 24px rgba(0,0,0,0.07)`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: T.blue, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Question {currentIdx + 1} of {questions.length}
                </span>
                <span style={{
                  fontSize: 11, fontWeight: 700, color: T.textMuted,
                  background: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                  padding: '3px 10px', borderRadius: 8,
                }}>
                  {currentQuestion.marks} {currentQuestion.marks === 1 ? 'Mark' : 'Marks'}
                </span>
              </div>

              <h2 style={{ margin: '0 0 22px 0', fontSize: 17, fontWeight: 700, color: T.text, lineHeight: 1.55 }}>
                {currentQuestion.question_text}
              </h2>

              {/* MCQ options */}
              {currentQuestion.question_type === 'MCQ' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(currentQuestion.options || []).map((option, idx) => {
                    const letter = ['A', 'B', 'C', 'D'][idx];
                    const isSelected = answers[currentQuestion.id]?.selected_option === letter;
                    return (
                      <button
                        key={idx}
                        onClick={() => handleAnswerSelect(currentQuestion.id, letter)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 14,
                          padding: '13px 16px', borderRadius: 12, cursor: 'pointer',
                          textAlign: 'left', fontSize: 14, fontWeight: 500,
                          transition: 'all 0.18s ease',
                          background: isSelected
                            ? `${T.blue}18`
                            : darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                          border: `1.5px solid ${isSelected ? T.blue : T.border}`,
                          color: isSelected ? T.blue : T.text,
                          boxShadow: isSelected ? `0 0 12px ${T.blueGlow}` : 'none',
                        }}
                      >
                        <span style={{
                          width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 800, flexShrink: 0,
                          background: isSelected ? T.blue : 'transparent',
                          border: `2px solid ${isSelected ? T.blue : T.borderStrong}`,
                          color: isSelected ? '#fff' : T.textMuted,
                          transition: 'all 0.18s',
                        }}>{letter}</span>
                        <span>{option}</span>
                        {isSelected && <CheckCircle2 size={16} style={{ marginLeft: 'auto', color: T.blue }} />}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div>
                  <label style={{ fontSize: 12, color: T.textMuted, fontWeight: 600, display: 'block', marginBottom: 8 }}>
                    Write your response:
                  </label>
                  <textarea
                    rows={8}
                    value={answers[currentQuestion.id]?.subjective_answer || ''}
                    onChange={e => handleSubjectiveChange(currentQuestion.id, e.target.value)}
                    placeholder="Write your explanation here…"
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      padding: '12px 16px', borderRadius: 12, fontSize: 14,
                      background: darkMode ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.04)',
                      border: `1.5px solid ${T.border}`,
                      color: T.text, outline: 'none', resize: 'vertical',
                      fontFamily: 'inherit', lineHeight: 1.6,
                      transition: 'border 0.2s',
                    }}
                    onFocus={e => { e.target.style.borderColor = T.blue; }}
                    onBlur={e => { e.target.style.borderColor = T.border; }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button
              onClick={() => setCurrentIdx(p => Math.max(0, p - 1))}
              disabled={currentIdx === 0}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                background: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                border: `1px solid ${T.border}`, color: T.textMuted,
                opacity: currentIdx === 0 ? 0.35 : 1,
                transition: 'all 0.15s',
              }}
            >
              <ArrowLeft size={14} /> Previous
            </button>
            <button
              onClick={() => setCurrentIdx(p => Math.min(questions.length - 1, p + 1))}
              disabled={currentIdx === questions.length - 1}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                background: darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                border: `1px solid ${T.border}`, color: T.textMuted,
                opacity: currentIdx === questions.length - 1 ? 0.35 : 1,
                transition: 'all 0.15s',
              }}
            >
              Next <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* ── RIGHT SIDEBAR ─────────────────────────── */}
        <aside style={{
          width: 300,
          borderLeft: `1px solid ${T.border}`,
          background: darkMode ? 'rgba(8,12,22,0.8)' : 'rgba(248,250,255,0.9)',
          backdropFilter: 'blur(12px)',
          padding: '20px 18px',
          display: 'flex', flexDirection: 'column', gap: 18,
          overflowY: 'auto', flexShrink: 0,
        }}>

          {/* ── Webcam + AI overlay ────────────────── */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Camera size={11} /> AI Proctoring
              </span>
              <button
                onClick={() => setFaceEnabled(p => !p)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textMuted, padding: 2 }}
                title={faceEnabled ? 'Disable face detection' : 'Enable face detection'}
              >
                {faceEnabled ? <Eye size={13} /> : <EyeOff size={13} />}
              </button>
            </div>

            {/* Webcam box */}
            <div style={{
              width: '100%', aspectRatio: '4/3', borderRadius: 12, overflow: 'hidden',
              position: 'relative', background: '#000',
              border: `2px solid ${faceStatus === 'ok' ? T.green : faceStatus === 'missing' ? T.red : T.amber}50`,
              boxShadow: `0 0 18px ${faceStatus === 'ok' ? T.greenGlow : T.redGlow}`,
              transition: 'border-color 0.4s, box-shadow 0.4s',
            }}>
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                videoConstraints={{ width: 320, height: 240, facingMode: 'user' }}
              />
              {/* Hidden canvas for pixel analysis */}
              <canvas ref={canvasRef} style={{ display: 'none' }} />

              {/* Face detection bounding box overlay */}
              {faceEnabled && faceBox && faceStatus === 'ok' && (
                <div style={{
                  position: 'absolute',
                  left: faceBox.left, top: faceBox.top,
                  width: faceBox.width, height: faceBox.height,
                  border: `2px solid ${T.green}`,
                  borderRadius: 6,
                  boxShadow: `0 0 10px ${T.green}60`,
                  pointerEvents: 'none',
                }}>
                  <span style={{
                    position: 'absolute', top: -18, left: 0,
                    fontSize: 9, fontWeight: 800, color: T.green,
                    background: darkMode ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.9)',
                    padding: '1px 5px', borderRadius: 4,
                  }}>FACE DETECTED</span>
                </div>
              )}

              {/* Status badge */}
              <div style={{
                position: 'absolute', top: 7, left: 7,
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '3px 8px', borderRadius: 20, fontSize: 10, fontWeight: 800,
                background: `${fsc.color}cc`, color: '#fff',
              }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff', animation: 'ping 1.2s infinite' }} />
                {fsc.label.toUpperCase()}
              </div>
            </div>
          </div>

          {/* ── Noise Monitor ─────────────────────── */}
          <div style={{
            background: darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
            border: `1px solid ${T.border}`, borderRadius: 12, padding: '12px 14px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Mic size={11} /> Noise Monitor
              </span>
              <button
                onClick={() => setNoiseEnabled(p => !p)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textMuted, padding: 2 }}
              >
                {noiseEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
              </button>
            </div>

            {noiseEnabled ? (
              micGranted ? (
                <>
                  {/* dB bar */}
                  <div style={{ height: 8, borderRadius: 10, background: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)', overflow: 'hidden', marginBottom: 5 }}>
                    <div style={{
                      height: '100%', width: `${decibels}%`,
                      borderRadius: 10,
                      background: decibels < 45
                        ? `linear-gradient(90deg, ${T.green}, #34d399)`
                        : decibels < 62
                          ? `linear-gradient(90deg, ${T.amber}, #fbbf24)`
                          : `linear-gradient(90deg, ${T.red}, #f87171)`,
                      transition: 'width 0.15s ease, background 0.3s',
                    }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 10, color: T.textMuted }}>Ambient Level</span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: noiseColor }}>{noiseLevel} ({decibels}%)</span>
                  </div>
                  {decibels > 60 && (
                    <div style={{ marginTop: 6, fontSize: 10, color: T.red, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                      <AlertTriangle size={10} /> Noise threshold exceeded!
                    </div>
                  )}
                </>
              ) : (
                <p style={{ fontSize: 10, color: T.amber, margin: 0 }}>⚠ Mic permission required for noise monitoring.</p>
              )
            ) : (
              <p style={{ fontSize: 10, color: T.textMuted, margin: 0 }}>Noise monitoring is disabled.</p>
            )}
          </div>

          {/* ── Warnings panel ────────────────────── */}
          <div style={{
            background: `${T.red}0d`,
            border: `1px solid ${T.red}30`, borderRadius: 12, padding: '12px 14px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: T.red, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 4 }}>
                <ShieldAlert size={11} /> Infractions
              </span>
              <span style={{ fontSize: 12, fontWeight: 800, color: T.red }}>{warnings}/5</span>
            </div>
            {/* Warning pip track */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{
                  flex: 1, height: 5, borderRadius: 4,
                  background: i < warnings ? T.red : darkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)',
                  transition: 'background 0.3s',
                }} />
              ))}
            </div>
            <p style={{ fontSize: 9, color: T.textMuted, margin: 0, lineHeight: 1.5 }}>
              At 5 warnings, the exam auto-submits. Tab-switching, noise, and face violations are monitored.
            </p>
          </div>

          {/* ── Alert feed ────────────────────────── */}
          {proctoringAlerts.length > 0 && (
            <div>
              <span style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Alert Log</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                {proctoringAlerts.slice(0, 4).map(a => (
                  <div key={a.id} style={{
                    display: 'flex', alignItems: 'flex-start', gap: 7,
                    padding: '7px 10px', borderRadius: 9,
                    background: darkMode ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)',
                    border: `1px solid ${T.border}`,
                  }}>
                    <span style={{ fontSize: 13 }}>{a.icon}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 10, color: T.text, fontWeight: 600, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.msg}</p>
                      <p style={{ margin: 0, fontSize: 9, color: T.textMuted }}>{a.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Question grid ─────────────────────── */}
          <div>
            <span style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>
              Exam Progress
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 5 }}>
              {questions.map((q, idx) => {
                const isAnswered = answers[q.id]?.selected_option !== '' || answers[q.id]?.subjective_answer !== '';
                const isCurrent = currentIdx === idx;
                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIdx(idx)}
                    style={{
                      height: 34, borderRadius: 8, border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                      transition: 'all 0.15s',
                      background: isCurrent
                        ? T.blue
                        : isAnswered
                          ? `${T.green}22`
                          : darkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)',
                      color: isCurrent ? '#fff' : isAnswered ? T.green : T.textMuted,
                      border: `1.5px solid ${isCurrent ? T.blue : isAnswered ? `${T.green}40` : T.border}`,
                      boxShadow: isCurrent ? `0 2px 10px ${T.blueGlow}` : 'none',
                    }}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

        </aside>
      </div>

      {/* ── WARNING MODAL ─────────────────────────── */}
      {showWarningModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }}>
          <div style={{
            maxWidth: 420, width: '100%',
            background: darkMode ? '#0e1422' : '#fff',
            border: `1.5px solid ${T.red}40`,
            borderRadius: 22, padding: '36px 32px',
            textAlign: 'center',
            boxShadow: `0 24px 80px rgba(0,0,0,0.5), 0 0 40px ${T.red}20`,
            animation: 'popIn 0.25s ease',
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%', margin: '0 auto 16px',
              background: `${T.red}15`, border: `2px solid ${T.red}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <ShieldAlert size={28} color={T.red} />
            </div>
            <h2 style={{ margin: '0 0 8px 0', fontSize: 18, fontWeight: 800, color: T.red }}>
              Security Violation Detected
            </h2>
            <p style={{ margin: '0 0 6px 0', fontSize: 13, color: T.textSub, lineHeight: 1.6 }}>{warningMsg}</p>
            <p style={{ margin: '0 0 24px 0', fontSize: 12, color: T.textMuted }}>
              {5 - warnings} warning{5 - warnings !== 1 ? 's' : ''} remaining before auto-submit.
            </p>
            <button
              onClick={() => setShowWarningModal(false)}
              style={{
                padding: '11px 28px', borderRadius: 12, fontSize: 13, fontWeight: 700,
                background: `linear-gradient(135deg, ${T.red}, #be123c)`,
                border: 'none', color: '#fff', cursor: 'pointer',
                boxShadow: `0 6px 20px ${T.red}40`,
              }}
            >
              I Understand — Return to Exam
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes ping  { 0%{transform:scale(1);opacity:1} 75%,100%{transform:scale(1.6);opacity:0} }
        @keyframes popIn { from{transform:scale(0.88);opacity:0} to{transform:scale(1);opacity:1} }
        @keyframes spin  { to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}
