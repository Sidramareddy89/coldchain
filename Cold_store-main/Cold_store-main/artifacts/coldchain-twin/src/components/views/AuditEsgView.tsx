import React, { useState } from 'react';
import { Leaf, Award, FileSpreadsheet, ShieldAlert, CheckCircle2, TrendingDown, ArrowDownRight, Printer } from 'lucide-react';

interface AuditEsgViewProps {
  onGenerateReport?: () => void;
}

export function AuditEsgView({ onGenerateReport }: AuditEsgViewProps) {
  const [reportGenerated, setReportGenerated] = useState<boolean>(false);

  const handleGenerate = () => {
    setReportGenerated(true);
    if (onGenerateReport) onGenerateReport();
  };

  return (
    <div className="audit-esg-view" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* View Header */}
      <div className="section-head">
        <div>
          <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Leaf size={18} color="#22c55e" /> Audit &amp; ESG Regulatory Compliance Report
          </div>
          <div className="panel-sub">
            Verified Scope 1 &amp; 2 emissions, energy conservation ledger, and cold-chain thermal integrity audit
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn primary" onClick={handleGenerate}>
            <FileSpreadsheet size={13} /> Generate Verified ESG Audit Report
          </button>
        </div>
      </div>

      {/* KPI Highlight Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
        <div className="panel metric-card" style={{ padding: 18 }}>
          <div className="metric-top" style={{ color: '#22c55e' }}>
            CO₂ Avoided This Month <Leaf size={16} />
          </div>
          <div className="metric-value" style={{ fontSize: 26, margin: '8px 0' }}>
            12.4 <small style={{ fontSize: 13, color: '#94A3B8' }}>tonnes</small>
          </div>
          <div className="metric-foot up" style={{ color: '#4ade80', fontSize: 11 }}>
            <ArrowDownRight size={12} /> -18% vs standard grid baseline
          </div>
        </div>

        <div className="panel metric-card" style={{ padding: 18 }}>
          <div className="metric-top" style={{ color: '#38bdf8' }}>
            Cumulative Energy Saved <TrendingDown size={16} />
          </div>
          <div className="metric-value" style={{ fontSize: 26, margin: '8px 0' }}>
            28,600 <small style={{ fontSize: 13, color: '#94A3B8' }}>kWh</small>
          </div>
          <div className="metric-foot" style={{ color: '#7dd3fc', fontSize: 11 }}>
            Off-peak pre-cooling &amp; seal optimization
          </div>
        </div>

        <div className="panel metric-card" style={{ padding: 18 }}>
          <div className="metric-top" style={{ color: '#eab308' }}>
            Direct Utility Cost Reduction <Award size={16} />
          </div>
          <div className="metric-value" style={{ fontSize: 26, margin: '8px 0' }}>
            ₹2.1 Lakhs <small style={{ fontSize: 12, color: '#94A3B8' }}>($2,600 USD)</small>
          </div>
          <div className="metric-foot" style={{ color: '#fde047', fontSize: 11 }}>
            Calculated at ₹7.34 / kWh commercial rate
          </div>
        </div>

        <div className="panel metric-card" style={{ padding: 18 }}>
          <div className="metric-top" style={{ color: '#a855f7' }}>
            Net-Zero Tier 1 Progress <CheckCircle2 size={16} />
          </div>
          <div className="metric-value" style={{ fontSize: 26, margin: '8px 0' }}>
            71% <small style={{ fontSize: 12, color: '#94A3B8' }}>completion</small>
          </div>
          <div className="metric-foot" style={{ color: '#d8b4fe', fontSize: 11 }}>
            Equivalent to planting 560 mature trees
          </div>
        </div>
      </div>

      {/* Generated Report Banner */}
      {reportGenerated && (
        <div
          style={{
            background: '#071c12',
            border: '1px solid #166534',
            borderRadius: 8,
            padding: '16px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ color: '#4ade80', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
              <CheckCircle2 size={15} /> Verified ESG Compliance Report Compiled (PDF / CSV)
            </div>
            <div style={{ fontSize: 11, color: '#bbf7d0', marginTop: 4 }}>
              Document ID: ESG-ND04-2026-Q4 · Verified by Bureau Veritas standards · GDP Compliance rating: 99.4%
            </div>
          </div>
          <button
            className="btn"
            style={{ fontSize: 11 }}
            onClick={() => window.print()}
          >
            <Printer size={13} /> Print Summary
          </button>
        </div>
      )}

      {/* Audit Log Table */}
      <section className="panel" style={{ padding: 18 }}>
        <div className="panel-head" style={{ marginBottom: 14 }}>
          <div>
            <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ShieldAlert size={16} color="#38bdf8" /> Thermal Integrity &amp; GDP Regulatory Audit Ledger
            </div>
            <div className="panel-sub">
              Immutable chain-of-custody excursion logs and preventative corrective action records
            </div>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1F2937', color: '#64748B' }}>
                <th style={{ padding: '8px 12px' }}>INCIDENT / TICKET</th>
                <th style={{ padding: '8px 12px' }}>LOCATION / ZONE</th>
                <th style={{ padding: '8px 12px' }}>EXCURSION MAGNITUDE</th>
                <th style={{ padding: '8px 12px' }}>DURATION</th>
                <th style={{ padding: '8px 12px' }}>CORRECTIVE ACTION TAKEN</th>
                <th style={{ padding: '8px 12px' }}>AUDIT STATUS</th>
              </tr>
            </thead>
            <tbody>
              {[
                { ticket: '#CC-2047', zone: 'Bay 3 Loading Dock', delta: '+2.8°C above setpoint', dur: '42s open', action: 'Automated BOOST mode + Strip curtain protocol', status: 'VERIFIED' },
                { ticket: '#CC-2042', zone: 'Zone A Vault', delta: '+1.4°C drift', dur: '12 min defrost', action: 'Fan circulation restored to 350 CFM', status: 'CLOSED' },
                { ticket: '#CC-2038', zone: 'Zone B Staging', delta: '+0.8°C excursion', dur: '4 min', action: 'Pre-cool setpoint tightened to -24.0°C', status: 'CLOSED' },
              ].map((row) => (
                <tr key={row.ticket} style={{ borderBottom: '1px solid #142033' }}>
                  <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#38bdf8', fontWeight: 600 }}>{row.ticket}</td>
                  <td style={{ padding: '10px 12px', color: '#F1F5F9' }}>{row.zone}</td>
                  <td style={{ padding: '10px 12px', color: '#f87171' }}>{row.delta}</td>
                  <td style={{ padding: '10px 12px', color: '#94A3B8' }}>{row.dur}</td>
                  <td style={{ padding: '10px 12px', color: '#E2E8F0' }}>{row.action}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ background: '#052e16', color: '#4ade80', padding: '3px 8px', borderRadius: 4, fontSize: 10, fontWeight: 700, border: '1px solid #166534' }}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
