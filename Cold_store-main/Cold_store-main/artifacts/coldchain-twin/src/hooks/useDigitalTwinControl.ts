import { useEffect, useRef, useState, useCallback } from 'react';

export interface ControlsState {
  reeferPower: boolean;
  coolingMode: 'ECO' | 'BOOST' | 'DEFROST' | 'STANDBY';
  doorOpen: boolean;
  fanActive: boolean;
  targetSetpoint: number;
  highThreshold: number;
  lowThreshold: number;
}

export interface TelemetryState {
  currentTemp: number;
  ambientTemp: number;
  speedKmh: number;
  shockG: { x: number; y: number; z: number };
  humidity: number;
  powerKw: number;
}

export interface AgentLogEntry {
  agent: string;
  role?: string;
  thought?: string;
  action?: string;
  status?: string;
}

export interface CrewEvaluationResult {
  crewStatus: string;
  rootCause: string;
  shelfLifeImpact: string;
  autonomousActionTaken: string;
  agentLog: AgentLogEntry[];
  timestamp?: string;
}

export interface HistoryPoint {
  time: string;
  currentTemp: number;
  mkt: number;
  targetSetpoint: number;
  highThreshold: number;
  lowThreshold: number;
  powerKw: number;
}

const DEFAULT_CONTROLS: ControlsState = {
  reeferPower: true,
  coolingMode: 'ECO',
  doorOpen: false,
  fanActive: true,
  targetSetpoint: -20.0,
  highThreshold: -15.0,
  lowThreshold: -25.0,
};

const DEFAULT_TELEMETRY: TelemetryState = {
  currentTemp: -19.6,
  ambientTemp: 32.0,
  speedKmh: 48.0,
  shockG: { x: 0.08, y: 0.11, z: 0.98 },
  humidity: 78.0,
  powerKw: 248.0,
};

const INITIAL_AGENT_LOG: AgentLogEntry[] = [
  {
    agent: 'TelemetrySentinelAgent',
    role: 'Real-time Telemetry & Invariant Auditor',
    thought: 'Baseline telemetry normal. Monitoring door seal status, RTD Pt100 sensor probes, and dT/dt rate.',
    status: 'COMPLETED',
  },
  {
    agent: 'QualityPredictorAgent',
    role: 'Perishable Cargo Quality & Compliance Scientist',
    thought: 'Arrhenius thermal kinetic model synchronized. MKT stable at -19.6°C. Shelf life preservation index: 99.8%.',
    status: 'COMPLETED',
  },
  {
    agent: 'RemediationDispatcherAgent',
    role: 'Automated Reefer Operations Dispatcher',
    action: 'Standing by for automated closed-loop intervention. Actuator latency 12ms.',
    status: 'COMPLETED',
  },
  {
    agent: 'AuditReporterAgent',
    role: 'Regulatory & Incident Documentation Officer',
    thought: 'GDP Compliance Audit ledger initialized. Zero active critical excursion events logged.',
    status: 'COMPLETED',
  },
];

