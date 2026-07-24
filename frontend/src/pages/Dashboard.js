import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../App';
import {
  FiUsers, FiDollarSign, FiFileText, FiLayout,
  FiFolder, FiCpu, FiArrowRight, FiTrendingUp,
  FiCalendar, FiCheckCircle, FiClock, FiAlertCircle,
  FiPieChart, FiTarget, FiSearch
} from 'react-icons/fi';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    organizations: 0,
    grants: 0,
    proposals: 0,
    templates: 0,
    documents: 0,
    budgets: 0,
    impactMetrics: 0,
    deadlines: 0,
    funders: 0
  });
  const [recentProposals, setRecentProposals] = useState([]);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState([]);
  const [proposalStats, setProposalStats] = useState({
    draft: 0,
    submitted: 0,
    approved: 0,
    pending_review: 0,
    rejected: 0
  });
  const [totalFunding, setTotalFunding] = useState({
    requested: 0,
    approved: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [orgs, grants, proposals, templates, documents, budgets, impactMetrics, deadlines, funders] = await Promise.all([
        api.get('/organizations'),
        api.get('/grants'),
        api.get('/proposals'),
        api.get('/templates'),
        api.get('/documents'),
        api.get('/budgets'),
        api.get('/impact-metrics'),
        api.get('/deadlines'),
        api.get('/funders')
      ]);
      const list = (response) => Array.isArray(response.data)
        ? response.data
        : (response.data?.items || response.data?.data || response.data?.rows || []);
      const organizationRows = list(orgs);
      const grantRows = list(grants);
      const proposalRows = list(proposals);
      const templateRows = list(templates);
      const documentRows = list(documents);
      const budgetRows = list(budgets);
      const impactMetricRows = list(impactMetrics);
      const deadlineRows = list(deadlines);
      const funderRows = list(funders);

      setStats({
        organizations: organizationRows.length,
        grants: grantRows.length,
        proposals: proposalRows.length,
        templates: templateRows.length,
        documents: documentRows.length,
        budgets: budgetRows.length,
        impactMetrics: impactMetricRows.length,
        deadlines: deadlineRows.length,
        funders: funderRows.length
      });

      setRecentProposals(proposalRows.slice(0, 5));

      // Calculate proposal status stats
      const statusCounts = proposalRows.reduce((acc, p) => {
        acc[p.status] = (acc[p.status] || 0) + 1;
        return acc;
      }, {});
      setProposalStats({
        draft: statusCounts.draft || 0,
        submitted: statusCounts.submitted || 0,
        approved: statusCounts.approved || 0,
        pending_review: statusCounts.pending_review || 0,
        rejected: statusCounts.rejected || 0
      });

      // Calculate funding totals
      const totalRequested = proposalRows.reduce((sum, p) => sum + (Number(p.amount_requested) || 0), 0);
      const totalApproved = proposalRows
        .filter(p => p.status === 'approved')
        .reduce((sum, p) => sum + (Number(p.amount_requested) || 0), 0);
      setTotalFunding({ requested: totalRequested, approved: totalApproved });

      // Get upcoming deadlines from both deadlines table and grants
      const allDeadlines = deadlineRows
        .filter(d => new Date(d.due_date) > new Date() && d.status !== 'completed')
        .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
        .slice(0, 5);
      setUpcomingDeadlines(allDeadlines);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const mainCards = [
    {
      title: 'Organizations',
      count: stats.organizations,
      icon: FiUsers,
      color: '#4F46E5',
      gradient: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
      path: '/organizations',
      description: 'Manage nonprofit profiles'
    },
    {
      title: 'Grants',
      count: stats.grants,
      icon: FiDollarSign,
      color: '#10B981',
      gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
      path: '/grants',
      description: 'Track funding opportunities'
    },
    {
      title: 'Proposals',
      count: stats.proposals,
      icon: FiFileText,
      color: '#F59E0B',
      gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
      path: '/proposals',
      description: 'Manage grant applications'
    },
    {
      title: 'Templates',
      count: stats.templates,
      icon: FiLayout,
      color: '#EF4444',
      gradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
      path: '/templates',
      description: 'Reusable document templates'
    },
    {
      title: 'Documents',
      count: stats.documents,
      icon: FiFolder,
      color: '#8B5CF6',
      gradient: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
      path: '/documents',
      description: 'Supporting materials'
    },
    {
      title: 'Funders',
      count: stats.funders,
      icon: FiSearch,
      color: '#06B6D4',
      gradient: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
      path: '/funders',
      description: 'Research funding sources'
    }
  ];

  const aiCards = [
    {
      title: 'AI Tools',
      count: '6+',
      icon: FiCpu,
      color: '#EC4899',
      gradient: 'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)',
      path: '/ai-tools',
      description: 'AI-powered writing tools'
    },
    {
      title: 'Budget Builder',
      count: stats.budgets,
      icon: FiPieChart,
      color: '#14B8A6',
      gradient: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
      path: '/budgets',
      description: 'AI budget generation'
    },
    {
      title: 'Impact Measurer',
      count: stats.impactMetrics,
      icon: FiTarget,
      color: '#F97316',
      gradient: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
      path: '/impact-metrics',
      description: 'Track program outcomes'
    },
    {
      title: 'Deadline Tracker',
      count: stats.deadlines,
      icon: FiCalendar,
      color: '#6366F1',
      gradient: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
      path: '/deadlines',
      description: 'Never miss a deadline'
    }
  ];

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <FiCheckCircle className="status-icon approved" />;
      case 'submitted':
        return <FiTrendingUp className="status-icon submitted" />;
      case 'pending_review':
        return <FiAlertCircle className="status-icon pending" />;
      default:
        return <FiClock className="status-icon draft" />;
    }
  };

  const getPriorityClass = (priority) => {
    switch (priority) {
      case 'high': return 'urgent';
      case 'medium': return 'soon';
      default: return 'normal';
    }
  };

  const totalProposals = Object.values(proposalStats).reduce((a, b) => a + b, 0);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p>Welcome back! Here's an overview of your grant writing activities.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/ai-tools')}>
          <FiCpu />
          Generate Proposal with AI
        </button>
      </div>

      {/* Main Feature Cards */}
      <div className="stats-grid">
        {mainCards.map((card) => (
          <div
            key={card.title}
            className="stat-card"
            onClick={() => navigate(card.path)}
          >
            <div className="stat-card-icon" style={{ background: card.gradient }}>
              <card.icon size={24} />
            </div>
            <div className="stat-card-content">
              <h3>{card.title}</h3>
              <p className="stat-count">{card.count}</p>
              <p className="stat-description">{card.description}</p>
            </div>
            <FiArrowRight className="stat-card-arrow" />
          </div>
        ))}
      </div>

      {/* AI Features Section */}
      <div className="section-title">
        <h2><FiCpu /> AI-Powered Features</h2>
      </div>
      <div className="stats-grid ai-cards">
        {aiCards.map((card) => (
          <div
            key={card.title}
            className="stat-card ai-card"
            onClick={() => navigate(card.path)}
          >
            <div className="stat-card-icon" style={{ background: card.gradient }}>
              <card.icon size={24} />
            </div>
            <div className="stat-card-content">
              <h3>{card.title}</h3>
              <p className="stat-count">{card.count}</p>
              <p className="stat-description">{card.description}</p>
            </div>
            <FiArrowRight className="stat-card-arrow" />
          </div>
        ))}
      </div>

      {/* Analytics Section */}
      <div className="analytics-grid">
        {/* Funding Overview */}
        <div className="analytics-card">
          <div className="analytics-header">
            <h2><FiDollarSign /> Funding Overview</h2>
          </div>
          <div className="funding-stats">
            <div className="funding-item">
              <span className="funding-label">Total Requested</span>
              <span className="funding-value requested">${totalFunding.requested.toLocaleString()}</span>
            </div>
            <div className="funding-item">
              <span className="funding-label">Total Approved</span>
              <span className="funding-value approved">${totalFunding.approved.toLocaleString()}</span>
            </div>
            <div className="funding-item">
              <span className="funding-label">Success Rate</span>
              <span className="funding-value rate">
                {totalFunding.requested > 0
                  ? Math.round((totalFunding.approved / totalFunding.requested) * 100)
                  : 0}%
              </span>
            </div>
          </div>
        </div>

        {/* Proposal Status Chart */}
        <div className="analytics-card">
          <div className="analytics-header">
            <h2><FiPieChart /> Proposal Status</h2>
          </div>
          <div className="status-chart">
            {totalProposals > 0 ? (
              <>
                <div className="status-bars">
                  {proposalStats.draft > 0 && (
                    <div
                      className="status-bar draft"
                      style={{ width: `${(proposalStats.draft / totalProposals) * 100}%` }}
                      title={`Draft: ${proposalStats.draft}`}
                    />
                  )}
                  {proposalStats.submitted > 0 && (
                    <div
                      className="status-bar submitted"
                      style={{ width: `${(proposalStats.submitted / totalProposals) * 100}%` }}
                      title={`Submitted: ${proposalStats.submitted}`}
                    />
                  )}
                  {proposalStats.pending_review > 0 && (
                    <div
                      className="status-bar pending"
                      style={{ width: `${(proposalStats.pending_review / totalProposals) * 100}%` }}
                      title={`Pending Review: ${proposalStats.pending_review}`}
                    />
                  )}
                  {proposalStats.approved > 0 && (
                    <div
                      className="status-bar approved"
                      style={{ width: `${(proposalStats.approved / totalProposals) * 100}%` }}
                      title={`Approved: ${proposalStats.approved}`}
                    />
                  )}
                </div>
                <div className="status-legend">
                  <div className="legend-item">
                    <span className="legend-dot draft"></span>
                    <span>Draft ({proposalStats.draft})</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot submitted"></span>
                    <span>Submitted ({proposalStats.submitted})</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot pending"></span>
                    <span>Pending ({proposalStats.pending_review})</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot approved"></span>
                    <span>Approved ({proposalStats.approved})</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="empty-chart">No proposals yet</div>
            )}
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-section">
          <div className="section-header">
            <h2><FiFileText /> Recent Proposals</h2>
            <button className="btn btn-secondary" onClick={() => navigate('/proposals')}>
              View All
            </button>
          </div>
          <div className="section-content">
            {recentProposals.length === 0 ? (
              <div className="empty-state">
                <p>No proposals yet. Create your first proposal!</p>
                <button className="btn btn-primary" onClick={() => navigate('/proposals')}>
                  Create Proposal
                </button>
              </div>
            ) : (
              <div className="proposal-list">
                {recentProposals.map((proposal) => (
                  <div
                    key={proposal.id}
                    className="proposal-item"
                    onClick={() => navigate('/proposals')}
                  >
                    <div className="proposal-info">
                      {getStatusIcon(proposal.status)}
                      <div>
                        <h4>{proposal.title}</h4>
                        <p>{proposal.organization_name || 'No organization'}</p>
                      </div>
                    </div>
                    <div className="proposal-meta">
                      <span className="proposal-amount">${proposal.amount_requested?.toLocaleString() || 'N/A'}</span>
                      <span className={`status-badge status-${proposal.status}`}>
                        {proposal.status?.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="dashboard-section">
          <div className="section-header">
            <h2><FiCalendar /> Upcoming Deadlines</h2>
            <button className="btn btn-secondary" onClick={() => navigate('/deadlines')}>
              View All
            </button>
          </div>
          <div className="section-content">
            {upcomingDeadlines.length === 0 ? (
              <div className="empty-state">
                <p>No upcoming deadlines.</p>
                <button className="btn btn-primary" onClick={() => navigate('/deadlines')}>
                  Add Deadline
                </button>
              </div>
            ) : (
              <div className="deadline-list">
                {upcomingDeadlines.map((deadline) => {
                  const daysUntil = Math.ceil((new Date(deadline.due_date) - new Date()) / (1000 * 60 * 60 * 24));
                  const urgency = daysUntil <= 7 ? 'urgent' : daysUntil <= 30 ? 'soon' : 'normal';

                  return (
                    <div
                      key={deadline.id}
                      className={`deadline-item ${urgency}`}
                      onClick={() => navigate('/deadlines')}
                    >
                      <div className="deadline-date">
                        <span className="deadline-day">
                          {new Date(deadline.due_date).getDate()}
                        </span>
                        <span className="deadline-month">
                          {new Date(deadline.due_date).toLocaleString('default', { month: 'short' })}
                        </span>
                      </div>
                      <div className="deadline-info">
                        <h4>{deadline.title}</h4>
                        <p>{deadline.grant_title || deadline.task_type || 'Task'}</p>
                        <div className="deadline-meta">
                          <span className={`priority-badge ${getPriorityClass(deadline.priority)}`}>
                            {deadline.priority}
                          </span>
                          <span className={`deadline-badge ${urgency}`}>
                            {daysUntil} days left
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
