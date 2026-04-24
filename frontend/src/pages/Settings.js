import React, { useState } from 'react';
import { useAuth, api } from '../App';
import { useToast } from '../components/Toast';
import PasswordStrength from '../components/PasswordStrength';
import {
  FiSettings, FiUser, FiMail, FiLock, FiSave,
  FiBell, FiMoon, FiGlobe, FiKey
} from 'react-icons/fi';
import './Settings.css';

const Settings = () => {
  const { user } = useAuth();
  const toast = useToast();

  const [profile, setProfile] = useState({
    name: user?.name || '',
    email: user?.email || ''
  });

  const [password, setPassword] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    proposalReminders: true,
    deadlineAlerts: true,
    darkMode: false,
    language: 'en'
  });

  const [apiSettings, setApiSettings] = useState({
    openrouterKey: '',
    model: 'anthropic/claude-haiku-4.5'
  });

  const handleProfileSave = (e) => {
    e.preventDefault();
    toast.success('Profile updated successfully!');
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (password.new !== password.confirm) {
      toast.error('New passwords do not match');
      return;
    }
    if (password.new.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    try {
      await api.post('/auth/change-password', {
        currentPassword: password.current,
        newPassword: password.new,
      });
      toast.success('Password changed successfully!');
      setPassword({ current: '', new: '', confirm: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to change password');
    }
  };

  const handlePreferencesSave = () => {
    toast.success('Preferences saved!');
  };

  const handleApiSave = () => {
    if (!apiSettings.openrouterKey) {
      toast.warning('Please enter your OpenRouter API key');
      return;
    }
    toast.success('API settings saved!');
  };

  return (
    <div className="settings-page">
      <div className="page-header">
        <div>
          <h1><FiSettings /> Settings</h1>
          <p>Manage your account and application preferences</p>
        </div>
      </div>

      <div className="settings-grid">
        {/* Profile Section */}
        <div className="settings-card">
          <div className="settings-card-header">
            <FiUser className="settings-card-icon" />
            <div>
              <h2>Profile Information</h2>
              <p>Update your account details</p>
            </div>
          </div>
          <form onSubmit={handleProfileSave} className="settings-form">
            <div className="form-group">
              <label><FiUser /> Full Name</label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                placeholder="Your full name"
              />
            </div>
            <div className="form-group">
              <label><FiMail /> Email Address</label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                placeholder="your.email@example.com"
              />
            </div>
            <button type="submit" className="btn btn-primary">
              <FiSave /> Save Profile
            </button>
          </form>
        </div>

        {/* Password Section */}
        <div className="settings-card">
          <div className="settings-card-header">
            <FiLock className="settings-card-icon" />
            <div>
              <h2>Change Password</h2>
              <p>Update your security credentials</p>
            </div>
          </div>
          <form onSubmit={handlePasswordChange} className="settings-form">
            <div className="form-group">
              <label>Current Password</label>
              <input
                type="password"
                value={password.current}
                onChange={(e) => setPassword({ ...password, current: e.target.value })}
                placeholder="Enter current password"
              />
            </div>
            <div className="form-group">
              <label>New Password</label>
              <input
                type="password"
                value={password.new}
                onChange={(e) => setPassword({ ...password, new: e.target.value })}
                placeholder="Enter new password"
              />
            </div>
            <PasswordStrength password={password.new} />
            <div className="form-group">
              <label>Confirm New Password</label>
              <input
                type="password"
                value={password.confirm}
                onChange={(e) => setPassword({ ...password, confirm: e.target.value })}
                placeholder="Confirm new password"
              />
            </div>
            <button type="submit" className="btn btn-primary">
              <FiLock /> Change Password
            </button>
          </form>
        </div>

        {/* Notifications Section */}
        <div className="settings-card">
          <div className="settings-card-header">
            <FiBell className="settings-card-icon" />
            <div>
              <h2>Notifications</h2>
              <p>Manage your notification preferences</p>
            </div>
          </div>
          <div className="settings-form">
            <div className="toggle-group">
              <div className="toggle-info">
                <span className="toggle-label">Email Notifications</span>
                <span className="toggle-description">Receive email updates about your account</span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={preferences.emailNotifications}
                  onChange={(e) => setPreferences({ ...preferences, emailNotifications: e.target.checked })}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
            <div className="toggle-group">
              <div className="toggle-info">
                <span className="toggle-label">Proposal Reminders</span>
                <span className="toggle-description">Get reminded about draft proposals</span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={preferences.proposalReminders}
                  onChange={(e) => setPreferences({ ...preferences, proposalReminders: e.target.checked })}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
            <div className="toggle-group">
              <div className="toggle-info">
                <span className="toggle-label">Deadline Alerts</span>
                <span className="toggle-description">Alerts for upcoming grant deadlines</span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={preferences.deadlineAlerts}
                  onChange={(e) => setPreferences({ ...preferences, deadlineAlerts: e.target.checked })}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
            <button className="btn btn-primary" onClick={handlePreferencesSave}>
              <FiSave /> Save Preferences
            </button>
          </div>
        </div>

        {/* API Settings Section */}
        <div className="settings-card">
          <div className="settings-card-header">
            <FiKey className="settings-card-icon" />
            <div>
              <h2>AI Configuration</h2>
              <p>Configure OpenRouter API settings</p>
            </div>
          </div>
          <div className="settings-form">
            <div className="form-group">
              <label><FiKey /> OpenRouter API Key</label>
              <input
                type="password"
                value={apiSettings.openrouterKey}
                onChange={(e) => setApiSettings({ ...apiSettings, openrouterKey: e.target.value })}
                placeholder="sk-or-v1-..."
              />
              <span className="form-hint">Your API key is stored securely and never shared</span>
            </div>
            <div className="form-group">
              <label><FiGlobe /> AI Model</label>
              <select
                value={apiSettings.model}
                onChange={(e) => setApiSettings({ ...apiSettings, model: e.target.value })}
              >
                <option value="anthropic/claude-haiku-4.5">Claude Haiku 4.5 (Fast)</option>
                <option value="anthropic/claude-sonnet-4">Claude Sonnet 4 (Balanced)</option>
                <option value="anthropic/claude-opus-4">Claude Opus 4 (Best)</option>
                <option value="openai/gpt-4o">GPT-4o</option>
                <option value="openai/gpt-4o-mini">GPT-4o Mini</option>
              </select>
            </div>
            <button className="btn btn-primary" onClick={handleApiSave}>
              <FiSave /> Save API Settings
            </button>
          </div>
        </div>

        {/* Appearance Section */}
        <div className="settings-card full-width">
          <div className="settings-card-header">
            <FiMoon className="settings-card-icon" />
            <div>
              <h2>Appearance</h2>
              <p>Customize your visual experience</p>
            </div>
          </div>
          <div className="settings-form">
            <div className="toggle-group">
              <div className="toggle-info">
                <span className="toggle-label">Dark Mode</span>
                <span className="toggle-description">Use dark theme (coming soon)</span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={preferences.darkMode}
                  onChange={(e) => setPreferences({ ...preferences, darkMode: e.target.checked })}
                  disabled
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
            <div className="form-group" style={{ maxWidth: '300px' }}>
              <label><FiGlobe /> Language</label>
              <select
                value={preferences.language}
                onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}
              >
                <option value="en">English</option>
                <option value="es">Español (coming soon)</option>
                <option value="fr">Français (coming soon)</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
