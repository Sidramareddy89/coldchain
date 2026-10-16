import React from 'react';
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { Activity, ShieldAlert, Zap, Compass } from 'lucide-react';
import { HistoryPoint, TelemetryState, ControlsState } from '@/hooks/useDigitalTwinControl';

interface TwinTelemetryChartProps {
  history: HistoryPoint[];
  telemetry: TelemetryState;
  controls: ControlsState;
  mkt: number;
}

export function TwinTelemetryChart({ history, telemetry, controls, mkt }: TwinTelemetryChartProps) {
  // Determine min and max domain with comfortable padding
  const currentTemp = telemetry.currentTemp;
  const domainMin = Math.min(-32, controls.lowThreshold - 4, currentTemp - 2);
  const domainMax = Math.max(10, controls.highThreshold + 6, currentTemp + 2);

  const isShockHigh =
    telemetry.shockG.x > 2.5 || telemetry.shockG.y > 2.5 || telemetry.shockG.z > 2.5;

  return (
    <div className="panel" style={{ marginBottom: 14 }}>
      <div className="panel-head">
        <div>
          <div className="panel-title">
            <Activity size={15} color="#38bdf8" />
            Real-Time Thermodynamic Telemetry &amp; Arrhenius MKT
          </div>
          <div className="panel-sub">
            Continuous sequential stream · Live Cargo Temp, Arrhenius MKT, and Excursion Bounds
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 9 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 12, height: 2, background: '#38bdf8', display: 'inline-block' }} />
            <span style={{ color: '#cbd5e1' }}>Cargo Temp ({telemetry.currentTemp.toFixed(1)}°C)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 12, height: 2, background: '#4ade80', display: 'inline-block' }} />
            <span style={{ color: '#cbd5e1' }}>MKT ({mkt.toFixed(1)}°C)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 12, height: 2, borderTop: '2px dashed #f87171', display: 'inline-block' }} />
            <span style={{ color: '#f87171' }}>High Alarm ({controls.highThreshold}°C)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 12, height: 2, borderTop: '2px dotted #94a3b8', display: 'inline-block' }} />
            <span style={{ color: '#94a3b8' }}>Setpoint ({controls.targetSetpoint}°C)</span>
          </div>
        </div>
      </div>

      <div style={{ padding: '14px 16px' }}>
        {/* Metric Readout Pills */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 12 }}>
          <div className="panel metric-card" style={{ padding: 10 }}>
            <div className="metric-top">
              Cargo Core Temp <Activity size={13} color="#38bdf8" />
            </div>
            <div className="metric-value" style={{ fontSize: 20, margin: '6px 0 2px' }}>
              {telemetry.currentTemp.toFixed(1)}
              <small>°C</small>
            </div>
            <div className="metric-foot">
              Target {controls.targetSetpoint.toFixed(1)}°C ·{' '}
              <span style={{ color: telemetry.currentTemp > controls.highThreshold ? '#f87171' : '#4ade80' }}>
                Δ {(telemetry.currentTemp - controls.targetSetpoint).toFixed(1)}°C
              </span>
            </div>
          </div>

          <div className="panel metric-card" style={{ padding: 10 }}>
            <div className="metric-top">
              Mean Kinetic Temp (MKT) <ShieldAlert size={13} color="#4ade80" />
            </div>
            <div className="metric-value" style={{ fontSize: 20, margin: '6px 0 2px' }}>
              {mkt.toFixed(1)}
              <small>°C</small>
            </div>
            <div className="metric-foot">Arrhenius decay index (ΔH/R = 10,000 K)</div>
          </div>

          <div className="panel metric-card" style={{ padding: 10 }}>
            <div className="metric-top">
              Reefer Power Draw <Zap size={13} color="#f59e0b" />
            </div>
            <div className="metric-value" style={{ fontSize: 20, margin: '6px 0 2px' }}>
              {telemetry.powerKw.toFixed(1)}
              <small> kW</small>
            </div>
            <div className="metric-foot">
              Mode: <b style={{ color: '#38bdf8' }}>{controls.coolingMode}</b>
            </div>
          </div>

          <div className="panel metric-card" style={{ padding: 10 }}>
            <div className="metric-top">
              Tri-Axial Road Shock <Compass size={13} color={isShockHigh ? '#ef4444' : '#94a3b8'} />
            </div>
            <div
              className="metric-value"
              style={{
                fontSize: 16,
                margin: '8px 0 2px',
                color: isShockHigh ? '#ef4444' : '#e2e8f0',
              }}
            >
              X:{telemetry.shockG.x.toFixed(1)} Y:{telemetry.shockG.y.toFixed(1)} Z:{telemetry.shockG.z.toFixed(1)}
              <small> G</small>
            </div>
            <div className="metric-foot" style={{ color: isShockHigh ? '#f87171' : '#94a3b8' }}>
              {isShockHigh ? 'WARNING: High Impact Detected' : 'Normal Vibration (~1G)'}
            </div>
          </div>
        </div>

        {/* Live Recharts Graph */}
        <div style={{ height: 210, width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="mktGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4ade80" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#4ade80" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="time" tick={{ fill: '#64748b', fontSize: 9 }} tickLine={false} axisLine={{ stroke: '#1e293b' }} />
              <YAxis
                domain={[domainMin, domainMax]}
                tick={{ fill: '#64748b', fontSize: 9 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}°C`}
              />

              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div
                        style={{
                          background: '#09111e',
                          border: '1px solid #1e293b',
                          borderRadius: 6,
                          padding: '8px 10px',
                          fontSize: 10,
                          color: '#f1f5f9',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                        }}
                      >
                        <b className="mono">{label}</b>
                        <div style={{ color: '#38bdf8', marginTop: 4 }}>
                          Cargo Temp: {payload.find((p) => p.dataKey === 'currentTemp')?.value}°C
                        </div>
                        <div style={{ color: '#4ade80' }}>
                          Arrhenius MKT: {payload.find((p) => p.dataKey === 'mkt')?.value}°C
                        </div>
                        <div style={{ color: '#f87171' }}>High Limit: {controls.highThreshold}°C</div>
                        <div style={{ color: '#94a3b8' }}>Setpoint: {controls.targetSetpoint}°C</div>
                      </div>
                    );
                  }
                  return null;
                }}
              />

              {/* Reference Lines for High/Low Excursion Bounds & Setpoint */}
              <ReferenceLine
                y={controls.highThreshold}
                stroke="#f87171"
                strokeDasharray="4 4"
                label={{ value: 'HIGH ALARM', fill: '#f87171', fontSize: 8, position: 'right' }}
              />
              <ReferenceLine
                y={controls.lowThreshold}
                stroke="#38bdf8"
                strokeDasharray="4 4"
                label={{ value: 'FREEZE PROT', fill: '#38bdf8', fontSize: 8, position: 'right' }}
              />
              <ReferenceLine
                y={controls.targetSetpoint}
                stroke="#94a3b8"
                strokeDasharray="2 2"
                label={{ value: 'SETPOINT', fill: '#94a3b8', fontSize: 8, position: 'insideTopLeft' }}
              />

              <Area
                type="monotone"
                dataKey="currentTemp"
                stroke="#38bdf8"
                strokeWidth={2}
                fill="url(#tempGradient)"
                name="Cargo Temp"
                isAnimationActive={false}
              />
              <Area
                type="monotone"
                dataKey="mkt"
                stroke="#4ade80"
                strokeWidth={1.5}
                strokeDasharray="3 3"
                fill="url(#mktGradient)"
                name="Arrhenius MKT"
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
