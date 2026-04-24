import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../App';
import { FiMail, FiLock, FiCpu, FiZap } from 'react-icons/fi';
import './Login.css';

const Login = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAutoFill = () => {
    setEmail('demo@grantwriter.com');
    setPassword('password123');
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

          <div className="login-divider">
            <span>or</span>
          </div>

          <button type="button" className="demo-btn" onClick={handleAutoFill}>
            <FiZap />
            Auto-fill Demo Credentials
          </button>

          <div className="login-footer">
            <p>Demo credentials will be filled automatically</p>
            <p className="credentials">
              <strong>Email:</strong> demo@grantwriter.com<br />
              <strong>Password:</strong> password123
            </p>
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
