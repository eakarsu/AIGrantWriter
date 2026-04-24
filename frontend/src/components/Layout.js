import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import {
  FiHome, FiUsers, FiDollarSign, FiFileText,
  FiLayout, FiFolder, FiCpu, FiLogOut, FiMenu, FiX,
  FiSettings, FiPieChart, FiCalendar, FiSearch, FiTarget, FiClock
} from 'react-icons/fi';
import './Layout.css';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  const navItems = [
    { path: '/', icon: FiHome, label: 'Dashboard' },
    { path: '/organizations', icon: FiUsers, label: 'Organizations' },
    { path: '/grants', icon: FiDollarSign, label: 'Grants' },
    { path: '/proposals', icon: FiFileText, label: 'Proposals' },
    { path: '/templates', icon: FiLayout, label: 'Templates' },
    { path: '/documents', icon: FiFolder, label: 'Documents' },
    { divider: true, label: 'AI Features' },
    { path: '/ai-tools', icon: FiCpu, label: 'AI Tools' },
    { path: '/budgets', icon: FiPieChart, label: 'Budget Builder' },
    { path: '/impact-metrics', icon: FiTarget, label: 'Impact Measurer' },
    { path: '/deadlines', icon: FiCalendar, label: 'Deadline Tracker' },
    { path: '/funders', icon: FiSearch, label: 'Funder Research' },
    { path: '/ai-history', icon: FiClock, label: 'AI History' },
    { divider: true, label: 'Settings' },
    { path: '/settings', icon: FiSettings, label: 'Settings' },
  ];

  return (
    <div className="layout">
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="logo" onClick={() => navigate('/')}>
            <div className="logo-icon">
              <FiCpu size={24} />
            </div>
            {sidebarOpen && <span className="logo-text">AI Grant Writer</span>}
          </div>
          <button className="toggle-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? <FiX size={20} /> : <FiMenu size={20} />}
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item, index) => (
            item.divider ? (
              sidebarOpen && (
                <div key={index} className="nav-divider">
                  <span>{item.label}</span>
                </div>
              )
            ) : (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                end={item.path === '/'}
              >
                <item.icon size={20} />
                {sidebarOpen && <span>{item.label}</span>}
              </NavLink>
            )
          ))}
        </nav>

        <div className="sidebar-footer">
          {sidebarOpen && (
            <div className="user-info" onClick={() => navigate('/settings')}>
              <div className="user-avatar">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <div className="user-details">
                <span className="user-name">{user?.name || 'User'}</span>
                <span className="user-email">{user?.email || ''}</span>
              </div>
            </div>
          )}
          <button className="logout-btn" onClick={logout}>
            <FiLogOut size={20} />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <main className={`main-content ${sidebarOpen ? '' : 'sidebar-collapsed'}`}>
        {children}
      </main>
    </div>
  );
};

export default Layout;
