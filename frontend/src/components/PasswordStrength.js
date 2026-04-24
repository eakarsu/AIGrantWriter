import React from 'react';
import { getPasswordStrength } from '../utils/validation';
import './PasswordStrength.css';

const PasswordStrength = ({ password }) => {
  const { score, label, checks } = getPasswordStrength(password);

  if (!password) return null;

  const colors = ['', '#EF4444', '#F59E0B', '#F59E0B', '#10B981', '#059669'];

  return (
    <div className="password-strength">
      <div className="strength-bar-container">
        <div
          className="strength-bar-fill"
          style={{ width: `${(score / 5) * 100}%`, background: colors[score] }}
        />
      </div>
      <span className="strength-label" style={{ color: colors[score] }}>{label}</span>
      <ul className="strength-checklist">
        <li className={checks.minLength ? 'met' : ''}>At least 8 characters</li>
        <li className={checks.hasUppercase ? 'met' : ''}>Uppercase letter</li>
        <li className={checks.hasLowercase ? 'met' : ''}>Lowercase letter</li>
        <li className={checks.hasNumber ? 'met' : ''}>Number</li>
        <li className={checks.hasSpecial ? 'met' : ''}>Special character</li>
      </ul>
    </div>
  );
};

export default PasswordStrength;
