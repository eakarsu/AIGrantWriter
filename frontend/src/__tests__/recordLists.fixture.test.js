import React, { act } from 'react';
global.IS_REACT_ACT_ENVIRONMENT = true;
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import fs from 'fs';
import path from 'path';

jest.mock('../utils/exportPdf', () => ({ exportToPdf: jest.fn() }));
jest.mock('../App', () => ({ api: { get: jest.fn() } }));
jest.mock('../components/Toast', () => { const toast = { error: () => {}, success: () => {}, info: () => {}, warning: () => {} }; return { useToast: () => toast }; });
const { api } = require('../App');
const seed = fs.readFileSync(path.resolve(__dirname, '../../../backend/seed.js'), 'utf8');
function seedRecords(table) {
  const start = seed.indexOf(`INSERT INTO ${table} (`);
  if (start < 0) throw new Error(`Missing seed block: ${table}`);
  const end = seed.indexOf('`);', start);
  const block = seed.slice(start, end);
  const names = [...block.matchAll(/^\s*\('([^']+)'/gm)].map((match) => match[1]);
  if (names.length < 15) throw new Error(`${table} seed has only ${names.length} records`);
  return names.map((name, index) => ({
    id: index + 1, name, title: name, description: `${name} grant program`, mission: `${name} mission`,
    category: 'Community', doc_type: 'Report', funder_name: name, funder_type: 'Foundation',
    created_at: '2026-01-01T12:00:00Z', due_date: '2026-12-01T12:00:00Z', deadline: '2026-12-01T12:00:00Z',
    start_date: '2026-01-01', end_date: '2026-12-01', status: 'draft', priority: 'medium',
    annual_budget: 100000, amount_min: 10000, amount_max: 50000, amount_requested: 25000,
    total_amount: 25000, target_value: 100, current_value: 0, unit: 'people',
    organization_id: 1, proposal_id: 1, grant_id: 1, focus_areas: 'Education'
  }));
}
const records = Object.fromEntries(['organizations','grants','proposals','templates','documents','budgets','impact_metrics','deadlines','funders'].map((table) => [table.replace('_','-'), seedRecords(table)]));
const pages = [
  ['Organizations','organizations','tbody tr'], ['Grants','grants','tbody tr'],
  ['Proposals','proposals','tbody tr'], ['Templates','templates','.data-card'],
  ['Documents','documents','tbody tr'], ['Budgets','budgets','tbody tr'],
  ['ImpactMetrics','impact-metrics','tbody tr'], ['Deadlines','deadlines','tbody tr'],
  ['Funders','funders','tbody tr']
];
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
beforeEach(() => {
  api.get.mockImplementation((url) => {
    const key = String(url).split('?')[0].replace(/^\//,'');
    const rows = records[key] || [];
    return Promise.resolve({ data: { data: rows, total: rows.length, page: 1, limit: 25, totalPages: 1 } });
  });
});
afterEach(() => { api.get.mockClear(); document.body.innerHTML = ''; });
for (const [component, endpoint, selector] of pages) {
  test(`${component} renders at least 15 project seed records without runtime errors`, async () => {
    const Page = require(`../pages/${component}`).default;
    const host = document.createElement('div'); document.body.appendChild(host);
    const root = createRoot(host);
    const errors = [];
    const originalError = console.error;
    console.error = (...args) => { errors.push(args.map(String).join(' ')); };
    try {
      await act(async () => { root.render(<MemoryRouter><Page /></MemoryRouter>); await flush(); await flush(); });
      expect(api.get.mock.calls.some(([url]) => String(url).startsWith(`/${endpoint}`))).toBe(true);
      expect(host.querySelectorAll(selector).length).toBeGreaterThanOrEqual(15);
      expect(errors).toEqual([]);
      await act(async () => root.unmount());
    } finally { console.error = originalError; }
  });
}
