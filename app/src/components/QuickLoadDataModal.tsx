import React, { useState, useRef, useCallback } from 'react';
import { Upload, Database, X, CheckCircle2, AlertTriangle, Loader2, FileText, ChevronDown } from 'lucide-react';

// ─── Types (mirrors NormalizedDataClawResult from the backend) ───────────────
interface DataClawTelemetry {
  currentTemp: number;
  ambientTemp: number;
  speedKmh: number;
  humidity: number;
  powerKw: number;
  shockG: { x: number; y: number; z: number };
}

interface DataClawControls {
  reeferPower: boolean;
  coolingMode: 'ECO' | 'BOOST' | 'DEFROST' | 'STANDBY';
  doorOpen: boolean;
  fanActive: boolean;
  targetSetpoint: number;
  highThreshold: number;
  lowThreshold: number;
}

interface DataClawResult {
  controls: DataClawControls;
  telemetry: DataClawTelemetry;
  activeFaults: string[];
  csvInfo: { rows: number; cols: number; columns: string[] };
  statistics: Record<string, unknown>;
  crew?: {
    crewStatus: string;
    rootCause: string;
    shelfLifeImpact: string;
    autonomousActionTaken: string;
    agentLog: Array<{ agent: string; role?: string; thought?: string; action?: string; status?: string }>;
  };
}

interface QuickLoadDataModalProps {
  onApply: (result: DataClawResult) => void;
}

// ─── Agent endpoint URL — falls back to the Python FastAPI service ──────────
const DATACLAW_URL = '/api/dataclaw/analyze';

// ─── Sample CSV placeholder ──────────────────────────────────────────────────
const PLACEHOLDER_CSV = `timestamp,temp,ambient,speed,humidity,power,shock_x,shock_y,shock_z
2024-01-01T00:00:00Z,-19.6,32.0,48.0,78.0,248.0,0.08,0.11,0.98
2024-01-01T00:00:01Z,-19.7,32.1,47.5,78.2,249.0,0.09,0.12,0.97
2024-01-01T00:00:02Z,-19.5,32.0,48.2,78.0,247.0,0.08,0.10,0.99
2024-01-01T00:00:03Z,-19.8,32.3,47.8,77.9,250.0,0.07,0.11,0.98
2024-01-01T00:00:04Z,-19.6,32.1,48.0,78.1,248.5,0.09,0.12,0.97`;

