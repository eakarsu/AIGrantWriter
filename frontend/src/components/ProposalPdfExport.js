import React, { useEffect, useState } from 'react';

// NON-VIZ #1: Full Grant Proposal PDF export
// Lists existing proposals (best-effort) and opens a generated PDF in a new tab.
export default function ProposalPdfExport() {
  const [proposals, setProposals] = useState([]);
  const [proposalId, setProposalId] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/proposals', {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });
        if (res.ok) {
          const json = await res.json();
          const list = Array.isArray(json) ? json : json.proposals || json.data || [];
          setProposals(list);
          if (list.length) setProposalId(String(list[0].id));
          else setProposalId('1');
        } else {
          setProposalId('1');
        }
      } catch (_) {
        setProposalId('1');
      }
    })();
  }, []);

  const download = async () => {
    setLoading(true);
    setMsg('');
    try {
      const id = proposalId || '1';
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/custom-views/proposal-pdf/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `proposal-${id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMsg('PDF downloaded.');
    } catch (e) {
      setMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div data-testid="proposal-pdf-export" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '1.25rem' }}>
      <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a' }}>Full Grant Proposal PDF</h3>
      <p style={{ margin: '0 0 0.75rem', color: '#64748b', fontSize: '0.85rem' }}>Export cover page, executive summary, narrative, and budget as PDF.</p>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ fontSize: '0.85rem', color: '#475569' }}>Proposal:</label>
        {proposals.length > 0 ? (
          <select value={proposalId} onChange={(e) => setProposalId(e.target.value)}
                  style={{ padding: '0.4rem 0.6rem', borderRadius: 6, border: '1px solid #cbd5e1', minWidth: 280 }}>
            {proposals.map((p) => (
              <option key={p.id} value={p.id}>{p.id} — {p.title || 'Untitled'}</option>
            ))}
          </select>
        ) : (
          <input value={proposalId} onChange={(e) => setProposalId(e.target.value)} placeholder="Proposal id"
                 style={{ padding: '0.4rem 0.6rem', borderRadius: 6, border: '1px solid #cbd5e1', width: 140 }} />
        )}
        <button onClick={download} disabled={loading}
                style={{ padding: '0.45rem 0.9rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: loading ? 'not-allowed' : 'pointer' }}>
          {loading ? 'Generating...' : 'Download PDF'}
        </button>
      </div>
      {msg && <div style={{ marginTop: 10, fontSize: '0.85rem', color: '#0f172a' }}>{msg}</div>}
    </div>
  );
}
