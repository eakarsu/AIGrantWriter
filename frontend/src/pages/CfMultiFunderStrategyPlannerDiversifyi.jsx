import React, { useState } from 'react';

// === Batch 04 Gaps & Frontend Mounts ===
// Auto-generated page for: Multi-funder strategy planner diversifying across large gran

export default function CfMultiFunderStrategyPlannerDiversifyi() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const sampleRequests = [
      {
          "label": "Scenario",
          "value": "Run Multi-funder strategy planner diversifying across large gran for a realistic customer case.\nContext: a team needs a practical recommendation based on incomplete operating data.\nGoal: identify the best action, key risks, missing information, and expected business impact.\nReturn: summary, prioritized action plan, assumptions, and follow-up questions."
      },
      {
          "label": "Data sample",
          "value": "Analyze this Multi-funder strategy planner diversifying across large gran data sample.\nInput records:\n- Record 1: urgent, customer impact high, owner unassigned\n- Record 2: medium priority, blocked by missing data\n- Record 3: recurring issue, automation opportunity\nReturn structured findings, anomalies, recommendations, and confidence."
      },
      {
          "label": "Executive review",
          "value": "Prepare an executive review for Multi-funder strategy planner diversifying across large gran.\nAudience: business owner, operations lead, and implementation team.\nInclude impact, risk, estimated effort, decision points, and a concise next-step plan."
      }
  ];

  const applySampleRequest = (value) => {
    setInput(value);
    setError(null);
    setResult(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/cf-multi-funder-strategy-planner-diversifyi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ input, context: {} }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Multi-funder strategy planner diversifying across large gran</h1>
      <p style={{ color: '#666', marginBottom: '1.5rem' }}>Multi-funder strategy planner diversifying across large grants, federal, foundation, and corporate.</p>
      <form onSubmit={handleSubmit} style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
          {sampleRequests.map((sample) => (
            <button
              key={sample.label}
              type="button"
              onClick={() => applySampleRequest(sample.value)}
              style={{ padding: '6px 10px', background: '#eef2ff', color: '#1e3a8a', border: '1px solid #c7d2fe', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
            >
              {sample.label}
            </button>
          ))}
        </div>

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter context, parameters, or query..."
          style={{ width: '100%', minHeight: '120px', padding: '0.75rem', border: '1px solid #ddd', borderRadius: '6px', fontFamily: 'inherit' }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{ marginTop: '0.75rem', padding: '0.6rem 1.2rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? 'Processing...' : 'Run Multi-funder strategy planner diversifying across large gran'}
        </button>
      </form>
      {error && <div style={{ background: '#fee', color: '#900', padding: '0.75rem', borderRadius: '6px', marginBottom: '1rem' }}>{error}</div>}
      {result && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '1rem', borderRadius: '8px' }}>
          <h3 style={{ marginTop: 0 }}>Result</h3>
          <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: '0.9rem' }}>{typeof result === 'string' ? result : JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