export function QuickLoadDataModal({ onApply }: QuickLoadDataModalProps) {
  const [isOpen, setIsOpen]     = useState(false);
  const [csvText, setCsvText]   = useState('');
  const [status, setStatus]     = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [result, setResult]     = useState<DataClawResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [preview, setPreview]   = useState<{ columns: string[]; rows: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── On CSV text change: lightweight client-side preview ───────────────────
  const handleTextChange = useCallback((text: string) => {
    setCsvText(text);
    setStatus('idle');
    setResult(null);
    if (!text.trim()) { setPreview(null); return; }
    const lines = text.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) { setPreview(null); return; }
    const columns = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
    setPreview({ columns, rows: lines.length - 1 });
  }, []);

  // ── File upload handler ───────────────────────────────────────────────────
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      handleTextChange(text);
    };
    reader.readAsText(file);
    // Reset input so the same file can be re-selected
    if (fileRef.current) fileRef.current.value = '';
  }, [handleTextChange]);

  // ── Submit to backend ────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    if (!csvText.trim()) return;
    setStatus('loading');
    setErrorMsg('');
    setResult(null);

    try {
      const resp = await fetch(DATACLAW_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv: csvText, trigger_crew: true }),
      });

      if (!resp.ok) {
        const errJson = await resp.json().catch(() => ({}));
        throw new Error(errJson.error ?? `HTTP ${resp.status}`);
      }

      const json = await resp.json();
      if (!json.success) throw new Error(json.error ?? 'Unknown server error');

      const dcResult: DataClawResult = json.data;
      if (json.crew) dcResult.crew = json.crew;

      setResult(dcResult);
      setStatus('success');
    } catch (e) {
      setStatus('error');
      setErrorMsg((e as Error).message ?? 'Failed to reach DataClaw service');
    }
  }, [csvText]);

  // ── Apply result to dashboard ─────────────────────────────────────────────
  const handleApply = useCallback(() => {
    if (result) {
      onApply(result);
      setIsOpen(false);
      // Reset state for next use
      setCsvText('');
      setStatus('idle');
      setResult(null);
      setPreview(null);
    }
  }, [result, onApply]);

  // ── Panel styles (dark-mode, matching existing dashboard palette) ──────────
  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(5, 10, 20, 0.85)',
    backdropFilter: 'blur(6px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  };

  const cardStyle: React.CSSProperties = {
    background: '#0b1626',
    border: '1px solid #1e3a5f',
    borderRadius: 12,
    width: '100%',
    maxWidth: 640,
    padding: '24px 28px',
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
    boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
  };

  const textareaStyle: React.CSSProperties = {
    width: '100%',
    height: 160,
    padding: '10px 12px',
    borderRadius: 6,
    background: '#07111f',
    border: '1px solid #1e3a5f',
    color: '#c3d4e5',
    fontSize: 11,
    fontFamily: 'var(--app-font-mono, monospace)',
    resize: 'vertical',
    outline: 'none',
  };

  const btnPrimary: React.CSSProperties = {
    background: 'linear-gradient(135deg, #0369a1, #0284c7)',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    padding: '9px 18px',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  };

  const btnGhost: React.CSSProperties = {
    background: 'transparent',
    color: '#64748b',
    border: '1px solid #1e293b',
    borderRadius: 6,
    padding: '9px 14px',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
  };

  return (
    <>
      {/* ── Trigger Button (lives in the toolbar) ─────────────── */}
      <button
        type="button"
        id="btn-quick-load-data"
        data-testid="btn-quick-load-data"
        onClick={() => setIsOpen(true)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          background: 'rgba(3, 105, 161, 0.18)',
          border: '1px solid #0369a1',
          borderRadius: 7,
          padding: '6px 14px',
          fontSize: 11,
          fontWeight: 700,
          color: '#38bdf8',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(3,105,161,0.3)')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(3, 105, 161, 0.18)')}
      >
        <Database size={13} />
        Quick Load / Paste Data
      </button>

      {/* ── Modal ──────────────────────────────────────────────── */}
      {isOpen && (
        <div style={panelStyle} role="dialog" aria-modal="true" aria-label="Quick Load CSV/JSON Data">
          <div style={cardStyle}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Database size={20} color="#38bdf8" />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>
                    Quick Load / Paste Data
                  </div>
                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                    Paste CSV or upload a file — feeds directly into the Digital Twin & Crew pipeline
                  </div>
                </div>
              </div>
              <button type="button" onClick={() => setIsOpen(false)} style={{ ...btnGhost, padding: '4px 8px' }}>
                <X size={14} />
              </button>
            </div>

            {/* File upload row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <label
                htmlFor="quick-load-file"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: '#132337', border: '1px solid #1e3a5f', borderRadius: 6,
                  padding: '6px 12px', fontSize: 11, fontWeight: 600, color: '#94a3b8', cursor: 'pointer',
                }}
              >
                <Upload size={13} /> Upload CSV file
              </label>
              <input
                id="quick-load-file"
                ref={fileRef}
                type="file"
                accept=".csv,.txt,.json"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
                data-testid="quick-load-file-input"
              />
              <span style={{ fontSize: 10, color: '#475569' }}>— or paste below —</span>
              <button
                type="button"
                onClick={() => handleTextChange(PLACEHOLDER_CSV)}
                style={{ ...btnGhost, fontSize: 10, padding: '5px 10px' }}
              >
                Load sample data
              </button>
            </div>

            {/* Textarea */}
            <div>
              <textarea
                id="paste-data-textarea"
                data-testid="paste-data-textarea"
                style={textareaStyle}
                placeholder={`Paste CSV rows here, e.g.:\ntimestamp,temp,ambient,speed,humidity,power\n2024-01-01T00:00Z,-19.6,32.0,48,78,248`}
                value={csvText}
                onChange={(e) => handleTextChange(e.target.value)}
                spellCheck={false}
              />
            </div>

            {/* CSV Preview chip */}
            {preview && (
              <div
                style={{
                  background: '#081524', border: '1px solid #1e3a5f', borderRadius: 6,
                  padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 10,
                }}
              >
                <FileText size={13} color="#38bdf8" />
                <span style={{ fontSize: 10, color: '#94a3b8' }}>
                  <b style={{ color: '#38bdf8' }}>{preview.rows}</b> rows ·{' '}
                  <b style={{ color: '#38bdf8' }}>{preview.columns.length}</b> columns :{' '}
                  <span style={{ fontFamily: 'monospace' }}>
                    {preview.columns.slice(0, 6).join(', ')}
                    {preview.columns.length > 6 && ` … +${preview.columns.length - 6} more`}
                  </span>
                </span>
              </div>
            )}

            {/* Status display */}
            {status === 'loading' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#38bdf8', fontSize: 12 }}>
                <Loader2 size={14} className="animate-spin" style={{ animation: 'spin 1s linear infinite' }} />
                Analyzing with DataClaw + triggering Crew pipeline…
              </div>
            )}

            {status === 'error' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#2d0c0c', border: '1px solid #7f1d1d', borderRadius: 6, padding: '8px 12px', color: '#f87171', fontSize: 11 }}>
                <AlertTriangle size={14} />
                {errorMsg}
              </div>
            )}

            {status === 'success' && result && (
              <div style={{ background: '#071a10', border: '1px solid #14532d', borderRadius: 8, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle2 size={15} color="#22c55e" />
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#4ade80' }}>Analysis complete</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  {[
                    ['Cargo Temp', `${result.telemetry.currentTemp.toFixed(1)}°C`],
                    ['Setpoint', `${result.controls.targetSetpoint.toFixed(1)}°C`],
                    ['Speed', `${result.telemetry.speedKmh.toFixed(0)} km/h`],
                    ['Humidity', `${result.telemetry.humidity.toFixed(0)}%`],
                    ['Power', `${result.telemetry.powerKw.toFixed(0)} kW`],
                    ['Rows', `${result.csvInfo.rows}`],
                  ].map(([label, value]) => (
                    <div key={label} style={{ background: '#071d10', borderRadius: 5, padding: '5px 8px' }}>
                      <div style={{ fontSize: 9, color: '#64748b' }}>{label}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#86efac', fontFamily: 'monospace' }}>{value}</div>
                    </div>
                  ))}
                </div>
                {result.crew && (
                  <div style={{ marginTop: 4, padding: '6px 10px', background: '#060f1a', borderRadius: 5, border: '1px solid #1e3a5f' }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: '#38bdf8', marginBottom: 4 }}>CrewAI Verdict</div>
                    <div style={{ fontSize: 10, color: '#94a3b8' }}>
                      Status: <b style={{ color: result.crew.crewStatus === 'INTERVENTION_EXECUTED' ? '#f59e0b' : '#22c55e' }}>{result.crew.crewStatus}</b>
                      {' · '}Shelf‑life impact: <b style={{ color: '#f87171' }}>{result.crew.shelfLifeImpact}</b>
                    </div>
                    <div style={{ fontSize: 9, color: '#64748b', marginTop: 3 }}>
                      {result.crew.autonomousActionTaken}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" data-testid="cancel-paste" onClick={() => setIsOpen(false)} style={btnGhost}>
                Cancel
              </button>
              {status !== 'success' ? (
                <button
                  type="button"
                  data-testid="submit-paste"
                  onClick={handleSubmit}
                  disabled={!csvText.trim() || status === 'loading'}
                  style={{ ...btnPrimary, opacity: !csvText.trim() || status === 'loading' ? 0.5 : 1 }}
                >
                  {status === 'loading' ? (
                    <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Analyzing…</>
                  ) : (
                    <><Database size={13} /> Analyze & Load</>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  data-testid="apply-dataclaw"
                  onClick={handleApply}
                  style={{ ...btnPrimary, background: 'linear-gradient(135deg, #065f46, #059669)' }}
                >
                  <CheckCircle2 size={13} /> Apply to Twin Dashboard
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
