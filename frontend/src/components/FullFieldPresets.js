import React from 'react';

export function fillEveryField(values, variant = 0, choices = {}) {
  const names = ['Youth literacy program', 'Community food access pilot', 'Workforce training initiative'];
  return Object.fromEntries(Object.entries(values).map(([key, value]) => {
    if (['id', 'created_at', 'updated_at', 'user_id'].includes(key) || /(?:_id|file|upload|attachment|source_ref)/i.test(key)) return [key, value];
    if (key === 'ai_suggestions') return [key, {}];
    if (choices[key]) return [key, choices[key][variant % choices[key].length]];
    if (Array.isArray(value)) return [key, [`${names[variant]} example`, 'Review lighting and delivery requirements']];
    if (value && typeof value === 'object') return [key, { exposure: 0.2, contrast: 12, highlights: -20, white_balance: 'Daylight' }];
    if (typeof value === 'boolean') return [key, true];
    if (/date|deadline|valid_until/.test(key)) return [key, new Date(Date.now() + (variant + 7) * 86400000).toISOString().slice(0, key === 'scheduled_date' ? 16 : 10)];
    if (/email/.test(key)) return [key, `client${variant + 1}@example.com`];
    if (/budget|price|cost|amount/.test(key)) return [key, [2400, 650, 4200][variant]];
    if (/duration/.test(key)) return [key, [6, 2, 8][variant]];
    if (/crew|party_size/.test(key)) return [key, [3, 2, 5][variant]];
    if (/travel/.test(key)) return [key, [25, 8, 40][variant]];
    if (/deliverables/.test(key)) return [key, [250, 35, 80][variant]];
    if (/experience/.test(key)) return [key, [6, 4, 8][variant]];
    if (typeof value === 'number') return [key, [3, 2, 5][variant]];
    if (/location|address|market/.test(key)) return [key, ['Rural upstate New York', 'Buffalo, New York', 'Greater Rochester, New York'][variant]];
    if (/status/.test(key)) return [key, 'Pending'];
    if (/tone/.test(key)) return [key, ['Warm and polished', 'Friendly and concise', 'Confident and professional'][variant]];
    if (/type/.test(key)) return [key, ['Education', 'Food access', 'Workforce development'][variant]];
    if (/title|name/.test(key)) return [key, names[variant]];
    return [key, `${names[variant]} example: define the beneficiaries, activities, measurable outcomes, budget assumptions, and evaluation plan. Verify source facts before using this draft.`];
  }));
}

export default function FullFieldPresets({ value, onChange, choices = {}, presets, disabled = false }) {
  const labels = presets ? presets.map((preset) => preset.label) : ['Literacy example', 'Food access example', 'Workforce example'];
  return <div className="ai-preset-bar"><div><strong>Fill every field</strong><p>Each example fills required and optional fields. Review and edit before generating.</p></div><div className="ai-actions">{labels.map((label, index) => <button type="button" className="btn btn-secondary" key={label} disabled={disabled} onClick={() => onChange(presets ? { ...value, ...presets[index].values } : fillEveryField(value, index, choices))}>{label}</button>)}</div></div>;
}
