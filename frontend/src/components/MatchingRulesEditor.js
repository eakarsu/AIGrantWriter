import React, { useEffect, useState } from 'react';

// NON-VIZ #2: Grant-matching rules editor (CRUD)
// Edits eligibility, focus areas, amount range, geography, priority.
const empty = {
  name: '', eligibility: '', focus_areas: '',
  min_amount: 0, max_amount: 0, geography: '',
  priority: 'medium', active: true
};

export default function MatchingRulesEditor() {
  const [rules, setRules] = useState([]);
  const [draft, setDraft] = useState(empty);
  const [editing, setEditing] = useState(null); // id or null
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');

  const tokenHdr = () => {
    const t = localStorage.getItem('token');
    return t ? { Authorization: `Bearer ${t}` } : {};
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/custom-views/rules', { headers: tokenHdr() });
      const json = await res.json();
      setRules(json.rules || []);
    } catch (e) {
      setMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async (e) => {
    e.preventDefault();
    setMsg('');
    try {
      const method = editing ? 'PUT' : 'POST';
      const url = editing ? `/api/custom-views/rules/${editing}` : '/api/custom-views/rules';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...tokenHdr() },
        body: JSON.stringify(draft)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Save failed');
      setDraft(empty); setEditing(null);
      await load();
      setMsg(editing ? 'Rule updated' : 'Rule created');
    } catch (e) {
      setMsg(e.message);
    }
  };

  const edit = (r) => { setEditing(r.id); setDraft({ ...empty, ...r }); };
  const cancel = () => { setEditing(null); setDraft(empty); };
  const remove = async (id) => {
    if (!window.confirm('Delete this rule?')) return;
    try {
      const res = await fetch(`/api/custom-views/rules/${id}`, { method: 'DELETE', headers: tokenHdr() });
      if (!res.ok) throw new Error('Delete failed');
      await load();
      setMsg('Rule deleted');
    } catch (e) {
      setMsg(e.message);
    }
  };

  const inp = { padding: '0.4rem 0.6rem', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.85rem', width: '100%' };

  return (
    <div data-testid="matching-rules-editor" style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '1.25rem' }}>
      <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#0f172a' }}>Grant-Matching Rules Editor</h3>
      <p style={{ margin: '0 0 0.75rem', color: '#64748b', fontSize: '0.85rem' }}>Define eligibility, focus areas, amount ranges, geography, and priority.</p>

      <form onSubmit={save} style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
        <input style={inp} placeholder="Rule name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} required />
        <input style={inp} placeholder="Eligibility (e.g. 501(c)(3))" value={draft.eligibility} onChange={(e) => setDraft({ ...draft, eligibility: e.target.value })} />
        <input style={inp} placeholder="Focus areas (comma-separated)" value={draft.focus_areas} onChange={(e) => setDraft({ ...draft, focus_areas: e.target.value })} />
        <input style={inp} type="number" placeholder="Min amount" value={draft.min_amount} onChange={(e) => setDraft({ ...draft, min_amount: e.target.value })} />
        <input style={inp} type="number" placeholder="Max amount" value={draft.max_amount} onChange={(e) => setDraft({ ...draft, max_amount: e.target.value })} />
        <input style={inp} placeholder="Geography" value={draft.geography} onChange={(e) => setDraft({ ...draft, geography: e.target.value })} />
        <select style={inp} value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value })}>
          <option value="low">low</option>
          <option value="medium">medium</option>
          <option value="high">high</option>
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: '#1e293b' }}>
          <input type="checkbox" checked={!!draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} /> active
        </label>
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="submit" style={{ padding: '0.45rem 0.9rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
            {editing ? 'Update' : 'Create'}
          </button>
          {editing && <button type="button" onClick={cancel} style={{ padding: '0.45rem 0.9rem', border: '1px solid #cbd5e1', background: '#fff', borderRadius: 6, cursor: 'pointer' }}>Cancel</button>}
        </div>
      </form>

      {msg && <div style={{ marginBottom: 8, fontSize: '0.85rem', color: '#0f172a' }}>{msg}</div>}
      {loading && <div style={{ color: '#64748b' }}>Loading rules...</div>}

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc' }}>
              <th style={th}>Name</th>
              <th style={th}>Focus</th>
              <th style={th}>Eligibility</th>
              <th style={th}>Range</th>
              <th style={th}>Geo</th>
              <th style={th}>Priority</th>
              <th style={th}>Active</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.id} style={{ borderTop: '1px solid #e2e8f0' }}>
                <td style={td}>{r.name}</td>
                <td style={td}>{r.focus_areas}</td>
                <td style={td}>{r.eligibility}</td>
                <td style={td}>${Number(r.min_amount).toLocaleString()} – ${Number(r.max_amount).toLocaleString()}</td>
                <td style={td}>{r.geography}</td>
                <td style={td}>{r.priority}</td>
                <td style={td}>{r.active ? 'yes' : 'no'}</td>
                <td style={td}>
                  <button onClick={() => edit(r)} style={miniBtn}>Edit</button>{' '}
                  <button onClick={() => remove(r.id)} style={{ ...miniBtn, borderColor: '#dc2626', color: '#dc2626' }}>Del</button>
                </td>
              </tr>
            ))}
            {!loading && rules.length === 0 && (
              <tr><td colSpan={8} style={{ padding: '0.75rem', color: '#64748b' }}>No rules defined yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const th = { textAlign: 'left', padding: '0.5rem 0.6rem', fontSize: '0.78rem', color: '#475569' };
const td = { padding: '0.5rem 0.6rem', color: '#0f172a' };
const miniBtn = { padding: '0.25rem 0.55rem', fontSize: '0.75rem', border: '1px solid #cbd5e1', background: '#fff', borderRadius: 6, cursor: 'pointer' };
