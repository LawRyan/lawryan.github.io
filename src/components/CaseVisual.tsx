/**
 * One small visual per case study, built only from the approved figures in content.ts.
 * Reductions are drawn as "before = 100", so no baseline number is invented.
 */
const Reduce = ({ pct, what }: { pct: number; what: string }) => (
  <figure className="cv cv-reduce" aria-label={`${what}: down ${pct}%. Before shown as 100, after as ${100 - pct}.`}>
    <div className="cv-bars" aria-hidden="true">
      <div className="cv-row"><span>Before</span><i className="cv-before" style={{ width: '100%' }} /><b>100</b></div>
      <div className="cv-row"><span>After</span><i className="cv-after" style={{ width: `${100 - pct}%` }} /><b>{100 - pct}</b></div>
    </div>
    <figcaption><strong>−{pct}%</strong> {what} <span className="muted">· indexed, before = 100</span></figcaption>
  </figure>
);

const Stats = ({ items }: { items: [string, string][] }) => (
  <figure className="cv cv-stats">
    {items.map(([v, l]) => <div key={l}><b>{v}</b><span>{l}</span></div>)}
  </figure>
);

const Flow = ({ steps, note }: { steps: string[]; note: string }) => (
  <figure className="cv cv-flow" aria-label={`${steps.join(', then ')}. ${note}`}>
    <ol aria-hidden="true">{steps.map((s, i) => <li key={s} style={{ ['--i' as string]: i }}>{s}</li>)}</ol>
    <figcaption className="muted">{note}</figcaption>
  </figure>
);

export default function CaseVisual({ id }: { id: string }) {
  switch (id) {
    case 'validation': return <Flow steps={['Trade data', '300+ rules', 'Exceptions', 'Reporting']} note="Checked before it reaches a report, across roughly 100–150K trade records." />;
    case 'modernization': return <Stats items={[['~40', 'reports modernized'], ['~30 hrs', 'saved each month']]} />;
    case 'automation': return <Reduce pct={95} what="manual reporting effort" />;
    case 'kyc-bots': return <Reduce pct={97} what="human error in KYC refresh" />;
    case 'fixed-income': return <Flow steps={['Client activity', 'RFQ flow', 'Shared views', 'Coverage teams']} note="One picture of client engagement, built from the questions coverage teams ask." />;
    case 'kyc': return <Stats items={[['20,000+', 'clients'], ['4,000+', 'PDFs remediated'], ['300+ hrs', 'saved']]} />;
    default: return null;
  }
}
