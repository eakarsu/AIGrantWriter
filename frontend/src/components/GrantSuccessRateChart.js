import React, { useEffect, useState } from 'react';

// VIZ #1: Grant Success Rate Chart (by funder or category)
// Pure-SVG bars; no external chart lib required.
export default function GrantSuccessRateChart() {
  const [by, setBy] = useState('funder');
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async (mode) => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/custom-views/success-rate?by=${mode}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed');
      setData(json.data || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(by); }, [by]);

  const max = Math.max(1, ...data.map((d) => d.success_rate));
  const rows = data.slice(0, 10);

  return (
    <div data-testid="success-rate-chart" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a' }}>Grant Success Rate</h3>
          <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>Approval rate by {by === 'funder' ? 'funder' : 'focus category'}</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setBy('funder')} style={btn(by === 'funder')}>By Funder</button>
          <button onClick={() => setBy('category')} style={btn(by === 'category')}>By Category</button>
        </div>
      </div>
      {loading && <div style={muted}>Loading...</div>}
      {error && <div style={errBox}>{error}</div>}
      {!loading && !error && rows.length === 0 && <div style={muted}>No proposal/grant data available.</div>}
      {!loading && !error && rows.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map((d) => (
            <div key={d.key} style={{ display: 'grid', gridTemplateColumns: '180px 1fr 80px', alignItems: 'center', gap: 8 }}>
              <div style={{ fontSize: '0.85rem', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={d.key}>{d.key}</div>
              <div style={{ background: '#f1f5f9', borderRadius: 6, height: 22, overflow: 'hidden' }}>
                <div style={{ width: `${(d.success_rate / max) * 100}%`, height: '100%', background: 'linear-gradient(90deg,#2563eb,#10b981)' }} />
              </div>
              <div style={{ fontSize: '0.85rem', color: '#0f172a', textAlign: 'right' }}>
                {d.success_rate}% <span style={{ color: '#94a3b8' }}>({d.approved}/{d.total})</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const btn = (active) => ({
  padding: '0.35rem 0.7rem', borderRadius: 6, fontSize: '0.8rem', cursor: 'pointer',
  border: '1px solid ' + (active ? '#2563eb' : '#cbd5e1'),
  background: active ? '#2563eb' : '#fff',
  color: active ? '#fff' : '#0f172a'
});
const muted = { color: '#64748b', fontSize: '0.9rem' };
const errBox = { background: '#fee', color: '#900', padding: '0.5rem 0.75rem', borderRadius: 6, fontSize: '0.85rem' };
