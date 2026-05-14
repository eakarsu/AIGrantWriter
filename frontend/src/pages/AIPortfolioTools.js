import React, { useState } from 'react';
import { api } from '../App';
import ReactMarkdown from 'react-markdown';
import './AITools.css';

// Apply pass 5 page — wraps the 3 backlog AI endpoints (peer-proposal-analyzer,
// multi-funder-strategy, funder-discovery). Additive only; uses existing api
// instance which carries the JWT bearer token automatically.
const AIPortfolioTools = () => {
  const [tab, setTab] = useState('peer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState('');

  const [peerForm, setPeerForm] = useState({ peer_proposals: '', funder_name: '', our_focus_area: '' });
  const [strategyForm, setStrategyForm] = useState({ organization_id: '', target_annual_budget: '', constraints: '', time_horizon_months: '24' });
  const [discoveryForm, setDiscoveryForm] = useState({ organization_id: '', focus_areas: '', geography: '', project_type: '', exclusions: '' });

  const submit = async (path, body, key) => {
    setLoading(true); setError(''); setResult('');
    try {
      const r = await api.post(path, body);
      setResult(r.data[key] || r.data.content || JSON.stringify(r.data));
    } catch (e) {
      const status = e.response?.status;
      const msg = e.response?.data?.error || e.message;
      setError(status === 503 ? `AI key not configured — ${msg}` : msg);
    } finally { setLoading(false); }
  };

  return (
    <div className="ai-tools-container" style={{ padding: 24 }}>
      <h2>Portfolio & Discovery AI</h2>
      <p style={{ color: '#666' }}>Apply pass 5 backlog tools — peer-proposal analysis, multi-funder strategy, agentic funder discovery.</p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button onClick={() => { setTab('peer'); setResult(''); setError(''); }} disabled={tab === 'peer'}>Peer Analyzer</button>
        <button onClick={() => { setTab('strategy'); setResult(''); setError(''); }} disabled={tab === 'strategy'}>Portfolio Strategy</button>
        <button onClick={() => { setTab('discovery'); setResult(''); setError(''); }} disabled={tab === 'discovery'}>Funder Discovery</button>
      </div>

      {tab === 'peer' && (
        <div className="form-block">
          <label>Funder name (optional)<input value={peerForm.funder_name} onChange={e => setPeerForm({ ...peerForm, funder_name: e.target.value })} /></label>
          <label>Our focus area<input value={peerForm.our_focus_area} onChange={e => setPeerForm({ ...peerForm, our_focus_area: e.target.value })} /></label>
          <label>Peer proposals (paste 1+ proposals)<textarea rows={10} value={peerForm.peer_proposals} onChange={e => setPeerForm({ ...peerForm, peer_proposals: e.target.value })} /></label>
          <button disabled={loading || !peerForm.peer_proposals.trim()} onClick={() => submit('/ai/peer-proposal-analyzer', peerForm, 'analysis')}>{loading ? 'Analyzing…' : 'Run analysis'}</button>
        </div>
      )}

      {tab === 'strategy' && (
        <div className="form-block">
          <label>Organization ID (optional)<input value={strategyForm.organization_id} onChange={e => setStrategyForm({ ...strategyForm, organization_id: e.target.value })} /></label>
          <label>Target annual budget ($)<input value={strategyForm.target_annual_budget} onChange={e => setStrategyForm({ ...strategyForm, target_annual_budget: e.target.value })} /></label>
          <label>Time horizon (months)<input value={strategyForm.time_horizon_months} onChange={e => setStrategyForm({ ...strategyForm, time_horizon_months: e.target.value })} /></label>
          <label>Constraints<textarea rows={3} value={strategyForm.constraints} onChange={e => setStrategyForm({ ...strategyForm, constraints: e.target.value })} /></label>
          <button disabled={loading} onClick={() => submit('/ai/multi-funder-strategy', strategyForm, 'strategy')}>{loading ? 'Building…' : 'Build strategy'}</button>
        </div>
      )}

      {tab === 'discovery' && (
        <div className="form-block">
          <label>Organization ID (optional)<input value={discoveryForm.organization_id} onChange={e => setDiscoveryForm({ ...discoveryForm, organization_id: e.target.value })} /></label>
          <label>Focus areas<input value={discoveryForm.focus_areas} onChange={e => setDiscoveryForm({ ...discoveryForm, focus_areas: e.target.value })} /></label>
          <label>Geography<input value={discoveryForm.geography} onChange={e => setDiscoveryForm({ ...discoveryForm, geography: e.target.value })} /></label>
          <label>Project type<input value={discoveryForm.project_type} onChange={e => setDiscoveryForm({ ...discoveryForm, project_type: e.target.value })} /></label>
          <label>Exclusions<input value={discoveryForm.exclusions} onChange={e => setDiscoveryForm({ ...discoveryForm, exclusions: e.target.value })} /></label>
          <button disabled={loading || (!discoveryForm.focus_areas && !discoveryForm.organization_id)} onClick={() => submit('/ai/funder-discovery', discoveryForm, 'report')}>{loading ? 'Researching…' : 'Run discovery'}</button>
        </div>
      )}

      {error && <div className="error" style={{ color: 'crimson', marginTop: 12 }}>{error}</div>}
      {result && (
        <div className="ai-result" style={{ marginTop: 16, padding: 16, background: '#fafafa', borderRadius: 8 }}>
          <ReactMarkdown>{result}</ReactMarkdown>
        </div>
      )}
    </div>
  );
};

export default AIPortfolioTools;
