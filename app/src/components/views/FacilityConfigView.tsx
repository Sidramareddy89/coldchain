import React, { useState } from 'react';
import { Settings2, Bell, Leaf, Thermometer, ShieldCheck, Check, RotateCcw, Cpu, AlertTriangle } from 'lucide-react';

interface FacilityConfigViewProps {
  onNotify?: (msg: string) => void;
}

export function FacilityConfigView({ onNotify }: FacilityConfigViewProps) {
  // Form states
  const [thermalAlarm, setThermalAlarm] = useState<number>(-15.0);
  const [doorAlarm, setDoorAlarm] = useState<number>(20);
  const [powerAlarm, setPowerAlarm] = useState<number>(15);
  const [humidityAlarm, setHumidityAlarm] = useState<number>(85);

  const [carbonYear, setCarbonYear] = useState<number>(2032);
  const [renewableMix, setRenewableMix] = useState<number>(45);
  const [refrigerant, setRefrigerant] = useState<string>('R-744 (CO₂) · low GWP');
  const [cadence, setCadence] = useState<string>('Monthly');
  const [auditScope, setAuditScope] = useState<string>('Full facility (Scope 1 + 2)');
  const [verifier, setVerifier] = useState<string>('Bureau Veritas');

  const [calibrating, setCalibrating] = useState<Record<string, boolean>>({});
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const [zones, setZones] = useState([
    { id: 'A', name: 'Zone A · Deep Freeze Vault', setpoint: -22.0, highAlarm: -15.0, lowAlarm: -25.0, compressor: 'COMP-01' },
    { id: 'B', name: 'Zone B · Ice Cream Staging', setpoint: -20.0, highAlarm: -14.0, lowAlarm: -24.0, compressor: 'COMP-02' },
    { id: 'C', name: 'Zone C · Bay 3 Loading Dock', setpoint: -18.0, highAlarm: -12.0, lowAlarm: -22.0, compressor: 'COMP-03' },
  ]);

  const calibrateSensor = (sensorId: string) => {
    setCalibrating((prev) => ({ ...prev, [sensorId]: true }));
    setTimeout(() => {
      setCalibrating((prev) => ({ ...prev, [sensorId]: false }));
      if (onNotify) onNotify(`Sensor ${sensorId} calibrated successfully · offset 0.02°C applied`);
    }, 1200);
  };

  const handleSave = () => {
    setHasChanges(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
    if (onNotify) onNotify('Facility configuration saved and synchronized to local runtime profile');
  };

  const handleDiscard = () => {
    setThermalAlarm(-15.0);
    setDoorAlarm(20);
    setPowerAlarm(15);
    setHumidityAlarm(85);
    setCarbonYear(2032);
    setRenewableMix(45);
    setRefrigerant('R-744 (CO₂) · low GWP');
    setHasChanges(false);
    if (onNotify) onNotify('Configuration changes discarded');
  };

  return (
    <div className="facility-config-view" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* View Header */}
      <div className="section-head">
        <div>
          <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Settings2 size={18} color="#00D8FF" /> Facility Configuration &amp; Governance
          </div>
          <div className="panel-sub">
            Site ND-04 · Thresholds, zone target limits, ESG targets, and telemetry calibration
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {hasChanges && (
            <span style={{ fontSize: 11, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 4 }}>
              <AlertTriangle size={13} /> Unsaved changes
            </span>
          )}
          <button className="btn" onClick={handleDiscard} disabled={!hasChanges}>
            <RotateCcw size={13} /> Discard
          </button>
          <button className="btn primary" onClick={handleSave}>
            {savedSuccess ? <Check size={13} /> : <Check size={13} />}
            {savedSuccess ? 'Saved!' : 'Save Configuration'}
          </button>
        </div>
      </div>

      {/* Facility Zones Table */}
      <section className="panel" style={{ padding: 18 }}>
        <div className="panel-head" style={{ marginBottom: 14 }}>
          <div>
            <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Thermometer size={16} color="#38bdf8" /> Zone Temperature &amp; Alarm Limits
            </div>
            <div className="panel-sub">Real-time setpoints and thermodynamic boundaries by bay zone</div>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1F2937', color: '#64748B' }}>
                <th style={{ padding: '8px 12px' }}>ZONE ID &amp; NAME</th>
                <th style={{ padding: '8px 12px' }}>TARGET SETPOINT (°C)</th>
                <th style={{ padding: '8px 12px' }}>HIGH ALARM LIMIT (°C)</th>
                <th style={{ padding: '8px 12px' }}>LOW ALARM LIMIT (°C)</th>
                <th style={{ padding: '8px 12px' }}>ASSIGNED COMPRESSOR</th>
              </tr>
            </thead>
            <tbody>
              {zones.map((z, idx) => (
                <tr key={z.id} style={{ borderBottom: '1px solid #142033' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: '#E2E8F0' }}>
                    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#22c55e', marginRight: 8 }} />
                    {z.name}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <input
                      type="number"
                      step="0.5"
                      value={z.setpoint}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setZones((prev) => prev.map((item, i) => i === idx ? { ...item, setpoint: val } : item));
                        setHasChanges(true);
                      }}
                      style={{ background: '#08111e', border: '1px solid #1e3a5f', color: '#38bdf8', borderRadius: 4, padding: '4px 8px', width: 75 }}
                    />
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <input
                      type="number"
                      step="0.5"
                      value={z.highAlarm}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setZones((prev) => prev.map((item, i) => i === idx ? { ...item, highAlarm: val } : item));
                        setHasChanges(true);
                      }}
                      style={{ background: '#08111e', border: '1px solid #1e3a5f', color: '#f87171', borderRadius: 4, padding: '4px 8px', width: 75 }}
                    />
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <input
                      type="number"
                      step="0.5"
                      value={z.lowAlarm}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setZones((prev) => prev.map((item, i) => i === idx ? { ...item, lowAlarm: val } : item));
                        setHasChanges(true);
                      }}
                      style={{ background: '#08111e', border: '1px solid #1e3a5f', color: '#60a5fa', borderRadius: 4, padding: '4px 8px', width: 75 }}
                    />
                  </td>
                  <td style={{ padding: '10px 12px', color: '#94A3B8', fontFamily: 'monospace' }}>
                    {z.compressor}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Grid: Alarm Thresholds & ESG Policy */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20 }}>
        {/* Card: Alarm Thresholds */}
        <section className="panel" style={{ padding: 18 }}>
          <div className="panel-head" style={{ marginBottom: 14 }}>
            <div>
              <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Bell size={16} color="#f59e0b" /> Alarm Thresholds
              </div>
              <div className="panel-sub">Trigger rules applied across all facility zones and equipment</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#94A3B8', marginBottom: 4 }}>
                THERMAL ALARM
              </label>
              <input
                type="number"
                step="0.5"
                value={thermalAlarm}
                onChange={(e) => { setThermalAlarm(parseFloat(e.target.value)); setHasChanges(true); }}
                style={{ width: '100%', background: '#0b1626', border: '1px solid #1e3a5f', borderRadius: 6, padding: '8px 10px', color: '#F8FAFC', fontSize: 13 }}
              />
              <span style={{ display: 'block', fontSize: 10, color: '#64748B', marginTop: 4 }}>
                °C — triggers when any zone exceeds this
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#94A3B8', marginBottom: 4 }}>
                DOOR-OPEN ALARM
              </label>
              <input
                type="number"
                value={doorAlarm}
                onChange={(e) => { setDoorAlarm(parseInt(e.target.value, 10)); setHasChanges(true); }}
                style={{ width: '100%', background: '#0b1626', border: '1px solid #1e3a5f', borderRadius: 6, padding: '8px 10px', color: '#F8FAFC', fontSize: 13 }}
              />
              <span style={{ display: 'block', fontSize: 10, color: '#64748B', marginTop: 4 }}>
                seconds — sustained open duration
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#94A3B8', marginBottom: 4 }}>
                POWER SPIKE ALARM
              </label>
              <input
                type="number"
                value={powerAlarm}
                onChange={(e) => { setPowerAlarm(parseInt(e.target.value, 10)); setHasChanges(true); }}
                style={{ width: '100%', background: '#0b1626', border: '1px solid #1e3a5f', borderRadius: 6, padding: '8px 10px', color: '#F8FAFC', fontSize: 13 }}
              />
              <span style={{ display: 'block', fontSize: 10, color: '#64748B', marginTop: 4 }}>
                % above 24-hour rolling baseline
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#94A3B8', marginBottom: 4 }}>
                HUMIDITY ALARM
              </label>
              <input
                type="number"
                value={humidityAlarm}
                onChange={(e) => { setHumidityAlarm(parseInt(e.target.value, 10)); setHasChanges(true); }}
                style={{ width: '100%', background: '#0b1626', border: '1px solid #1e3a5f', borderRadius: 6, padding: '8px 10px', color: '#F8FAFC', fontSize: 13 }}
              />
              <span style={{ display: 'block', fontSize: 10, color: '#64748B', marginTop: 4 }}>
                % RH — sustained for 5 minutes
              </span>
            </div>
          </div>
        </section>

        {/* Card: ESG Policy */}
        <section className="panel" style={{ padding: 18 }}>
          <div className="panel-head" style={{ marginBottom: 14 }}>
            <div>
              <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Leaf size={16} color="#22c55e" /> ESG Policy
              </div>
              <div className="panel-sub">Long-term sustainability targets used by the Audit &amp; ESG module</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#94A3B8', marginBottom: 4 }}>
                CARBON TARGET YEAR
              </label>
              <input
                type="number"
                value={carbonYear}
                onChange={(e) => { setCarbonYear(parseInt(e.target.value, 10)); setHasChanges(true); }}
                style={{ width: '100%', background: '#0b1626', border: '1px solid #1e3a5f', borderRadius: 6, padding: '8px 10px', color: '#F8FAFC', fontSize: 13 }}
              />
              <span style={{ display: 'block', fontSize: 10, color: '#64748B', marginTop: 4 }}>
                Net-zero milestone
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#94A3B8', marginBottom: 4 }}>
                RENEWABLE MIX
              </label>
              <input
                type="number"
                value={renewableMix}
                onChange={(e) => { setRenewableMix(parseInt(e.target.value, 10)); setHasChanges(true); }}
                style={{ width: '100%', background: '#0b1626', border: '1px solid #1e3a5f', borderRadius: 6, padding: '8px 10px', color: '#F8FAFC', fontSize: 13 }}
              />
              <span style={{ display: 'block', fontSize: 10, color: '#64748B', marginTop: 4 }}>
                % of grid electricity
              </span>
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#94A3B8', marginBottom: 4 }}>
                REFRIGERANT POLICY
              </label>
              <select
                value={refrigerant}
                onChange={(e) => { setRefrigerant(e.target.value); setHasChanges(true); }}
                style={{ width: '100%', background: '#0b1626', border: '1px solid #1e3a5f', borderRadius: 6, padding: '8px 10px', color: '#F8FAFC', fontSize: 13 }}
              >
                <option>R-744 (CO₂) · low GWP</option>
                <option>R-717 (Ammonia) · zero ODP</option>
                <option>R-134a · legacy</option>
                <option>Blend (R-744 + R-717)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#94A3B8', marginBottom: 4 }}>
                REPORTING CADENCE
              </label>
              <select
                value={cadence}
                onChange={(e) => { setCadence(e.target.value); setHasChanges(true); }}
                style={{ width: '100%', background: '#0b1626', border: '1px solid #1e3a5f', borderRadius: 6, padding: '8px 10px', color: '#F8FAFC', fontSize: 13 }}
              >
                <option>Monthly</option>
                <option>Quarterly</option>
                <option>Annually</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#94A3B8', marginBottom: 4 }}>
                THIRD-PARTY VERIFIER
              </label>
              <select
                value={verifier}
                onChange={(e) => { setVerifier(e.target.value); setHasChanges(true); }}
                style={{ width: '100%', background: '#0b1626', border: '1px solid #1e3a5f', borderRadius: 6, padding: '8px 10px', color: '#F8FAFC', fontSize: 13 }}
              >
                <option>Bureau Veritas</option>
                <option>SGS Sustainability</option>
                <option>DNV GL Assurance</option>
              </select>
            </div>
          </div>
        </section>
      </div>

      {/* Sensor Calibration & Diagnostics */}
      <section className="panel" style={{ padding: 18 }}>
        <div className="panel-head" style={{ marginBottom: 14 }}>
          <div>
            <div className="panel-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Cpu size={16} color="#a855f7" /> IoT Sensor Fleet Health &amp; Calibration
            </div>
            <div className="panel-sub">Pt100 RTD resistance thermometers, reed switches, and pressure transducers</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
          {[
            { id: 'TT-01', name: 'Pt100 RTD Primary Vault Sensor', meta: 'Last calibrated 24h ago · Drift: 0.01°C', status: 'normal' },
            { id: 'DR-03', name: 'Bay 3 Door Magnetic Contact', meta: 'ALERT · Active open cycle tracking', status: 'warning' },
            { id: 'PR-02', name: 'Suction Line Pressure Transducer', meta: 'Operational · 18.2 bar saturated', status: 'normal' },
          ].map((sensor) => (
            <div
              key={sensor.id}
              style={{
                background: '#091322',
                border: '1px solid #1e293b',
                borderRadius: 8,
                padding: '12px 14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#F1F5F9' }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: sensor.status === 'warning' ? '#f59e0b' : '#22c55e',
                    }}
                  />
                  {sensor.id} — {sensor.name}
                </div>
                <div style={{ fontSize: 10, color: sensor.status === 'warning' ? '#fbbf24' : '#64748B', marginTop: 3 }}>
                  {sensor.meta}
                </div>
              </div>
              <button
                className="btn"
                style={{ fontSize: 10, padding: '4px 10px' }}
                onClick={() => calibrateSensor(sensor.id)}
                disabled={calibrating[sensor.id]}
              >
                {calibrating[sensor.id] ? 'Calibrating…' : 'Calibrate'}
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
