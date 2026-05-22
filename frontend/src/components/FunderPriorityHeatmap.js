import React, { useEffect, useState } from 'react';

// VIZ #2: Funder Priority Heatmap (focus_area x funder)
export default function FunderPriorityHeatmap() {
  const [data, setData] = useState({ focuses: [], funders: [], cells: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/custom-views/priority-heatmap', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Failed');
        setData(json);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const cellOf = (focus, funder) => data.cells.find((c) => c.focus === focus && c.funder === funder) || { score: 0, grant_count: 0 };

  const color = (s) => {
    // Soft heat scale 0..100
    if (s >= 80) return '#1d4ed8';
    if (s >= 60) return '#3b82f6';
    if (s >= 40) return '#60a5fa';
    if (s >= 20) return '#bfdbfe';
    if (s > 0) return '#e0e7ff';
    return '#f1f5f9';
  };
  const textColor = (s) => (s >= 50 ? '#fff' : '#0f172a');

  return (
    <div data-testid="priority-heatmap" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '1.25rem' }}>
      <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a' }}>Funder Priority Heatmap</h3>
      <p style={{ margin: '0 0 0.75rem', color: '#64748b', fontSize: '0.85rem' }}>Focus area vs. funder priority score (0–100)</p>
      {loading && <div style={{ color: '#64748b' }}>Loading...</div>}
      {error && <div style={{ background: '#fee', color: '#900', padding: '0.5rem', borderRadius: 6 }}>{error}</div>}
      {!loading && !error && data.focuses.length > 0 && data.funders.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'separate', borderSpacing: 4, minWidth: '100%' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', fontSize: '0.75rem', color: '#475569', padding: 4 }}>Focus \ Funder</th>
                {data.funders.map((f) => (
                  <th key={f} style={{ fontSize: '0.7rem', color: '#475569', padding: 4, transform: 'rotate(-15deg)', whiteSpace: 'nowrap', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis' }} title={f}>{f}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.focuses.map((focus) => (
                <tr key={focus}>
                  <td style={{ fontSize: '0.78rem', color: '#0f172a', padding: 4, whiteSpace: 'nowrap', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis' }} title={focus}>{focus}</td>
                  {data.funders.map((f) => {
                    const c = cellOf(focus, f);
                    return (
                      <td key={f} title={`${focus} × ${f} • score ${c.score} • ${c.grant_count} grant(s)`}
                          style={{ background: color(c.score), color: textColor(c.score), width: 60, height: 38, textAlign: 'center', fontSize: '0.75rem', borderRadius: 6 }}>
                        {c.score || ''}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!loading && !error && (data.focuses.length === 0 || data.funders.length === 0) && (
        <div style={{ color: '#64748b' }}>Not enough funder/grant data to build a heatmap.</div>
      )}
    </div>
  );
}
