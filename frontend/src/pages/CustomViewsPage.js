import React from 'react';
import GrantSuccessRateChart from '../components/GrantSuccessRateChart';
import FunderPriorityHeatmap from '../components/FunderPriorityHeatmap';
import ProposalPdfExport from '../components/ProposalPdfExport';
import MatchingRulesEditor from '../components/MatchingRulesEditor';

export default function CustomViewsPage() {
  return (
    <div data-testid="custom-views-page" style={{ padding: '2rem', maxWidth: 1200, margin: '0 auto' }}>
      <header style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.75rem', color: '#0f172a' }}>Grant Views</h1>
        <p style={{ margin: '0.35rem 0 0', color: '#64748b' }}>
          Visualize grant success rates &amp; funder priorities. Export full proposal PDFs.
          Maintain your grant-matching rule set.
        </p>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <GrantSuccessRateChart />
        <FunderPriorityHeatmap />
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 16 }}>
        <ProposalPdfExport />
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
        <MatchingRulesEditor />
      </section>
    </div>
  );
}
