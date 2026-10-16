import React from 'react';
import {
  Bot,
  BrainCircuit,
  Sparkles,
  ShieldAlert,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCw,
  Cpu,
  Activity,
  FileText,
  Thermometer,
  Wrench,
} from 'lucide-react';
import { AgentLogEntry } from '@/hooks/useDigitalTwinControl';

interface AutonomousCrewOperationsCardProps {
  crewStatus: string;
  rootCause: string;
  shelfLifeImpact: string;
  autonomousActionTaken: string;
  agentLog: AgentLogEntry[];
  autoInterventionEnabled: boolean;
  isEvaluatingCrew: boolean;
  onToggleAutoIntervention: (enabled: boolean) => void;
  onRunDiagnostic: () => void;
}

export function AutonomousCrewOperationsCard({
  crewStatus,
  rootCause,
  shelfLifeImpact,
  autonomousActionTaken,
  agentLog,
  autoInterventionEnabled,
  isEvaluatingCrew,
  onToggleAutoIntervention,
  onRunDiagnostic,
}: AutonomousCrewOperationsCardProps) {
  // Agent definitions
  const agents = [
    {
      id: 'TelemetrySentinelAgent',
      name: 'TelemetrySentinel',
      role: 'Telemetry & Invariant Auditor',
      icon: Activity,
      color: '#38bdf8',
      desc: 'Real-time sensor telemetry & dT/dt invariant analysis',
    },
    {
      id: 'QualityPredictorAgent',
      name: 'QualityPredictor',
      role: 'Biochemical Scientist',
      icon: Thermometer,
      color: '#4ade80',
      desc: 'Arrhenius thermal kinetic degradation & MKT modeling',
    },
    {
      id: 'RemediationDispatcherAgent',
      name: 'RemediationDispatcher',
      role: 'Operations Commander',
      icon: Wrench,
      color: '#f59e0b',
      desc: 'Closed-loop machine override & telematics dispatch',
    },
    {
      id: 'AuditReporterAgent',
      name: 'AuditReporter',
      role: 'Compliance & Incident Scribe',
      icon: FileText,
      color: '#a78bfa',
      desc: 'GDP regulatory documentation & financial exposure audit',
    },
  ];

  return (
    <div className="panel" id="crewai-ops" data-testid="autonomous-crew-operations-card" style={{ marginBottom: 14 }}>
      {/* Card Header */}
      <div
        className="panel-head"
        style={{
          background: 'linear-gradient(90deg, #10192e 0%, #0d1527 100%)',
          borderBottom: '1px solid #1e2d44',
        }}
      >
        <div>
          <div className="panel-title" style={{ fontSize: 13 }}>
            <BrainCircuit size={16} color="#38bdf8" />
            Autonomous AI Operations Crew
            <span
              className="severity"
              style={{
                background:
                  crewStatus === 'INTERVENTION_EXECUTED'
                    ? 'rgba(239, 68, 68, 0.2)'
                    : 'rgba(56, 189, 248, 0.15)',
                color: crewStatus === 'INTERVENTION_EXECUTED' ? '#f87171' : '#38bdf8',
                border: `1px solid ${crewStatus === 'INTERVENTION_EXECUTED' ? '#ef4444' : '#0284c7'}`,
                marginLeft: 8,
              }}
            >
              {crewStatus}
            </span>
          </div>
          <div className="panel-sub" style={{ fontSize: 10 }}>
            Powered by CrewAI (v1.15.28) · 4 Collaborative Autonomous Agents
          </div>
        </div>

        {/* Action Controls in Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Autonomous Interventions Toggle */}
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 10,
              cursor: 'pointer',
              color: autoInterventionEnabled ? '#38bdf8' : '#64748b',
              background: '#09111e',
              border: `1px solid ${autoInterventionEnabled ? '#0284c7' : '#1e293b'}`,
              borderRadius: 6,
              padding: '5px 9px',
            }}
          >
            <input
              type="checkbox"
              checked={autoInterventionEnabled}
              onChange={(e) => onToggleAutoIntervention(e.target.checked)}
              data-testid="toggle-autonomous-intervention"
              style={{ accentColor: '#38bdf8' }}
            />
            <b>Autonomous Interventions: {autoInterventionEnabled ? 'ON' : 'OFF'}</b>
          </label>

          {/* Run Diagnostic Button */}
          <button
            type="button"
            onClick={onRunDiagnostic}
            disabled={isEvaluatingCrew}
            data-testid="button-run-crew-diagnostic"
            className="btn primary"
            style={{ fontSize: 10, padding: '6px 12px' }}
          >
            {isEvaluatingCrew ? (
              <>
                <RotateCw size={12} style={{ animation: 'spin 1s linear infinite' }} />
                Evaluating Crew...
              </>
            ) : (
              <>
                <Sparkles size={12} />
                Run Full Crew Diagnostic
              </>
            )}
          </button>
        </div>
      </div>

      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* 4 Collaborative Agent Status Rail */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {agents.map((agent) => {
            const Icon = agent.icon;
            const logMatch = agentLog.find((l) => l.agent?.includes(agent.name) || l.agent?.includes(agent.id));
            const isAnalyzing = isEvaluatingCrew;
            const isActionTaken = crewStatus === 'INTERVENTION_EXECUTED' && agent.name === 'RemediationDispatcher';

            const statusLabel = isAnalyzing
              ? 'ANALYZING'
              : isActionTaken
              ? 'ACTION EXECUTED'
              : logMatch
              ? 'COMPLETED'
              : 'IDLE';

            return (
              <div
                key={agent.id}
                data-testid={`agent-card-${agent.name.toLowerCase()}`}
                style={{
                  background: '#0a1220',
                  border: `1px solid ${isActionTaken ? '#f59e0b' : '#1a293e'}`,
                  borderRadius: 8,
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 6,
                        background: 'rgba(30, 41, 59, 0.7)',
                        display: 'grid',
                        placeItems: 'center',
                      }}
                    >
                      <Icon size={13} color={agent.color} />
                    </div>
                    <div>
                      <b style={{ fontSize: 11, color: '#f1f5f9', display: 'block' }}>{agent.name}</b>
                      <span style={{ fontSize: 8, color: '#64748b' }}>{agent.role}</span>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: 8,
                      fontWeight: 700,
                      fontFamily: 'var(--app-font-mono)',
                      padding: '2px 5px',
                      borderRadius: 4,
                      background: isAnalyzing
                        ? 'rgba(56, 189, 248, 0.2)'
                        : isActionTaken
                        ? 'rgba(245, 158, 11, 0.2)'
                        : 'rgba(34, 197, 94, 0.15)',
                      color: isAnalyzing ? '#38bdf8' : isActionTaken ? '#f59e0b' : '#4ade80',
                    }}
                  >
                    {statusLabel}
                  </span>
                </div>

                <div
                  style={{
                    fontSize: 9,
                    color: '#94a3b8',
                    lineHeight: 1.35,
                    borderTop: '1px solid #142031',
                    paddingTop: 6,
                    maxHeight: 52,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {logMatch?.thought || logMatch?.action || agent.desc}
                </div>
              </div>
            );
          })}
        </div>

        {/* Root Cause & Spoilage Impact Banner */}
        <div
          style={{
            background:
              crewStatus === 'INTERVENTION_EXECUTED'
                ? 'rgba(69, 26, 26, 0.45)'
                : 'rgba(15, 23, 42, 0.55)',
            border: `1px solid ${crewStatus === 'INTERVENTION_EXECUTED' ? '#7f1d1d' : '#1e293b'}`,
            borderRadius: 8,
            padding: '12px 14px',
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 0.9fr) minmax(0, 1.2fr)',
            gap: 12,
            alignItems: 'center',
          }}
        >
          {/* Root Cause */}
          <div>
            <span className="eyebrow" style={{ color: '#94a3b8', marginBottom: 3, display: 'block' }}>
              Identified Root Cause
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {crewStatus === 'INTERVENTION_EXECUTED' ? (
                <AlertTriangle size={14} color="#f87171" />
              ) : (
                <CheckCircle2 size={14} color="#4ade80" />
              )}
              <strong style={{ fontSize: 11, color: '#f1f5f9' }} data-testid="crew-root-cause">
                {rootCause}
              </strong>
            </div>
          </div>

          {/* Shelf Life Impact */}
          <div style={{ borderLeft: '1px solid #1e293b', paddingLeft: 12 }}>
            <span className="eyebrow" style={{ color: '#94a3b8', marginBottom: 3, display: 'block' }}>
              Arrhenius Shelf-Life Impact
            </span>
            <strong
              className="mono"
              style={{
                fontSize: 13,
                color: shelfLifeImpact.startsWith('-') && !shelfLifeImpact.includes('0.1') ? '#f87171' : '#4ade80',
              }}
              data-testid="crew-shelf-life-impact"
            >
              {shelfLifeImpact}
            </strong>
          </div>

          {/* Autonomous Action Executed */}
          <div style={{ borderLeft: '1px solid #1e293b', paddingLeft: 12 }}>
            <span className="eyebrow" style={{ color: '#94a3b8', marginBottom: 3, display: 'block' }}>
              Closed-Loop Machine Actuation
            </span>
            <span
              style={{
                fontSize: 10,
                color: crewStatus === 'INTERVENTION_EXECUTED' ? '#38bdf8' : '#94a3b8',
                fontWeight: 600,
              }}
              data-testid="crew-autonomous-action"
            >
              {autonomousActionTaken}
            </span>
          </div>
        </div>

        {/* Live Agent Thought Feed Stream */}
        <div>
          <div
            className="eyebrow"
            style={{ marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <span>Live Multi-Agent Collaboration Log &amp; Reasoning</span>
            <span className="mono" style={{ fontSize: 9, color: '#64748b' }}>
              Sequential Crew Execution Mode
            </span>
          </div>

          <div
            style={{
              background: '#070d16',
              border: '1px solid #182538',
              borderRadius: 6,
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              maxHeight: 180,
              overflowY: 'auto',
            }}
          >
            {agentLog.map((entry, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  gap: 10,
                  fontSize: 10,
                  lineHeight: 1.45,
                  paddingBottom: 6,
                  borderBottom: idx < agentLog.length - 1 ? '1px solid #121c29' : 'none',
                }}
              >
                <div style={{ minWidth: 155, flexShrink: 0 }}>
                  <b
                    style={{
                      color:
                        entry.agent.includes('Sentinel')
                          ? '#38bdf8'
                          : entry.agent.includes('Quality')
                          ? '#4ade80'
                          : entry.agent.includes('Remediation')
                          ? '#f59e0b'
                          : '#a78bfa',
                      fontFamily: 'var(--app-font-mono)',
                    }}
                  >
                    [{entry.agent}]
                  </b>
                </div>
                <div style={{ color: '#cbd5e1', flex: 1 }}>
                  {entry.thought && <span>{entry.thought}</span>}
                  {entry.action && <b style={{ color: '#38bdf8' }}> {entry.action}</b>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
