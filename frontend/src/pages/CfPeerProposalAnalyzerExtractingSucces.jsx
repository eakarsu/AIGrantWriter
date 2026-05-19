import React, { useState } from 'react';

// === Batch 04 Gaps & Frontend Mounts ===
// Auto-generated page for: Peer proposal analyzer extracting success patterns from publ

export default function CfPeerProposalAnalyzerExtractingSucces() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/cf-peer-proposal-analyzer-extracting-succes', {
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
      <h1 style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>Peer proposal analyzer extracting success patterns from publ</h1>
      <p style={{ color: '#666', marginBottom: '1.5rem' }}>Peer proposal analyzer extracting success patterns from public winning proposals.</p>
      <form onSubmit={handleSubmit} style={{ marginBottom: '1.5rem' }}>
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
          {loading ? 'Processing...' : 'Run Peer proposal analyzer extracting success patterns from publ'}
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
