import React, { act } from 'react';
global.IS_REACT_ACT_ENVIRONMENT = true;
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import AIReport from '../components/AIReport';
import AITools from '../pages/AITools';
import AIHistory from '../pages/AIHistory';
import Login from '../pages/Login';

jest.mock('../utils/exportPdf', () => ({ exportToPdf: jest.fn() }));
jest.mock('../App', () => ({ api: { get: jest.fn(), post: jest.fn() }, useAuth: () => ({ login: jest.fn() }) }));
jest.mock('../components/Toast', () => { const toast = { error: () => {}, success: () => {}, info: () => {}, warning: () => {} }; return { useToast: () => toast }; });
const { api } = require('../App');
const report = { review: { approved: false, count: 0, note: '' }, beneficiaries: [{ group: 'Students', served: 80 }, { group: 'Families', served: 12 }], next_steps: ['Validate baseline', 'Confirm budget'] };
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
async function mount(Component) {
  const host = document.createElement('div'); document.body.appendChild(host); const root = createRoot(host);
  await act(async () => { root.render(<MemoryRouter><Component /></MemoryRouter>); await flush(); await flush(); });
  return { host, root };
}
afterEach(() => { api.get.mockReset(); api.post.mockReset(); document.body.innerHTML = ''; });
test('returned structured report renders facts, table, lists and falsy scalars', () => {
  const html = renderToStaticMarkup(<AIReport response={{ content: report }} title="Grant review" />);
  expect(html).toContain('Review'); expect(html).toContain('Approved'); expect(html).toContain('No');
  expect(html).toContain('Count'); expect(html).toContain('0'); expect(html).toContain('(empty string)');
  expect(html).toContain('<table'); expect(html).toContain('Students'); expect(html).toContain('Validate baseline');
  expect(html).not.toContain('{&quot;review&quot;');
});
test('saved AI history detail uses the same structured report', async () => {
  api.get.mockImplementation((url) => Promise.resolve({ data: { results: [{ id: 1, title: 'Grant review', content: report, tool_type: 'review-proposal', created_at: '2026-01-01' }], total: 1, totalPages: 1 } }));
  const { host, root } = await mount(AIHistory);
  await act(async () => host.querySelector('tbody tr.clickable-row').click());
  expect(host.textContent).toContain('Approved'); expect(host.textContent).toContain('(empty string)');
  expect(host.querySelector('table.ai-report-table')).not.toBeNull();
  await act(async () => root.unmount());
});
test('native Generate Proposal preset fills required references from available options and optional context without submitting', async () => {
  api.get.mockImplementation((url) => Promise.resolve({ data: { data: String(url).includes('organizations') ? [{ id: 7, name: 'Green Earth Foundation' }] : [{ id: 9, title: 'Environmental Innovation Grant' }], total: 1 } }));
  const { host, root } = await mount(AITools);
  const button = [...host.querySelectorAll('button')].find((item) => item.textContent.includes('Fill all fields'));
  expect(button).toBeTruthy();
  await act(async () => button.click());
  const panel = host.querySelector('.tool-panel');
  const [organization, grant] = panel.querySelectorAll('select');
  expect(organization.value).toBe('7'); expect(grant.value).toBe('9');
  expect(panel.querySelector('textarea').value.length).toBeGreaterThan(20);
  expect(api.post).not.toHaveBeenCalled();
  await act(async () => root.unmount());
});
test('login explicitly reports unavailable demo credentials without submitting', async () => {
  const { host, root } = await mount(Login);
  const button = host.querySelector('[aria-label="Fill demo credentials"]');
  expect(button.disabled).toBe(true);
  expect(host.textContent).toContain('Demo credentials are not configured');
  expect(api.post).not.toHaveBeenCalled();
  await act(async () => root.unmount());
});
