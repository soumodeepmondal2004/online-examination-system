import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User, School, Hash, ArrowRight, ShieldAlert, LogIn, UserPlus, BookOpen, Award, Shield } from 'lucide-react';

export default function Login() {
  const { login, register, user } = useAuth();
  const navigate = useNavigate();
  const [isRegistering, setIsRegistering] = useState(false);
  const [role, setRole] = useState('student'); // student, faculty, admin

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Registration specific fields
  const [fullName, setFullName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [department, setDepartment] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to={`/${user.role}`} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isRegistering) {
        const payload = {
          email,
          password,
          role,
          full_name: fullName,
        };
        if (role === 'student') payload.roll_number = rollNumber;
        if (role === 'faculty') payload.department = department;

        await register(payload);
        setSuccess('Registration successful! You can now log in.');
        setIsRegistering(false);
        setPassword('');
      } else {
        await login(email, password);
      }
    } catch (err) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: BookOpen, title: 'Smart Exam Management', desc: 'AI-powered examination creation and automated grading.' },
    { icon: Award, title: 'AI Study Assistant', desc: 'Chat with your lecture PDFs and generate practice quizzes.' },
    { icon: Shield, title: 'Secure Proctoring', desc: 'Tamper-proof assessments with automated integrity checks.' },
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        backgroundColor: 'var(--bg)',
        overflow: 'hidden',
      }}
    >
      {/* ── LEFT PANEL (decorative, hidden on mobile) ── */}
      <div
        style={{
          display: 'none',
          flex: '0 0 45%',
          maxWidth: '45%',
          background: 'linear-gradient(160deg, var(--brand-800) 0%, var(--brand-700) 60%, var(--brand-600) 100%)',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'flex-start',
          padding: '3.5rem',
          position: 'relative',
          overflow: 'hidden',
        }}
        className="login-left-panel"
      >
        {/* Decorative circles */}
        <div
          style={{
            position: 'absolute',
            top: '-80px',
            right: '-80px',
            width: '320px',
            height: '320px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-60px',
            left: '-60px',
            width: '260px',
            height: '260px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)',
            pointerEvents: 'none',
          }}
        />

        {/* Logo mark */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '56px',
            height: '56px',
            borderRadius: '16px',
            background: 'rgba(255,255,255,0.15)',
            marginBottom: '2rem',
          }}
        >
          <School size={28} color="#fff" />
        </div>

        {/* Portal name */}
        <h1
          style={{
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: '2rem',
            fontWeight: '700',
            color: '#fff',
            lineHeight: '1.2',
            marginBottom: '0.75rem',
          }}
        >
          Smart Exam Portal
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.95rem', marginBottom: '2.5rem', lineHeight: '1.6' }}>
          AI-Powered Examination &amp; Proctoring System for modern academic institutions.
        </p>

        {/* Features */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
          {features.map(({ icon: Icon, title, desc }) => (
            <div key={title} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
              <div
                style={{
                  flexShrink: 0,
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon size={18} color="rgba(255,255,255,0.9)" />
              </div>
              <div>
                <div style={{ color: '#fff', fontSize: '0.85rem', fontWeight: '600', marginBottom: '2px' }}>{title}</div>
                <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.78rem', lineHeight: '1.5' }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom copyright */}
        <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.72rem', marginTop: 'auto', paddingTop: '3rem' }}>
          © 2026 Smart Exam Portal. All rights reserved.
        </p>
      </div>

      {/* ── RIGHT PANEL (form) ── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem 1rem',
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '420px',
          }}
          className="fade-up"
        >
          {/* Mobile-only header */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }} className="login-mobile-header">
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '52px',
                height: '52px',
                borderRadius: '14px',
                background: 'var(--brand-100)',
                marginBottom: '1rem',
              }}
            >
              <School size={26} color="var(--brand-700)" />
            </div>
            <h1
              style={{
                fontFamily: 'Georgia, serif',
                fontSize: '1.6rem',
                fontWeight: '700',
                color: 'var(--brand-800)',
                marginBottom: '0.25rem',
              }}
            >
              Smart Exam Portal
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              AI-Powered Examination &amp; Proctoring System
            </p>
          </div>

          {/* Card */}
          <div
            className="card"
            style={{ padding: '2rem' }}
          >
            {/* Tab bar */}
            <div
              style={{
                display: 'flex',
                borderBottom: '2px solid var(--border)',
                marginBottom: '1.5rem',
              }}
            >
              {[
                { key: false, label: 'Sign In', icon: LogIn },
                { key: true, label: 'Register', icon: UserPlus },
              ].map(({ key, label, icon: Icon }) => {
                const active = isRegistering === key;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => { setIsRegistering(key); setError(''); setSuccess(''); }}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      paddingBottom: '0.75rem',
                      fontSize: '0.85rem',
                      fontWeight: '600',
                      border: 'none',
                      borderBottom: active ? '2px solid var(--brand-700)' : '2px solid transparent',
                      marginBottom: '-2px',
                      background: 'transparent',
                      color: active ? 'var(--brand-700)' : 'var(--text-muted)',
                      cursor: 'pointer',
                      transition: 'color 0.2s, border-color 0.2s',
                    }}
                  >
                    <Icon size={15} />
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Alerts */}
            {error && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'var(--danger-100)',
                  border: '1px solid var(--danger-600)',
                  borderRadius: '8px',
                  color: 'var(--danger-600)',
                  padding: '0.65rem 0.9rem',
                  fontSize: '0.82rem',
                  marginBottom: '1.25rem',
                }}
              >
                <ShieldAlert size={15} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}
            {success && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'var(--success-100)',
                  border: '1px solid var(--success-600)',
                  borderRadius: '8px',
                  color: 'var(--success-600)',
                  padding: '0.65rem 0.9rem',
                  fontSize: '0.82rem',
                  marginBottom: '1.25rem',
                }}
              >
                <LogIn size={15} style={{ flexShrink: 0 }} />
                <span>{success}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

              {/* Role selector */}
              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: '0.5rem' }}>
                  Portal Role
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: isRegistering ? '1fr 1fr' : '1fr 1fr 1fr', gap: '8px' }}>
                  {['student', 'faculty', 'admin'].map((r) => {
                    if (isRegistering && r === 'admin') return null;
                    const active = role === r;
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRole(r)}
                        style={{
                          padding: '0.5rem 0.25rem',
                          fontSize: '0.78rem',
                          fontWeight: active ? '700' : '500',
                          textTransform: 'capitalize',
                          border: active ? '2px solid var(--brand-700)' : '1.5px solid var(--border-strong)',
                          borderRadius: '8px',
                          background: active ? 'var(--brand-700)' : 'transparent',
                          color: active ? '#fff' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          transition: 'all 0.18s',
                        }}
                      >
                        {r}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Full Name (registration only) */}
              {isRegistering && (
                <div>
                  <label className="form-label" style={{ display: 'block', marginBottom: '0.4rem' }}>Full Name</label>
                  <div style={{ position: 'relative' }}>
                    <User
                      size={15}
                      style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                    />
                    <input
                      type="text"
                      required
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="form-input"
                      style={{ paddingLeft: '36px' }}
                    />
                  </div>
                </div>
              )}

              {/* Roll Number (registration + student) */}
              {isRegistering && role === 'student' && (
                <div>
                  <label className="form-label" style={{ display: 'block', marginBottom: '0.4rem' }}>College Roll Number</label>
                  <div style={{ position: 'relative' }}>
                    <Hash
                      size={15}
                      style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                    />
                    <input
                      type="text"
                      required
                      placeholder="CS-2026-089"
                      value={rollNumber}
                      onChange={(e) => setRollNumber(e.target.value)}
                      className="form-input"
                      style={{ paddingLeft: '36px' }}
                    />
                  </div>
                </div>
              )}

              {/* Department (registration + faculty) */}
              {isRegistering && role === 'faculty' && (
                <div>
                  <label className="form-label" style={{ display: 'block', marginBottom: '0.4rem' }}>Department</label>
                  <div style={{ position: 'relative' }}>
                    <School
                      size={15}
                      style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                    />
                    <input
                      type="text"
                      required
                      placeholder="Computer Science & Engineering"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="form-input"
                      style={{ paddingLeft: '36px' }}
                    />
                  </div>
                </div>
              )}

              {/* Email */}
              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: '0.4rem' }}>Email Address</label>
                <div style={{ position: 'relative' }}>
                  <Mail
                    size={15}
                    style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                  />
                  <input
                    type="email"
                    required
                    placeholder="you@university.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: '36px' }}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="form-label" style={{ display: 'block', marginBottom: '0.4rem' }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <Lock
                    size={15}
                    style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
                  />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="form-input"
                    style={{ paddingLeft: '36px' }}
                  />
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary"
                style={{
                  width: '100%',
                  marginTop: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  opacity: loading ? 0.65 : 1,
                }}
              >
                {loading ? (
                  <span className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} />
                ) : (
                  <>
                    <span>{isRegistering ? 'Create Account' : 'Sign In'}</span>
                    {isRegistering ? <UserPlus size={15} /> : <LogIn size={15} />}
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </form>

            {/* Footer toggle */}
            <p
              style={{
                textAlign: 'center',
                fontSize: '0.8rem',
                color: 'var(--text-muted)',
                marginTop: '1.25rem',
              }}
            >
              {isRegistering ? (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => { setIsRegistering(false); setError(''); }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--brand-700)',
                      fontWeight: '600',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      fontSize: 'inherit',
                    }}
                  >
                    Sign In
                  </button>
                </>
              ) : (
                <>
                  New to the platform?{' '}
                  <button
                    type="button"
                    onClick={() => { setIsRegistering(true); setError(''); }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--brand-700)',
                      fontWeight: '600',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      fontSize: 'inherit',
                    }}
                  >
                    Create an account
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Responsive styles */}
      <style>{`
        @media (min-width: 768px) {
          .login-left-panel {
            display: flex !important;
          }
          .login-mobile-header {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
