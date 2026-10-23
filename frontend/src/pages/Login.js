import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../App';
import { FiMail, FiLock, FiCpu } from 'react-icons/fi';
import './Login.css';

const Login = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const signInWith = async (loginEmail, loginPassword) => {
    setError('');
    setLoading(true);

    try {
      await login(loginEmail, loginPassword);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await signInWith(email, password);
  };

  return (
    <div className="login-page">
      <div className="login-bg">
        <div className="login-bg-shape shape-1"></div>
        <div className="login-bg-shape shape-2"></div>
        <div className="login-bg-shape shape-3"></div>
      </div>

      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div className="login-logo">
              <FiCpu size={32} />
            </div>
            <h1>AI Grant Writer</h1>
            <p>Auto-generate grant proposals from organization data</p>
          </div>

          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="input-group">
              <FiMail className="input-icon" />
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <FiLock className="input-icon" />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <button
              type="button"
              onClick={() => {
                const demoEmail = process.env.REACT_APP_DEMO_EMAIL || '';
                const demoPassword = process.env.REACT_APP_DEMO_PASSWORD || '';
                setEmail(demoEmail);
                setPassword(demoPassword);
                signInWith(demoEmail, demoPassword);
              }}
              disabled={loading || !process.env.REACT_APP_DEMO_EMAIL || !process.env.REACT_APP_DEMO_PASSWORD}
              aria-label="Fill demo credentials"
              style={{ width: '100%', marginBottom: '12px', padding: '10px 14px', borderRadius: '8px', border: '1px solid currentColor', background: 'transparent', cursor: 'pointer' }}
            >
              Fill demo credentials
            </button>
            {(!process.env.REACT_APP_DEMO_EMAIL || !process.env.REACT_APP_DEMO_PASSWORD) && <p role="status">Demo credentials are not configured for this frontend build.</p>}
            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? (
                <>
                  <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }}></div>
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="login-footer">
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
              <Link to="/register" style={{ color: '#4F46E5', textDecoration: 'none', fontWeight: 600 }}>Create account</Link>
              <Link to="/forgot-password" style={{ color: '#64748b', textDecoration: 'none' }}>Forgot password?</Link>
            </div>
          </div>
        </div>

        <div className="login-features">
          <h2>Transform Your Grant Writing</h2>
          <div className="feature-list">
            <div className="feature-item">
              <div className="feature-icon">🎯</div>
              <div>
                <h3>AI-Powered Proposals</h3>
                <p>Generate compelling grant proposals with advanced AI</p>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-icon">🔍</div>
              <div>
                <h3>Smart Matching</h3>
                <p>Match your organization to the best funding opportunities</p>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-icon">📊</div>
              <div>
                <h3>Track Progress</h3>
                <p>Manage proposals from draft to submission</p>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-icon">✨</div>
              <div>
                <h3>Professional Templates</h3>
                <p>Access proven templates for any grant type</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