export function useDigitalTwinControl() {
  const [controls, setControls] = useState<ControlsState>(DEFAULT_CONTROLS);
  const [telemetry, setTelemetry] = useState<TelemetryState>(DEFAULT_TELEMETRY);
  const [mkt, setMkt] = useState<number>(-19.6);
  const [shelfLifeRemainingHours, setShelfLifeRemainingHours] = useState<number>(718.5);
  const [activeFaults, setActiveFaults] = useState<string[]>([]);
  const [consecutiveExcursions, setConsecutiveExcursions] = useState<number>(0);
  const [autoInterventionEnabled, setAutoInterventionEnabled] = useState<boolean>(true);
  const [isEvaluatingCrew, setIsEvaluatingCrew] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'fallback'>('connecting');
  const [aiActionHistory, setAiActionHistory] = useState<any[]>([]);

  // Crew Output State
  const [crewStatus, setCrewStatus] = useState<string>('MONITORING_NOMINAL');
  const [rootCause, setRootCause] = useState<string>('Normal thermal stabilization');
  const [shelfLifeImpact, setShelfLifeImpact] = useState<string>('Nominal (< 0.1h loss)');
  const [autonomousActionTaken, setAutonomousActionTaken] = useState<string>('Continuous invariant monitoring active');
  const [agentLog, setAgentLog] = useState<AgentLogEntry[]>(INITIAL_AGENT_LOG);

  // Time-series history for Recharts live plotting
  const [history, setHistory] = useState<HistoryPoint[]>(() => {
    const pts: HistoryPoint[] = [];
    const now = Date.now();
    for (let i = 20; i >= 0; i--) {
      const d = new Date(now - i * 2000);
      const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      pts.push({
        time: timeStr,
        currentTemp: -19.6 + (Math.random() - 0.5) * 0.2,
        mkt: -19.6,
        targetSetpoint: -20.0,
        highThreshold: -15.0,
        lowThreshold: -25.0,
        powerKw: 248,
      });
    }
    return pts;
  });

  const controlsRef = useRef(controls);
  controlsRef.current = controls;

  const debounceTimerRef = useRef<number | null>(null);
  const lastAutoEvalRef = useRef<number>(0);

  // Optimistic update + PATCH helper
  const updateControls = useCallback((patch: Partial<ControlsState>) => {
    // 1. Optimistic local state update
    setControls((prev) => {
      const next = { ...prev, ...patch };
      return next;
    });

    // 2. Issue PATCH /api/twin/override with debounce for rapid slider inputs
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = window.setTimeout(async () => {
      try {
        await fetch('/api/twin/override', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        });
      } catch (err) {
        // Fallback: local mode active, state is already updated
      }
    }, 150);
  }, []);

  // Fault Injections
  const injectFault = useCallback(async (faultName: string) => {
    setActiveFaults((prev) => (prev.includes(faultName) ? prev : [...prev, faultName]));
    try {
      await fetch('/api/faults/inject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fault: faultName }),
      });
    } catch (_) {}
  }, []);

  const clearFault = useCallback(async (faultName?: string) => {
    setActiveFaults((prev) => (faultName ? prev.filter((f) => f !== faultName) : []));
    try {
      await fetch('/api/faults/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(faultName ? { fault: faultName } : {}),
      });
    } catch (_) {}
  }, []);

  // Run CrewAI Diagnostic
  const runCrewDiagnostic = useCallback(
    async (manual: boolean = true) => {
      setIsEvaluatingCrew(true);
      try {
        const payload = {
          telemetryData: {
            telemetry,
            controls: controlsRef.current,
            activeFaults,
            mkt,
          },
          allowIntervention: autoInterventionEnabled,
        };

        const res = await fetch('/api/crew/evaluate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const data: CrewEvaluationResult = await res.json();
          setCrewStatus(data.crewStatus);
          setRootCause(data.rootCause);
          setShelfLifeImpact(data.shelfLifeImpact);
          setAutonomousActionTaken(data.autonomousActionTaken);
          if (data.agentLog && data.agentLog.length > 0) {
            setAgentLog(data.agentLog);
          }

          // If action was taken to set BOOST or lower setpoint, reflect optimistically
          if (data.crewStatus === 'INTERVENTION_EXECUTED') {
            setControls((prev) => ({
              ...prev,
              coolingMode: 'BOOST',
              targetSetpoint: -24.0,
            }));
          }
        } else {
          throw new Error('API evaluate failed');
        }
      } catch (err) {
        // Resilient in-browser fallback agent execution
        const isExcursion = telemetry.currentTemp > controlsRef.current.highThreshold || activeFaults.length > 0;
        const faultDesc = activeFaults.includes('compressor_stall')
          ? 'Compressor mechanical stall'
          : activeFaults.includes('door_seal_breach')
          ? 'Thermal door seal breach'
          : controlsRef.current.doorOpen
          ? 'Door ajar while vehicle in motion'
          : 'High ambient thermal ingress';

        if (isExcursion && autoInterventionEnabled) {
          setControls((prev) => ({ ...prev, coolingMode: 'BOOST', targetSetpoint: -24.0 }));
          setCrewStatus('INTERVENTION_EXECUTED');
          setRootCause(faultDesc);
          setShelfLifeImpact('-14.2 hours');
          setAutonomousActionTaken('Overridden coolingMode to BOOST, setpoint lowered to -24°C');
          setAgentLog([
            {
              agent: 'TelemetrySentinelAgent',
              role: 'Real-time Telemetry & Invariant Auditor',
              thought: `Alert: Current cargo temp ${telemetry.currentTemp}°C breached high limit (${controlsRef.current.highThreshold}°C). Root cause: ${faultDesc}.`,
              status: 'COMPLETED',
            },
            {
              agent: 'QualityPredictorAgent',
              role: 'Perishable Cargo Quality & Compliance Scientist',
              thought: `Arrhenius degradation: MKT = ${mkt}°C. Excursion risk moderate. Est. shelf life reduction: -14.2 hours.`,
              status: 'COMPLETED',
            },
            {
              agent: 'RemediationDispatcherAgent',
              role: 'Automated Reefer Operations Dispatcher',
              action: 'Dispatched direct twin control override: Mode=BOOST, Target=-24.0°C. In-cab alarm sounded.',
              status: 'COMPLETED',
            },
            {
              agent: 'AuditReporterAgent',
              role: 'Regulatory & Incident Documentation Officer',
              thought: `GDP Incident Log #CC-2047 generated. Containment actions initiated. Estimated risk mitigated.`,
              status: 'COMPLETED',
            },
          ]);
        } else {
          setCrewStatus('MONITORING_NOMINAL');
          setRootCause('Normal thermal stabilization');
          setShelfLifeImpact('Nominal (< 0.1h loss)');
          setAutonomousActionTaken('No intervention needed; system steady.');
        }
      } finally {
        setIsEvaluatingCrew(false);
      }
    },
    [telemetry, activeFaults, mkt, autoInterventionEnabled]
  );

  // Connect to SSE simulation stream
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let localPhysicsInterval: number | null = null;

    const setupSSE = () => {
      try {
        eventSource = new EventSource('/api/simulation/stream');

        eventSource.onopen = () => {
          setConnectionStatus('connected');
          if (localPhysicsInterval) {
            window.clearInterval(localPhysicsInterval);
            localPhysicsInterval = null;
          }
        };

        eventSource.addEventListener('telemetry', (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            if (data.controls) setControls(data.controls);
            if (data.telemetry) setTelemetry(data.telemetry);
            if (typeof data.mkt === 'number') setMkt(data.mkt);
            if (typeof data.shelfLifeRemainingHours === 'number') {
              setShelfLifeRemainingHours(data.shelfLifeRemainingHours);
            }
            if (Array.isArray(data.activeFaults)) setActiveFaults(data.activeFaults);
            if (typeof data.consecutiveExcursions === 'number') {
              setConsecutiveExcursions(data.consecutiveExcursions);
            }
            if (Array.isArray(data.aiActionHistory)) setAiActionHistory(data.aiActionHistory);

            // Append to chart history
            const timeStr = new Date().toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });

            setHistory((prev) => {
              const next = [
                ...prev.slice(-35),
                {
                  time: timeStr,
                  currentTemp: data.telemetry?.currentTemp ?? -19.6,
                  mkt: data.mkt ?? -19.6,
                  targetSetpoint: data.controls?.targetSetpoint ?? -20.0,
                  highThreshold: data.controls?.highThreshold ?? -15.0,
                  lowThreshold: data.controls?.lowThreshold ?? -25.0,
                  powerKw: data.telemetry?.powerKw ?? 248,
                },
              ];
              return next;
            });

            // Automated trigger when consecutive excursions >= 2
            if (autoInterventionEnabled && data.consecutiveExcursions >= 2) {
              const now = Date.now();
              if (now - lastAutoEvalRef.current > 15000) {
                lastAutoEvalRef.current = now;
                runCrewDiagnostic(false);
              }
            }
          } catch (_) {}
        });

        eventSource.onerror = () => {
          setConnectionStatus('fallback');
          eventSource?.close();
          eventSource = null;

          // Start local physics fallback tick loop (1 Hz)
          if (!localPhysicsInterval) {
            localPhysicsInterval = window.setInterval(runLocalPhysicsTick, 1000);
          }
          // Retry connecting in 4 seconds
          window.setTimeout(setupSSE, 4000);
        };
      } catch (err) {
        setConnectionStatus('fallback');
        if (!localPhysicsInterval) {
          localPhysicsInterval = window.setInterval(runLocalPhysicsTick, 1000);
        }
      }
    };

    // Client-side local physics simulation fallback matching exact physics rules
    const runLocalPhysicsTick = () => {
      setTelemetry((prevTel) => {
        const c = controlsRef.current;
        let delta = 0;

        // Door open or power off heats cargo
        if (c.doorOpen || !c.reeferPower) delta += 0.35;
        if (activeFaults.includes('door_seal_breach')) delta += 0.55;
        const stalled = activeFaults.includes('compressor_stall');
        if (stalled) delta += 0.4;

        if (c.reeferPower && !stalled) {
          const fanMultiplier = c.fanActive ? 1.0 : 0.5;
          if (c.coolingMode === 'BOOST') delta += -0.6 * fanMultiplier;
          else if (c.coolingMode === 'ECO') delta += -0.2 * fanMultiplier;
          else if (c.coolingMode === 'DEFROST') delta += 0.25;
          else if (c.coolingMode === 'STANDBY') delta += 0.12;
        }

        const microJitter = (Math.random() - 0.49) * 0.04;
        const newTemp = Math.max(-35, Math.min(35, Number((prevTel.currentTemp + delta + microJitter).toFixed(2))));

        // MKT calculation
        setMkt((prevMkt) => Number((prevMkt * 0.95 + newTemp * 0.05).toFixed(2)));

        const shock = activeFaults.includes('road_shock')
          ? { x: 3.5, y: 3.2, z: 3.8 }
          : { x: 0.08, y: 0.11, z: 0.98 };

        const baseKw = c.coolingMode === 'BOOST' ? 298 : c.coolingMode === 'ECO' ? 252 : 210;
        const newPower = baseKw + (stalled ? 60 : 0) + (c.doorOpen ? 25 : 0);

        // History
        const timeStr = new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });

        setHistory((prev) => [
          ...prev.slice(-35),
          {
            time: timeStr,
            currentTemp: newTemp,
            mkt: newTemp,
            targetSetpoint: c.targetSetpoint,
            highThreshold: c.highThreshold,
            lowThreshold: c.lowThreshold,
            powerKw: newPower,
          },
        ]);

        return {
          ...prevTel,
          currentTemp: newTemp,
          shockG: shock,
          powerKw: newPower,
        };
      });
    };

    setupSSE();

    return () => {
      if (eventSource) eventSource.close();
      if (localPhysicsInterval) window.clearInterval(localPhysicsInterval);
    };
  }, [autoInterventionEnabled, activeFaults, runCrewDiagnostic]);

  // Fast Cargo Presets
  const applyPreset = useCallback(
    (preset: 'pharma' | 'produce' | 'ambient') => {
      if (preset === 'pharma') {
        updateControls({
          targetSetpoint: -20.0,
          lowThreshold: -25.0,
          highThreshold: -15.0,
          coolingMode: 'ECO',
          reeferPower: true,
        });
      } else if (preset === 'produce') {
        updateControls({
          targetSetpoint: 4.0,
          lowThreshold: 2.0,
          highThreshold: 6.0,
          coolingMode: 'ECO',
          reeferPower: true,
        });
      } else if (preset === 'ambient') {
        updateControls({
          targetSetpoint: 18.0,
          lowThreshold: 15.0,
          highThreshold: 25.0,
          coolingMode: 'ECO',
          reeferPower: true,
        });
      }
    },
    [updateControls]
  );

  // ── DataClaw integration: apply normalized CSV analysis result to twin state
  const applyDataClawResult = useCallback(
    (result: {
      controls: ControlsState;
      telemetry: TelemetryState;
      activeFaults: string[];
      crew?: {
        crewStatus: string;
        rootCause: string;
        shelfLifeImpact: string;
        autonomousActionTaken: string;
        agentLog: AgentLogEntry[];
      };
    }) => {
      // Optimistically update controls and telemetry from DataClaw output
      setControls(result.controls);
      setTelemetry(result.telemetry);
      setActiveFaults(result.activeFaults);

      // If crew results were auto-triggered by the backend, surface them
      if (result.crew) {
        setCrewStatus(result.crew.crewStatus);
        setRootCause(result.crew.rootCause);
        setShelfLifeImpact(result.crew.shelfLifeImpact);
        setAutonomousActionTaken(result.crew.autonomousActionTaken);
        if (result.crew.agentLog?.length > 0) {
          setAgentLog(result.crew.agentLog);
        }
      }

      // Also PATCH the live twin engine (best-effort; silently ignore if offline)
      fetch('/api/twin/override', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...result.controls, source: 'DATACLAW_INGEST' }),
      }).catch(() => {});
    },
    []
  );

  return {
    controls,
    telemetry,
    mkt,
    shelfLifeRemainingHours,
    activeFaults,
    consecutiveExcursions,
    isExcursionActive: consecutiveExcursions >= 2 || telemetry.currentTemp > controls.highThreshold,
    autoInterventionEnabled,
    setAutoInterventionEnabled,
    isEvaluatingCrew,
    connectionStatus,
    aiActionHistory,
    crewStatus,
    rootCause,
    shelfLifeImpact,
    autonomousActionTaken,
    agentLog,
    history,
    updateControls,
    injectFault,
    clearFault,
    runCrewDiagnostic,
    applyPreset,
    // NEW ─ DataClaw bridge
    applyDataClawResult,
  };
}

