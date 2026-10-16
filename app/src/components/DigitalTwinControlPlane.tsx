import React, { useState, useEffect } from 'react';
import {
  Power,
  DoorOpen,
  Fan,
  Flame,
  Zap,
  Snowflake,
  AlertTriangle,
  RotateCcw,
  Sliders,
  CheckCircle2,
  Activity,
  Layers,
  ThermometerSnowflake,
  ShieldAlert,
} from 'lucide-react';
import { ControlsState } from '@/hooks/useDigitalTwinControl';

interface DigitalTwinControlPlaneProps {
  controls: ControlsState;
  activeFaults: string[];
  connectionStatus: 'connected' | 'connecting' | 'fallback';
  onUpdateControls: (patch: Partial<ControlsState>) => void;
  onInjectFault: (fault: string) => void;
  onClearFault: (fault?: string) => void;
  onApplyPreset: (preset: 'pharma' | 'produce' | 'ambient') => void;
}

export function DigitalTwinControlPlane({
  controls,
  activeFaults,
  connectionStatus,
  onUpdateControls,
  onInjectFault,
  onClearFault,
  onApplyPreset,
}: DigitalTwinControlPlaneProps) {
  // Local state for debounced setpoint slider/input
  const [localSetpoint, setLocalSetpoint] = useState<number>(controls.targetSetpoint);
  const [localHighBound, setLocalHighBound] = useState<number>(controls.highThreshold);
  const [localLowBound, setLocalLowBound] = useState<number>(controls.lowThreshold);

  useEffect(() => {
    setLocalSetpoint(controls.targetSetpoint);
  }, [controls.targetSetpoint]);

  useEffect(() => {
    setLocalHighBound(controls.highThreshold);
  }, [controls.highThreshold]);

  useEffect(() => {
    setLocalLowBound(controls.lowThreshold);
  }, [controls.lowThreshold]);

  const handleSetpointChange = (val: number) => {
    setLocalSetpoint(val);
    onUpdateControls({ targetSetpoint: val });
  };

  const handleHighBoundChange = (val: number) => {
    setLocalHighBound(val);
    onUpdateControls({ highThreshold: val });
  };

  const handleLowBoundChange = (val: number) => {
    setLocalLowBound(val);
    onUpdateControls({ lowThreshold: val });
  };

  const coolingModes: Array<{ id: ControlsState['coolingMode']; label: string; icon: any; color: string }> = [
    { id: 'ECO', label: 'ECO', icon: Snowflake, color: '#38bdf8' },
    { id: 'BOOST', label: 'BOOST', icon: Zap, color: '#f59e0b' },
    { id: 'DEFROST', label: 'DEFROST', icon: Flame, color: '#f43f5e' },
    { id: 'STANDBY', label: 'STANDBY', icon: Power, color: '#94a3b8' },
  ];

  return (
    <div className="panel" id="control-plane" data-testid="digital-twin-control-plane" style={{ marginBottom: 14 }}>
      {/* Panel Header */}
      <div className="panel-head" style={{ background: 'linear-gradient(90deg, #0e1c2c 0%, #0c1825 100%)' }}>
        <div>
          <div className="panel-title" style={{ fontSize: 13, letterSpacing: '0.3px' }}>
            <Sliders size={16} color="#38bdf8" />
            Digital Twin Control Plane
            <span
              className="live-dot"
              style={{
                background: connectionStatus === 'connected' ? '#22c55e' : '#f59e0b',
                boxShadow: connectionStatus === 'connected' ? '0 0 0 3px rgba(34,197,94,.16)' : '0 0 0 3px rgba(245,158,11,.16)',
              }}
              title={`Connection: ${connectionStatus}`}
            />
          </div>
          <div className="panel-sub" style={{ fontSize: 10 }}>
            Bi-directional physical actuator overrides &amp; thermodynamic setpoints ·{' '}
            <span style={{ color: connectionStatus === 'connected' ? '#4ade80' : '#fbbf24' }}>
              {connectionStatus === 'connected' ? 'Live SSE Physics Stream' : 'Local Fallback Simulation'}
            </span>
          </div>
        </div>

        {/* Status Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: '#132337',
              border: '1px solid #1e3952',
              borderRadius: 6,
              padding: '4px 10px',
              fontSize: 10,
              fontFamily: 'var(--app-font-mono)',
            }}
          >
            <span style={{ color: '#94a3b8' }}>MODE:</span>
            <b style={{ color: '#38bdf8' }}>{controls.coolingMode}</b>
            <span style={{ color: '#475569' }}>|</span>
            <span style={{ color: '#94a3b8' }}>SETPOINT:</span>
            <b style={{ color: '#38bdf8' }}>{controls.targetSetpoint.toFixed(1)}°C</b>
          </div>
        </div>
      </div>

      <div style={{ padding: '16px 18px', display: 'grid', gridTemplateColumns: 'minmax(0, 1.15fr) minmax(0, 0.85fr)', gap: 18 }}>
        {/* Left Column: Actuator Toggles & Cooling Mode */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Actuator Interactive Switches */}
          <div>
            <div className="eyebrow" style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Zap size={11} color="#38bdf8" />
              Hardware Actuators &amp; Physical Switches
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
              {/* Reefer Main Power */}
              <div
                style={{
                  background: controls.reeferPower ? 'rgba(6, 78, 59, 0.22)' : 'rgba(127, 29, 29, 0.22)',
                  border: `1px solid ${controls.reeferPower ? '#059669' : '#b91c1c'}`,
                  borderRadius: 8,
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#e2e8f0' }}>Reefer Power</span>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: controls.reeferPower ? '#10b981' : '#ef4444',
                      boxShadow: controls.reeferPower ? '0 0 8px #10b981' : '0 0 8px #ef4444',
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => onUpdateControls({ reeferPower: !controls.reeferPower })}
                  data-testid="toggle-reefer-power"
                  className={`btn ${controls.reeferPower ? 'primary' : 'danger'}`}
                  style={{ width: '100%', fontSize: 10, padding: '7px 0', fontWeight: 700 }}
                >
                  <Power size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                  {controls.reeferPower ? 'POWER: ON' : 'POWER: OFF'}
                </button>
              </div>

              {/* Cargo Door Ajar Override */}
              <div
                style={{
                  background: controls.doorOpen ? 'rgba(180, 83, 9, 0.22)' : 'rgba(15, 23, 42, 0.6)',
                  border: `1px solid ${controls.doorOpen ? '#d97706' : '#1e293b'}`,
                  borderRadius: 8,
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#e2e8f0' }}>Bay 3 Door</span>
                  <DoorOpen size={14} color={controls.doorOpen ? '#f59e0b' : '#64748b'} />
                </div>
                <button
                  type="button"
                  onClick={() => onUpdateControls({ doorOpen: !controls.doorOpen })}
                  data-testid="toggle-cargo-door"
                  className={`btn ${controls.doorOpen ? 'danger' : 'ghost'}`}
                  style={{ width: '100%', fontSize: 10, padding: '7px 0', fontWeight: 700 }}
                >
                  {controls.doorOpen ? 'AJAR (OPEN)' : 'LATCHED (CLOSED)'}
                </button>
              </div>

              {/* Evaporator Fan */}
              <div
                style={{
                  background: controls.fanActive ? 'rgba(14, 116, 144, 0.22)' : 'rgba(30, 41, 59, 0.5)',
                  border: `1px solid ${controls.fanActive ? '#0284c7' : '#334155'}`,
                  borderRadius: 8,
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#e2e8f0' }}>Evaporator Fan</span>
                  <Fan
                    size={14}
                    color={controls.fanActive ? '#38bdf8' : '#64748b'}
                    style={{
                      animation: controls.fanActive ? 'spin 1.5s linear infinite' : 'none',
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => onUpdateControls({ fanActive: !controls.fanActive })}
                  data-testid="toggle-evaporator-fan"
                  className={`btn ${controls.fanActive ? 'primary' : 'ghost'}`}
                  style={{ width: '100%', fontSize: 10, padding: '7px 0', fontWeight: 700 }}
                >
                  {controls.fanActive ? 'FAN: ACTIVE' : 'FAN: INACTIVE'}
                </button>
              </div>
            </div>
          </div>

          {/* Cooling Mode 4-Way Segmented Selector */}
          <div>
            <div className="eyebrow" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Layers size={11} color="#38bdf8" />
              Refrigeration Compressor Mode (4-Way Segmented)
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 6,
                background: '#09111e',
                border: '1px solid #1e293b',
                padding: 4,
                borderRadius: 8,
              }}
            >
              {coolingModes.map((m) => {
                const IconComponent = m.icon;
                const isActive = controls.coolingMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onUpdateControls({ coolingMode: m.id })}
                    data-testid={`mode-selector-${m.id.toLowerCase()}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      padding: '8px 6px',
                      borderRadius: 6,
                      fontSize: 10,
                      fontWeight: 700,
                      border: isActive ? `1px solid ${m.color}` : '1px solid transparent',
                      background: isActive ? 'rgba(30, 41, 59, 0.9)' : 'transparent',
                      color: isActive ? '#f8fafc' : '#64748b',
                      boxShadow: isActive ? `0 2px 8px rgba(0,0,0,0.4)` : 'none',
                      transition: 'all 0.15s ease',
                      cursor: 'pointer',
                    }}
                  >
                    <IconComponent size={13} color={isActive ? m.color : '#64748b'} />
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Fast Cargo Preset Buttons */}
          <div>
            <div className="eyebrow" style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <ThermometerSnowflake size={11} color="#38bdf8" />
              Fast Cargo Preset Profiles
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              <button
                type="button"
                onClick={() => onApplyPreset('pharma')}
                data-testid="preset-pharma"
                className="btn"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  padding: '8px 10px',
                  background: '#0d1826',
                  borderColor: '#1d3348',
                  borderRadius: 6,
                }}
              >
                <b style={{ color: '#38bdf8', fontSize: 10 }}>Deep Freeze Pharma</b>
                <span className="mono" style={{ fontSize: 9, color: '#94a3b8' }}>
                  Target: -20°C [-25 to -15]
                </span>
              </button>

              <button
                type="button"
                onClick={() => onApplyPreset('produce')}
                data-testid="preset-produce"
                className="btn"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  padding: '8px 10px',
                  background: '#0d1826',
                  borderColor: '#1d3348',
                  borderRadius: 6,
                }}
              >
                <b style={{ color: '#4ade80', fontSize: 10 }}>Fresh Produce</b>
                <span className="mono" style={{ fontSize: 9, color: '#94a3b8' }}>
                  Target: +4°C [+2 to +6]
                </span>
              </button>

              <button
                type="button"
                onClick={() => onApplyPreset('ambient')}
                data-testid="preset-ambient"
                className="btn"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  padding: '8px 10px',
                  background: '#0d1826',
                  borderColor: '#1d3348',
                  borderRadius: 6,
                }}
              >
                <b style={{ color: '#fb923c', fontSize: 10 }}>Ambient Cargo</b>
                <span className="mono" style={{ fontSize: 9, color: '#94a3b8' }}>
                  Target: +18°C [+15 to +25]
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Numeric Setpoints, Excursion Bounds, & Fault Injection */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Target Cargo Setpoint Slider */}
          <div style={{ background: '#09111e', border: '1px solid #1e293b', borderRadius: 8, padding: '12px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#e2e8f0' }}>Target Cargo Setpoint</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input
                  type="number"
                  step="0.5"
                  min="-30"
                  max="15"
                  value={localSetpoint}
                  onChange={(e) => handleSetpointChange(parseFloat(e.target.value) || 0)}
                  data-testid="input-target-setpoint"
                  className="mono"
                  style={{
                    width: 65,
                    background: '#131e2e',
                    border: '1px solid #293a4f',
                    borderRadius: 4,
                    color: '#38bdf8',
                    padding: '3px 6px',
                    fontSize: 11,
                    fontWeight: 700,
                    textAlign: 'right',
                  }}
                />
                <span className="mono" style={{ color: '#94a3b8', fontSize: 10 }}>
                  °C
                </span>
              </div>
            </div>

            <input
              type="range"
              min="-30"
              max="15"
              step="0.5"
              value={localSetpoint}
              onChange={(e) => handleSetpointChange(parseFloat(e.target.value))}
              data-testid="slider-target-setpoint"
              style={{ width: '100%', accentColor: '#38bdf8', margin: '6px 0 4px' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#64748b' }}>
              <span>-30.0°C (Deep Cryo)</span>
              <span>0.0°C</span>
              <span>+15.0°C (Ambient)</span>
            </div>
          </div>

          {/* Threshold Inputs: Upper & Lower Bounds */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ background: '#09111e', border: '1px solid #1e293b', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#f87171', marginBottom: 4 }}>
                Critical High Alarm Limit
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="number"
                  step="0.5"
                  value={localHighBound}
                  onChange={(e) => handleHighBoundChange(parseFloat(e.target.value) || 0)}
                  data-testid="input-high-threshold"
                  className="mono"
                  style={{
                    width: '100%',
                    background: '#131e2e',
                    border: '1px solid #451a1a',
                    borderRadius: 4,
                    color: '#f87171',
                    padding: '4px 8px',
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                />
                <span className="mono" style={{ color: '#64748b', fontSize: 10 }}>
                  °C
                </span>
              </div>
              <span style={{ fontSize: 8, color: '#64748b', marginTop: 4, display: 'block' }}>
                Excursion alarm threshold
              </span>
            </div>

            <div style={{ background: '#09111e', border: '1px solid #1e293b', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#38bdf8', marginBottom: 4 }}>
                Freeze Protection Limit
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="number"
                  step="0.5"
                  value={localLowBound}
                  onChange={(e) => handleLowBoundChange(parseFloat(e.target.value) || 0)}
                  data-testid="input-low-threshold"
                  className="mono"
                  style={{
                    width: '100%',
                    background: '#131e2e',
                    border: '1px solid #17374a',
                    borderRadius: 4,
                    color: '#38bdf8',
                    padding: '4px 8px',
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                />
                <span className="mono" style={{ color: '#64748b', fontSize: 10 }}>
                  °C
                </span>
              </div>
              <span style={{ fontSize: 8, color: '#64748b', marginTop: 4, display: 'block' }}>
                Freeze damage lower bound
              </span>
            </div>
          </div>

          {/* What-If Fault Injection Center */}
          <div
            style={{
              background: '#09111e',
              border: activeFaults.length > 0 ? '1px solid #7f1d1d' : '1px solid #1e293b',
              borderRadius: 8,
              padding: '12px 14px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <ShieldAlert size={12} color={activeFaults.length > 0 ? '#ef4444' : '#e2e8f0'} />
                What-If Fault Injection Center
              </div>
              {activeFaults.length > 0 && (
                <button
                  type="button"
                  onClick={() => onClearFault()}
                  data-testid="button-clear-all-faults"
                  className="btn ghost"
                  style={{ fontSize: 9, padding: '2px 6px', color: '#fca5a5' }}
                >
                  <RotateCcw size={10} /> Clear All
                </button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              <button
                type="button"
                onClick={() =>
                  activeFaults.includes('compressor_stall')
                    ? onClearFault('compressor_stall')
                    : onInjectFault('compressor_stall')
                }
                data-testid="button-inject-compressor-stall"
                className={`btn ${activeFaults.includes('compressor_stall') ? 'danger' : 'ghost'}`}
                style={{ fontSize: 9, padding: '7px 4px', textAlign: 'center' }}
              >
                {activeFaults.includes('compressor_stall') ? '✓ Stall Active' : '⚡ Compressor Stall'}
              </button>

              <button
                type="button"
                onClick={() =>
                  activeFaults.includes('door_seal_breach')
                    ? onClearFault('door_seal_breach')
                    : onInjectFault('door_seal_breach')
                }
                data-testid="button-inject-door-seal-breach"
                className={`btn ${activeFaults.includes('door_seal_breach') ? 'danger' : 'ghost'}`}
                style={{ fontSize: 9, padding: '7px 4px', textAlign: 'center' }}
              >
                {activeFaults.includes('door_seal_breach') ? '✓ Seal Breached' : '🚪 Seal Breach'}
              </button>

              <button
                type="button"
                onClick={() => onInjectFault('road_shock')}
                data-testid="button-inject-road-shock"
                className={`btn ${activeFaults.includes('road_shock') ? 'danger' : 'ghost'}`}
                style={{ fontSize: 9, padding: '7px 4px', textAlign: 'center' }}
              >
                {activeFaults.includes('road_shock') ? '✓ 3.5G Shock' : '💥 Road Shock (3.5G)'}
              </button>
            </div>

            {activeFaults.length > 0 && (
              <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {activeFaults.map((f) => (
                  <span
                    key={f}
                    style={{
                      background: '#451a1a',
                      color: '#fca5a5',
                      border: '1px solid #7f1d1d',
                      borderRadius: 4,
                      padding: '2px 6px',
                      fontSize: 8,
                      fontFamily: 'var(--app-font-mono)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    ACTIVE: {f.toUpperCase()}
                    <button
                      onClick={() => onClearFault(f)}
                      style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', padding: 0 }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
