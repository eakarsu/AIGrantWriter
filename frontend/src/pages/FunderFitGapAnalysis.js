import React, { useEffect, useState } from 'react';

export default function FunderFitGapAnalysis() {
  const [data, setData] = useState(null);
  const token = localStorage.getItem('token');
  useEffect(() => {
    fetch('/api/funder-fit-gap-analysis', { headers: token ? { Authorization: `Bearer ${token}` } : {} }).then((r) => r.json()).then(setData).catch(() => {});
  }, [token]);
  return (
    <div className="page">
      <h1>Funder Fit Gap Analysis</h1>
      <p>Compares proposal readiness against funder requirements before submission.</p>
      {data && (
        <section className="card">
          <h2>{data.readiness} - {data.fit_score}</h2>
          <ul>{data.gaps.map((gap) => <li key={gap}>{gap}</li>)}</ul>
          <h3>Rewrite priorities</h3>
          <ul>{data.rewrite_priorities.map((p) => <li key={p}>{p}</li>)}</ul>
        </section>
      )}
    </div>
  );
}
