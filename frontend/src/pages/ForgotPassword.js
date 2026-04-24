import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../App';
import { FiMail, FiCpu } from 'react-icons/fi';
import './Login.css';
import './Register.css';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const response = await api.post('/auth/forgot-password', { email });
      setSuccess(response.data.message);
      if (response.data.resetToken) {
        setResetToken(response.data.resetToken);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send reset link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg">
        <div className="login-bg-shape shape-1"></div>
        <div className="login-bg-shape shape-2"></div>
        <div className="login-bg-shape shape-3"></div>
      </div>
      <div className="login-container register-container">
        <div className="login-card">
          <div className="login-header">
            <div className="login-logo"><FiCpu size={32} /></div>
            <h1>Forgot Password</h1>
            <p>Enter your email to receive a password reset link</p>
          </div>

          {error && <div className="login-error">{error}</div>}
          {success && <div className="login-success">{success}</div>}

          {resetToken && (
            <div className="login-success" style={{ wordBreak: 'break-all' }}>
              <strong>Dev Mode Reset Token:</strong><br />
              <code style={{ fontSize: 11 }}>{resetToken}</code><br />
              <Link to={`/reset-password?token=${resetToken}`} style={{ color: '#166534', fontWeight: 600 }}>
                Click here to reset password
              </Link>
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
            <button type="submit" className="login-btn" disabled={loading}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>

          <div className="auth-links">
            <p>Remember your password? <Link to="/login">Sign in</Link></p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
