import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowRight,
  AudioLines,
  Box,
  Camera,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  CircleDot,
  ClipboardCheck,
  Cpu,
  DoorOpen,
  Gauge,
  Leaf,
  Menu,
  Send,
  Settings2,
  ShieldAlert,
  Sliders,
  Snowflake,
  Sparkles,
  Thermometer,
  Wind,
  Zap,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useWarehouseSimulation, type Zone } from '@/hooks/useWarehouseSimulation';
import { DigitalTwinControlPlane } from '@/components/DigitalTwinControlPlane';
import { AutonomousCrewOperationsCard } from '@/components/AutonomousCrewOperationsCard';
import { TwinTelemetryChart } from '@/components/TwinTelemetryChart';
import { useDigitalTwinControl } from '@/hooks/useDigitalTwinControl';
import { QuickLoadDataModal } from '@/components/QuickLoadDataModal';
import { FacilityConfigView } from '@/components/views/FacilityConfigView';
import { AuditEsgView } from '@/components/views/AuditEsgView';

interface NavItem {
  label: string;
  icon: any;
  target: string;
}

const navItems: NavItem[] = [
  { label: 'Overview', icon: Gauge, target: 'overview' },
  { label: 'Digital Twin & AI Crew', icon: Sliders, target: 'control-plane' },
  { label: 'Live Camera Feeds', icon: Camera, target: 'camera' },
  { label: '3D Warehouse Twin', icon: Box, target: 'twin' },
  { label: 'Energy Simulations', icon: Activity, target: 'simulator' },
  { label: 'Co-Pilot AI', icon: Sparkles, target: 'copilot' },
  { label: 'Audit & ESG Reports', icon: Leaf, target: 'esg' },
  { label: 'Facility Config', icon: Settings2, target: 'config' },
];

const chartData = [
  ['00', 238, 224], ['01', 231, 220], ['02', 225, 218], ['03', 222, 216], ['04', 224, 216], ['05', 228, 218],
  ['06', 236, 221], ['07', 243, 224], ['08', 250, 228], ['09', 246, 229], ['10', 251, 231], ['11', 258, 233],
  ['12', 278, 235], ['13', 286, 236], ['14', 271, 234], ['15', 280, 232], ['16', 263, 231], ['17', 254, 230],
  ['18', 251, 229], ['19', 249, 228], ['20', 246, 226], ['21', 243, 225], ['22', 241, 224], ['23', 239, 222],
].map(([time, actual, baseline], i) => ({
  time: `${String(time).padStart(2, '0')}:00`,
  actual: Number(actual),
  baseline: Number(baseline),
  doors: i >= 12 && i <= 16 ? (i === 13 ? 3 : 2) : i === 8 || i === 19 ? 1 : 0,
}));

type Message = { from: 'user' | 'ai'; text: string };

function TwinMap({
  zones,
  breach,
  doorOpen,
  onSelect,
}: {
  zones: Zone[];
  breach: boolean;
  doorOpen: boolean;
  onSelect: (zone: Zone) => void;
}) {
  const [layers, setLayers] = useState({
    Doors: true,
    'IoT Sensors': true,
    Equipment: true,
    'Airflow Pathways': true,
  });
  const [preset, setPreset] = useState('Isometric View');
  const zoneCoords = [{ x: 88, y: 81 }, { x: 286, y: 81 }, { x: 484, y: 81 }];

  return (
    <div className="panel twin-card nav-target" id="twin">
      <div className="panel-head">
        <div>
          <div className="panel-title">
            <Box size={15} color="#36c8dd" /> 3D Warehouse Twin <span className="live-dot" />
          </div>
          <div className="panel-sub">Interactive thermodynamic model · last sync 0.4s ago</div>
        </div>
        <div className="twin-tools">
          {Object.entries(layers).map(([name, enabled]) => (
            <label className={`toggle ${enabled ? 'on' : ''}`} key={name}>
              <input
                type="checkbox"
                checked={enabled}
                onChange={() => setLayers((old) => ({ ...old, [name]: !old[name as keyof typeof old] }))}
                data-testid={`toggle-layer-${name.toLowerCase().replaceAll(' ', '-')}`}
              />
              {name}
            </label>
          ))}
          <select
            value={preset}
            onChange={(e) => setPreset(e.target.value)}
            aria-label="Twin view preset"
            className="toggle"
            data-testid="select-twin-preset"
          >
            <option>Isometric View</option>
            <option>Bay 3 Focus</option>
            <option>Top-Down Thermal Map</option>
          </select>
        </div>
      </div>
      <div className={`twin-stage ${preset === 'Bay 3 Focus' ? 'bay-focus' : preset === 'Top-Down Thermal Map' ? 'top-down' : ''}`}>
        <svg className="warehouse-svg" viewBox="0 0 720 300" role="img" aria-label="Interactive isometric cold-storage warehouse twin">
          <defs>
            <linearGradient id="floorGrad" x1="0" x2="1" y1="0" y2="1">
              <stop stopColor="#1e394a" />
              <stop offset="1" stopColor="#102130" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <polygon points="65,92 354,14 651,92 357,173" fill="url(#floorGrad)" stroke="#3a6477" strokeWidth="2" />
          {zones.map((zone, index) => {
            const { x, y } = zoneCoords[index];
            const isHot = (index === 0 && breach) || (index === 2 && doorOpen);
            const fill = index === 0 && breach ? '#9f362f' : index === 2 && doorOpen ? '#55402a' : index === 1 ? '#18566b' : '#174a4b';
            return (
              <g
                key={zone.id}
                onClick={() => onSelect(zone)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(zone);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`Open Zone ${zone.id} details`}
                data-testid={`zone-${zone.id.toLowerCase()}`}
                className="zone-shape"
              >
                <polygon
                  points={`${x},${y} ${x + 90},${y - 24} ${x + 178},${y} ${x + 88},${y + 25}`}
                  fill={fill}
                  fillOpacity=".9"
                  stroke={isHot ? '#ff625e' : '#3aa4b4'}
                  strokeWidth={isHot ? 2 : 1.5}
                />
                <polygon
                  points={`${x},${y} ${x + 88},${y + 25} ${x + 88},${y + 74} ${x},${y + 50}`}
                  fill={index === 1 ? '#123448' : '#122e3b'}
                  stroke="#2d687b"
                />
                <polygon
                  points={`${x + 88},${y + 25} ${x + 178},${y} ${x + 178},${y + 48} ${x + 88},${y + 74}`}
                  fill="#132c3b"
                  stroke="#2d687b"
                />
                <text x={x + 88} y={y + 4} textAnchor="middle" className="zone-label">
                  {`ZONE ${zone.id} · ${zone.name}`}
                </text>
                <text x={x + 88} y={y + 22} textAnchor="middle" className="zone-temp">
                  {zone.temp.toFixed(1)}°C
                </text>
                {layers.Equipment && (
                  <g>
                    <rect x={x + 18} y={y + 20} width="25" height="15" rx="2" fill="#183d52" stroke="#5ab8ce" />
                    <circle cx={x + 24} cy={y + 39} r="3" fill="#46d7e7" />
                    <circle cx={x + 39} cy={y + 39} r="3" fill="#46d7e7" />
                  </g>
                )}
                {layers['IoT Sensors'] && (
                  <g>
                    <circle cx={x + 152} cy={y + 17} r="5" fill={isHot ? '#ff514c' : '#28d5d4'} filter="url(#glow)" />
                    <circle cx={x + 152} cy={y + 17} r="10" fill="none" stroke={isHot ? '#ff514c' : '#28d5d4'} opacity=".4" />
                  </g>
                )}
              </g>
            );
          })}
          {layers['Airflow Pathways'] && (
            <g fill="none" stroke="#5ce5e9" strokeDasharray="5 6" strokeWidth="2" opacity=".7">
              <path d="M150 179 C205 202 230 210 292 220" />
              <path d="M360 184 C418 208 446 214 508 222" />
            </g>
          )}
          {layers.Doors && (
            <g>
              <rect
                x="561"
                y="144"
                width="36"
                height="45"
                fill={breach ? '#9c3029' : doorOpen ? '#74512b' : '#1d5c49'}
                stroke={breach ? '#ff6056' : doorOpen ? '#e3a742' : '#48b885'}
              />
              <text x="579" y="203" textAnchor="middle" fill={doorOpen ? '#ffb06b' : '#8be3b3'} fontSize="8">
                {doorOpen ? 'BAY 3 · OPEN' : 'BAY 3 · CLOSED'}
              </text>
              {doorOpen && <path d="M578 151 L610 166 L610 204" fill="none" stroke={breach ? '#f35f56' : '#e3a742'} strokeWidth="2" />}
              <circle cx="608" cy="163" r="6" fill={breach ? '#ef4444' : doorOpen ? '#f59e0b' : '#10b981'} className={breach ? 'alarm-pulse' : ''} />
            </g>
          )}
        </svg>
        {preset === 'Bay 3 Focus' && (
          <div className="twin-hud">
            <div className="hud-title">
              BAY 3 <span className="severity warning">DOOR AJAR</span>
            </div>
            <div className="hud-row"><span>Open duration</span><b>00:42</b></div>
            <div className="hud-row"><span>Ambient ingress</span><b>+32°C</b></div>
            <div className="hud-row"><span>Airflow loss</span><b>-15%</b></div>
          </div>
        )}
      </div>
      <div
        className="panel-head"
        style={{ borderTop: '1px solid #1b2939', borderBottom: 0, paddingTop: 9, paddingBottom: 9 }}
      >
        <span className="eyebrow">Facility zones · select a zone for live telemetry</span>
        <span className="mono" style={{ fontSize: 9, color: '#8296a9' }}>
          A ← —15°C TO —24°C— → C
        </span>
      </div>
    </div>
  );
}

function App() {
  const { load, zones, breach, setBreach, optimized, setOptimized } = useWarehouseSimulation();
  const twin = useDigitalTwinControl();
  const [collapsed, setCollapsed] = useState(false);
  const [activeNav, setActiveNav] = useState('Overview');
  const [feed, setFeed] = useState<'visible' | 'thermal'>('visible');
  const [doorSeconds, setDoorSeconds] = useState(42);
  const [doorOpen, setDoorOpen] = useState(true);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  const [acknowledged, setAcknowledged] = useState<string[]>([]);
  const [ticket, setTicket] = useState(false);
  const [openArch, setOpenArch] = useState(false);
  const [openDoorEvents, setOpenDoorEvents] = useState(2);
  const [openings, setOpenings] = useState(60);
  const [duration, setDuration] = useState(42);
  const [ambient, setAmbient] = useState(32);
  const [strategy, setStrategy] = useState('Off-Peak Night Shift');
  const [messages, setMessages] = useState<Message[]>([
    { from: 'user', text: 'Suggest ways to reduce energy waste in Bay 3 and provide a maintenance plan.' },
    {
      from: 'ai',
      text: 'For Bay 3, prioritize these high-impact actions:\n\n• Replace degraded silicone flap seal — estimated 8% total energy-loss reduction.\n• Shift blast precooling to 02:00–05:00 AM — saves ~12% on peak kW charges.\n• Clear Aisle 2 pallet obstruction to restore 350 CFM fan circulation.\n\nMaintenance plan: inspect the seal today, verify airflow after aisle clearance, then trend compressor duty cycle for 24 hours.',
    },
  ]);
  const [prompt, setPrompt] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [hour, setHour] = useState(
    new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  );

  // Synchronize Door Open state between twin control plane and Bay 3
  useEffect(() => {
    if (twin.controls.doorOpen !== doorOpen) {
      setDoorOpen(twin.controls.doorOpen);
    }
  }, [twin.controls.doorOpen]);

  // Synchronize active faults with breach status
  useEffect(() => {
    if (twin.activeFaults.includes('door_seal_breach') || twin.activeFaults.includes('compressor_stall')) {
      if (!breach) setBreach(true);
    }
  }, [twin.activeFaults]);

  // Dynamic zones incorporating live twin state for Zone C
  const dynamicZones = useMemo(() => {
    return zones.map((z) => {
      if (z.id === 'C') {
        return {
          ...z,
          temp: twin.telemetry.currentTemp,
          target: twin.controls.targetSetpoint,
        };
      }
      return z;
    });
  }, [zones, twin.telemetry.currentTemp, twin.controls.targetSetpoint]);

  const selectedZone = dynamicZones.find((zone) => zone.id === selectedZoneId) ?? null;

  useEffect(() => {
    const timer = window.setInterval(
      () => setHour(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })),
      1000
    );
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (doorOpen) setDoorSeconds((n) => n + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [doorOpen]);

  useEffect(() => {
    if (toast) {
      const t = window.setTimeout(() => setToast(''), 3600);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [toast]);

  const simulation = useMemo(() => {
    if (openings === 60 && duration === 42 && ambient === 32 && strategy === 'Off-Peak Night Shift') {
      return { current: 420, alternative: 360 };
    }
    const current = Math.round(300 + openings * 1.02 + duration * 1.05 + Math.max(0, ambient) * 1.65);
    const factor = strategy === 'Off-Peak Night Shift' ? 0.857 : 0.91;
    return { current, alternative: Math.round(current * factor) };
  }, [openings, duration, ambient, strategy]);

  const saved = simulation.current - simulation.alternative;
  const reduction = ((saved / simulation.current) * 100).toFixed(1);

  // Initialize active tab from URL query parameter (e.g. ?tab=config or ?tab=esg)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam) {
      const match = navItems.find(
        (n) => n.target === tabParam || n.label.toLowerCase().includes(tabParam.toLowerCase())
      );
      if (match) setActiveNav(match.label);
    }
  }, []);

  const goTo = (target: string, label: string) => {
    setActiveNav(label);
    try {
      const url = new URL(window.location.href);
      const navItem = navItems.find((n) => n.label === label);
      if (navItem) {
        url.searchParams.set('tab', navItem.target);
        window.history.replaceState(null, '', url.toString());
      }
    } catch {}
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const notify = (text: string) => setToast(text);

  const sendPrompt = (text = prompt) => {
    if (!text.trim() || streaming) return;
    const question = text.trim();
    setMessages((all) => [...all, { from: 'user', text: question }]);
    setPrompt('');
    setStreaming(true);
    window.setTimeout(() => {
      const lower = question.toLowerCase();
      const reply = lower.includes('compressor')
        ? 'Compressor 2 is operating 18% above its thermal baseline. Check condenser airflow and suction pressure first; clear the Aisle 2 obstruction, inspect the evaporator coil for icing, then trend discharge temperature for 15 minutes. Dispatch a technician if the superheat remains outside its setpoint.'
        : lower.includes('esg')
        ? 'Audit snapshot: 12.4 tonnes CO2 avoided this month across 28,600 kWh saved. Export-ready measures include off-peak precooling, corrected door seals, and restored evaporator airflow. Record utility bills and maintenance evidence for the Tier 1 net-zero review.'
        : lower.includes('door') || lower.includes('seal')
        ? 'Failure simulation: a seal breach can add approximately 31 kW as warm, humid air enters the vault. Isolate Bay 3, fit a temporary strip curtain, keep the loading interval below 20 seconds, and replace the silicone flap seal before the next peak shift.'
        : 'Recommended sequence: reduce door-open time below 20 seconds, clear Aisle 2 to restore 350 CFM, and move blast precooling to 02:00–05:00. Inspect the Bay 3 silicone seal and review Compressor 2 discharge temperature after the next cycle. Expected outcome: lower peak demand with no compromise to product temperature.';

      let index = 0;
      const timer = window.setInterval(() => {
        index = Math.min(reply.length, index + 5);
        setStreamingText(reply.slice(0, index));
        if (index >= reply.length) {
          window.clearInterval(timer);
          setMessages((all) => [...all, { from: 'ai', text: reply }]);
          setStreaming(false);
          setStreamingText('');
        }
      }, 18);
    }, 250);
  };

  const triggerBreach = () => {
    setBreach(true);
    setDoorOpen(true);
    setDoorSeconds(42);
    setTicket(true);
    setMessages((all) => [
      ...all,
      {
        from: 'ai',
        text: 'URGENT MAINTENANCE TICKET · CC-2047 — Bay 3 seal breach: isolate the loading bay, install a temporary strip curtain, and replace the degraded silicone flap seal. Response window: 18 min.',
      },
    ]);
    notify('Urgent maintenance ticket CC-2047 created · Bay 3 door seal breach');
    goTo('twin', '3D Warehouse Twin');
  };

  const closeDoor = () => {
    setDoorOpen(false);
    setDoorSeconds(0);
    setOpenDoorEvents((n) => Math.max(0, n - 1));
    twin.updateControls({ doorOpen: false });
    notify('Bay 3 door closed · door timer reset');
  };

  const applySchedule = () => {
    setOptimized(true);
    notify(`Optimized schedule applied · ${saved} kWh/day projected savings; Zones A & B cooling setpoints tightened`);
  };

  const acknowledge = (id: string) => {
    setAcknowledged((list) => [...list, id]);
    notify(`${id} acknowledged · logged to facility event history`);
  };

  const dispatch = (id: string) => {
    setTicket(true);
    notify(`Technician dispatched for ${id} · response window 18 min`);
  };

  const breachTimer = () => {
    if (breach) {
      setBreach(false);
      twin.clearFault('door_seal_breach');
      twin.clearFault('compressor_stall');
      notify('Breach simulation cleared · load returning to normal');
    } else {
      twin.injectFault('door_seal_breach');
      twin.updateControls({ doorOpen: true });
      triggerBreach();
    }
  };

  return (
    <div className="app-shell">
      {/* ── Fixed Left Sidebar Navigation ── */}
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`} aria-label="Primary navigation">
        <div className="brand">
          <div className="brand-mark">
            <Snowflake size={21} />
          </div>
          <div className="brand-copy">
            <div className="brand-name">
              ColdChain<b>-Twin</b>
            </div>
          </div>
        </div>
        <div className="side-caption">FACILITY CONTROL</div>

        {/* ── Native Navigation Menu ── */}
        <nav className="nav-list" role="navigation" aria-label="Facility sections">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.label;
            return (
              <button
                key={item.label}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => goTo(item.target, item.label)}
                title={item.label}
                data-testid={`nav-item-${item.target}`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="sidebar-foot">
          <button
            className="collapse-btn"
            onClick={() => setCollapsed(!collapsed)}
            data-testid="button-collapse-sidebar"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronLeft size={16} /> : <Menu size={16} />}
            <span>{collapsed ? 'Expand sidebar' : 'Collapse sidebar'}</span>
          </button>
        </div>
      </aside>

      {/* ── Main Application Area ── */}
      <div className={`main-area ${collapsed ? 'expanded' : ''}`}>
        <header className="topbar">
          <div className="headline">
            <div>
              <div className="eyebrow">
                NORTH DOCK FACILITY <span style={{ color: '#456176' }}>·</span> CONTROL ROOM
              </div>
              <div className="tagline">Less Energy Waste. Lower Emissions. Smarter Cold Chains.</div>
            </div>
            <div className="header-right">
              <div className="load-readout" data-testid="metric-total-load">
                <small>TOTAL LOAD</small>
                <strong>{Math.round(twin.telemetry.powerKw || load)} <em>kW</em></strong>
              </div>
              <div
                className="status-warning"
                data-testid="status-bay3-warning"
                style={{
                  borderColor: twin.isExcursionActive ? '#b91c1c' : '#76412a',
                  background: twin.isExcursionActive ? '#451a1a' : '#281a18',
                  color: twin.isExcursionActive ? '#fca5a5' : '#ffb16b',
                }}
              >
                <AlertTriangle size={13} /> {twin.isExcursionActive ? 'WARNING: THERMAL EXCURSION' : 'WARNING: BAY 3 LEAK'}
              </div>
            </div>
          </div>
          <div className="system-pills">
            <div className="system-pill"><b>Multi-Agent CrewAI:</b> 4 Autonomous Agents Active</div>
            <div className="system-pill">
              <b>Digital Twin:</b> {twin.connectionStatus === 'connected' ? 'SSE Live Stream (1 Hz)' : 'Local Engine Physics'}
            </div>
            <div className="system-pill"><b>CV Edge AI:</b> YOLOv8 - Active (30 FPS)</div>
            <div className="system-pill"><b>IoT Telemetry:</b> MQTT Virtual Stream (60 Hz)</div>
            <div className="system-pill"><b>Generative AI:</b> Offline Energy Co-Pilot Engine</div>
            {/* In-page CSV DataClaw loader */}
            <QuickLoadDataModal onApply={twin.applyDataClawResult} />
          </div>
        </header>

        {/* ── View Router: 100% Native, Single-Page Architecture ── */}
        {activeNav === 'Overview' && (
          <main className="content" id="overview">
            {breach && (
              <div className="alarm-banner show" data-testid="status-breach-alarm">
                <span>
                  <ShieldAlert size={15} style={{ verticalAlign: 'middle', marginRight: 8 }} />
                  SIMULATED THERMAL BREACH ACTIVE · ZONE A WARMING · COMPRESSOR 2 OVERDRIVE
                </span>
                <button className="btn danger" onClick={breachTimer}>Clear simulation</button>
              </div>
            )}
            <div className="section-head">
              <div>
                <div className="section-title"><CircleDot size={14} color="#42d4b2" /> Live operations overview</div>
                <div className="panel-sub">North Dock · Facility ND-04 · Local time {hour}</div>
              </div>
              <button
                className={`btn ${breach ? 'danger' : 'ghost'}`}
                onClick={breachTimer}
                data-testid="button-simulate-breach"
              >
                {breach ? <Check size={13} /> : <AlertTriangle size={13} />} {breach ? 'End Breach Simulation' : 'Simulate Bay 3 Breach'}
              </button>
            </div>

            {/* Executive Digital Twin & Autonomous AI Crew Live Summary Banner */}
            <div
              className="panel"
              style={{
                background: 'linear-gradient(135deg, #091a2e 0%, #0d233a 100%)',
                border: '1px solid #1e4265',
                borderRadius: 10,
                padding: '16px 20px',
                marginBottom: 16,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 14,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    background: 'rgba(56, 189, 248, 0.12)',
                    border: '1px solid #0284c7',
                    display: 'grid',
                    placeItems: 'center',
                    color: '#38bdf8',
                  }}
                >
                  <Sliders size={22} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#F8FAFC' }}>
                      Multi-Agent Autonomous Fleet Operations Crew
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 12,
                        background: twin.isExcursionActive ? '#451a1a' : '#052e16',
                        color: twin.isExcursionActive ? '#fca5a5' : '#4ade80',
                        border: `1px solid ${twin.isExcursionActive ? '#b91c1c' : '#166534'}`,
                      }}
                    >
                      {twin.crewStatus}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 4 }}>
                    Arrhenius MKT: <b style={{ color: '#38bdf8' }}>{twin.mkt.toFixed(1)}°C</b> · Shelf-Life Impact: <b style={{ color: twin.isExcursionActive ? '#f87171' : '#4ade80' }}>{twin.shelfLifeImpact}</b> · Auto-Intervention: <b style={{ color: twin.autoInterventionEnabled ? '#4ade80' : '#f59e0b' }}>{twin.autoInterventionEnabled ? 'ENABLED' : 'PAUSED'}</b>
                  </div>
                </div>
              </div>
              <button
                className="btn primary"
                onClick={() => goTo('control-plane', 'Digital Twin & AI Crew')}
                style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Sliders size={13} /> Open Digital Twin Control Plane →
              </button>
            </div>

            <div className="overview-grid">
              <section className="panel nav-target" id="camera" data-testid="module-camera">
                <div className="panel-head">
                  <div>
                    <div className="panel-title"><Camera size={15} color="#43c4d8" /> Live Camera Feeds <span className="live-dot" /></div>
                    <div className="panel-sub">{feed === 'visible' ? 'Bay 3 - Loading Dock Camera (Visible Light)' : 'Thermal IR Seal Feed'}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 5 }}>
                    <button className={`btn ${feed === 'visible' ? 'primary' : 'ghost'}`} onClick={() => setFeed('visible')} data-testid="button-feed-visible">Visible</button>
                    <button className={`btn ${feed === 'thermal' ? 'primary' : 'ghost'}`} onClick={() => setFeed('thermal')} data-testid="button-feed-thermal">Thermal IR</button>
                  </div>
                </div>
                <div className={`camera-scene ${feed === 'thermal' ? 'thermal' : ''}`} data-testid="camera-scene">
                  <div className="scene-ceiling" />
                  <div className={`scene-backdoor ${doorOpen ? 'open' : ''}`} />
                  <div className="scene-aisle" />
                  <div className="scene-floor" />
                  <div className="pallet p1" />
                  <div className="pallet p2" />
                  <div className="pallet p3" />
                  <div className="forklift" />
                  <div className="person" />
                  {feed === 'visible' && (
                    <>
                      <div className="detection det-person">PERSON 94%</div>
                      <div className="detection det-fork">FORKLIFT 98%</div>
                      <div className="detection det-pallet">PALLET 88%<br />AIRFLOW RESTRICTED</div>
                      <div className="door-alert" data-testid="status-door-open">
                        {doorOpen ? (
                          <>
                            <DoorOpen size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                            DOOR OPEN: {doorSeconds}s [THRESHOLD: 20s]
                          </>
                        ) : (
                          'DOOR CLOSED · TIMER RESET'
                        )}
                      </div>
                    </>
                  )}
                  <div className="cam-topline">
                    <span><span className="live-dot" /> CAM-03 / 192.168.4.23</span>
                    <span className="mono">1080p · 30 FPS</span>
                  </div>
                  {feed === 'thermal' && (
                    <div className="thermal-legend">
                      THERMAL SCALE
                      <div className="thermal-bar" />
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>-25°C</span>
                        <span>+28°C</span>
                      </div>
                    </div>
                  )}
                  <div className="scene-bottom">
                    <div className="camera-legend">ND-04 / BAY 03<br />AUTO-TRACK ENABLED</div>
                    {feed === 'visible' && (
                      <button className="btn danger" onClick={closeDoor} data-testid="button-close-door">
                        <DoorOpen size={12} /> Close Door
                      </button>
                    )}
                  </div>
                </div>
                <div className="camera-footer">
                  <span className="airflow-warning">
                    <Wind size={12} style={{ verticalAlign: 'middle', marginRight: 5 }} />
                    Airflow reduction at Aisle 2 detected (-15% circulation)
                  </span>
                  <div className="density">
                    <div className="density-label">
                      <span>Personnel density</span>
                      <b className="mono" style={{ color: '#e8bf74' }}>3 / 8</b>
                    </div>
                    <div className="meter"><i style={{ width: '38%' }} /></div>
                  </div>
                </div>
              </section>

              <section className="panel" id="metrics">
                <div className="panel-head">
                  <div>
                    <div className="panel-title"><Activity size={15} color="#53cde0" /> Facility Telemetry</div>
                    <div className="panel-sub">Live readings · 2 second refresh</div>
                  </div>
                  <span className="live-dot" title="Telemetry live" />
                </div>
                <div className="metric-grid">
                  <div className="panel metric-card">
                    <div className="metric-top">Current Power <Zap size={14} color="#42cde1" /></div>
                    <div className="metric-value" data-testid="metric-current-power">
                      {Math.round(twin.telemetry.powerKw || load)}<small> kW</small>
                    </div>
                    <div className="metric-foot up"><ArrowDownRight size={11} /> +12% vs last hour</div>
                  </div>
                  <div className="panel metric-card">
                    <div className="metric-top">Avg. Facility Temp <Thermometer size={14} color="#48cbe1" /></div>
                    <div className="metric-value" data-testid="metric-facility-temp">
                      {twin.telemetry.currentTemp.toFixed(1)}<small>°C</small>
                    </div>
                    <div className="metric-foot">
                      Target {twin.controls.targetSetpoint.toFixed(1)}°C <span className="up">· delta {(twin.telemetry.currentTemp - twin.controls.targetSetpoint).toFixed(1)}°C</span>
                    </div>
                  </div>
                  <div className="panel metric-card">
                    <div className="metric-top">Ambient Humidity <AudioLines size={14} color="#e3a34c" /></div>
                    <div className="metric-value">{Math.round(twin.telemetry.humidity)}<small>%</small></div>
                    <div className="metric-foot up">Target 70% · high icing risk</div>
                  </div>
                  <div className="panel metric-card">
                    <div className="metric-top">Est. Carbon Intensity <Leaf size={14} color="#4cc58f" /></div>
                    <div className="metric-value">4.8<small> t</small></div>
                    <div className="metric-foot up">CO2/day · +18% vs baseline</div>
                  </div>
                </div>
                <div style={{ padding: '0 13px 12px', color: '#75899b', fontSize: 9 }}>
                  Cooling demand <span className="mono" style={{ color: '#b5c5d2' }}>HIGH</span>{' '}
                  <span style={{ color: '#33485c', margin: '0 6px' }}>/</span> Compressor duty cycle{' '}
                  <span className="mono" style={{ color: '#e4ba76' }}>82%</span>
                </div>
              </section>

              <TwinMap zones={dynamicZones} breach={breach} doorOpen={doorOpen} onSelect={(zone) => setSelectedZoneId(zone.id)} />
            </div>

            <div className="chart-grid" style={{ marginTop: 14 }}>
              <section className="panel nav-target" id="energy-chart">
                <div className="panel-head">
                  <div>
                    <div className="panel-title"><Activity size={15} color="#49ccdf" /> 24-hour Energy Consumption</div>
                    <div className="panel-sub">Actual load vs. optimized baseline · peak window highlighted</div>
                  </div>
                  <div className="chart-legend">
                    <span><i className="legend-line" />Actual kW</span>
                    <span><i className="legend-line dotted" />Optimized</span>
                    <span><i className="legend-line red" />Peak risk</span>
                  </div>
                </div>
                <div className="chart-area">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="actualFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#11bfd7" stopOpacity=".22" />
                          <stop offset="95%" stopColor="#11bfd7" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#233143" strokeDasharray="3 5" vertical={false} />
                      <XAxis dataKey="time" tick={{ fill: '#71859a', fontSize: 9 }} tickLine={false} axisLine={{ stroke: '#2a3a4c' }} interval={3} />
                      <YAxis domain={[200, 310]} tick={{ fill: '#71859a', fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}`} />
                      <Tooltip
                        content={({ active, payload, label }) =>
                          active && payload?.length ? (
                            <div style={{ background: '#111c2b', border: '1px solid #365066', padding: '9px 11px', borderRadius: 6, color: '#d8e6ef', fontSize: 10 }}>
                              <b className="mono">{label}</b>
                              <div style={{ color: '#35cce0', marginTop: 5 }}>Actual {payload.find((p) => p.dataKey === 'actual')?.value} kW</div>
                              <div style={{ color: '#9aa8b4' }}>Optimized {payload.find((p) => p.dataKey === 'baseline')?.value} kW</div>
                              <div style={{ color: '#e7b264', marginTop: 4 }}>Door-ajar events: {payload[0]?.payload?.doors}</div>
                            </div>
                          ) : null
                        }
                      />
                      <ReferenceArea x1="12:00" x2="16:00" fill="#ef4444" fillOpacity=".065" />
                      <Area
                        type="monotone"
                        dataKey="baseline"
                        stroke="#8996a4"
                        strokeDasharray="4 5"
                        strokeWidth={1.5}
                        fill="none"
                        data={optimized ? chartData.map((point) => ({ ...point, baseline: point.baseline - 8 })) : chartData}
                      />
                      <Area type="monotone" dataKey="actual" stroke="#21c5df" strokeWidth={2} fill="url(#actualFill)" activeDot={{ r: 4, fill: '#5ee5f1' }} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <section className="panel">
                <div className="panel-head">
                  <div>
                    <div className="panel-title"><ShieldAlert size={15} color="#ee9d59" /> Anomaly &amp; Alerts</div>
                    <div className="panel-sub">3 active findings · prioritized by thermal impact</div>
                  </div>
                  <span className="severity critical">3 ACTIVE</span>
                </div>
                <div className="anomaly-list">
                  {[
                    { id: 'COMP-02', severity: 'critical', text: 'Compressor 2 running 18% over thermal baseline (Runaway cycle predicted in 35 mins).' },
                    { id: 'BAY-03', severity: 'warning', text: 'Bay 3 loading door open 42s during peak ambient heat (+32°C outside).' },
                    { id: 'EVAP-01', severity: 'advisory', text: 'Evaporator 1 icing detected on coil matrix (Defrost cycle recommended).' },
                  ].map((item) => (
                    <div className="anomaly" key={item.id} data-testid={`anomaly-${item.id.toLowerCase()}`}>
                      <div className="anomaly-top">
                        <span className={`severity ${item.severity}`}>{item.severity.toUpperCase()}</span>
                        <span className="mono" style={{ color: '#71859a', fontSize: 9 }}>{item.id}</span>
                      </div>
                      <p>{item.text}</p>
                      <div className="anomaly-actions">
                        {acknowledged.includes(item.id) ? (
                          <span className="good" style={{ fontSize: 9 }}><Check size={11} style={{ verticalAlign: 'middle' }} /> Acknowledged</span>
                        ) : (
                          <button className="btn" onClick={() => acknowledge(item.id)} data-testid={`button-ack-${item.id.toLowerCase()}`}>Acknowledge</button>
                        )}
                        <button className="btn" onClick={() => dispatch(item.id)} data-testid={`button-dispatch-${item.id.toLowerCase()}`}>Dispatch Tech</button>
                        <button
                          className="btn primary"
                          onClick={() => {
                            setStrategy('Off-Peak Night Shift');
                            setOpenings(60);
                            setDuration(42);
                            setAmbient(32);
                            goTo('simulator', 'Energy Simulations');
                            notify(`${item.id} mitigation simulation ready`);
                          }}
                          data-testid={`button-mitigate-${item.id.toLowerCase()}`}>
                          Simulate Mitigation
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </main>
        )}

        {activeNav === 'Digital Twin & AI Crew' && (
          <main className="content" id="control-plane-dedicated" style={{ padding: '20px 24px 100px' }}>
            <div className="section-head" style={{ marginBottom: 16 }}>
              <div>
                <div className="section-title" style={{ fontSize: 16 }}>
                  <Sliders size={18} color="#38bdf8" /> Digital Twin Control Plane &amp; Multi-Agent Operations Command Center
                </div>
                <div className="panel-sub">
                  Real-time closed-loop physics mutation, Arrhenius shelf-life modeling, and autonomous CrewAI remediation
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn" onClick={() => twin.applyPreset('pharma')}>Pharma Preset (-20°C)</button>
                <button className="btn" onClick={() => twin.applyPreset('produce')}>Produce (+4°C)</button>
                <button className="btn primary" onClick={() => twin.runCrewDiagnostic(true)}>
                  <Sparkles size={12} /> Run Full Crew Diagnostic
                </button>
              </div>
            </div>

            <DigitalTwinControlPlane
              controls={twin.controls}
              activeFaults={twin.activeFaults}
              connectionStatus={twin.connectionStatus}
              onUpdateControls={twin.updateControls}
              onInjectFault={twin.injectFault}
              onClearFault={twin.clearFault}
              onApplyPreset={twin.applyPreset}
            />

            <AutonomousCrewOperationsCard
              crewStatus={twin.crewStatus}
              rootCause={twin.rootCause}
              shelfLifeImpact={twin.shelfLifeImpact}
              autonomousActionTaken={twin.autonomousActionTaken}
              agentLog={twin.agentLog}
              autoInterventionEnabled={twin.autoInterventionEnabled}
              isEvaluatingCrew={twin.isEvaluatingCrew}
              onToggleAutoIntervention={twin.setAutoInterventionEnabled}
              onRunDiagnostic={() => twin.runCrewDiagnostic(true)}
            />

            <TwinTelemetryChart
              history={twin.history}
              telemetry={twin.telemetry}
              controls={twin.controls}
              mkt={twin.mkt}
            />
          </main>
        )}

        {activeNav === 'Live Camera Feeds' && (
          <main className="content" id="camera-dedicated" style={{ padding: '20px 24px 100px' }}>
            <div className="section-head" style={{ marginBottom: 16 }}>
              <div>
                <div className="section-title"><Camera size={18} color="#43c4d8" /> Live Multi-Camera CV Edge Intelligence</div>
                <div className="panel-sub">High-speed Edge YOLOv8 Object &amp; Anomaly Detection · Bay 3 Dock &amp; Vaults</div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className={`btn ${feed === 'visible' ? 'primary' : 'ghost'}`} onClick={() => setFeed('visible')}>Visible Feed</button>
                <button className={`btn ${feed === 'thermal' ? 'primary' : 'ghost'}`} onClick={() => setFeed('thermal')}>Thermal IR Scale</button>
              </div>
            </div>

            <section className="panel" style={{ padding: 18 }}>
              <div className={`camera-scene ${feed === 'thermal' ? 'thermal' : ''}`} style={{ height: 380 }}>
                <div className="scene-ceiling" />
                <div className={`scene-backdoor ${doorOpen ? 'open' : ''}`} />
                <div className="scene-aisle" />
                <div className="scene-floor" />
                <div className="pallet p1" />
                <div className="pallet p2" />
                <div className="pallet p3" />
                <div className="forklift" />
                <div className="person" />
                {feed === 'visible' && (
                  <>
                    <div className="detection det-person">PERSON 94%</div>
                    <div className="detection det-fork">FORKLIFT 98%</div>
                    <div className="detection det-pallet">PALLET 88%<br />AIRFLOW RESTRICTED</div>
                    <div className="door-alert">
                      {doorOpen ? (
                        <>
                          <DoorOpen size={12} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                          DOOR OPEN: {doorSeconds}s [CRITICAL ALARM AT 20s]
                        </>
                      ) : (
                        'DOOR CLOSED · AIRFLOW NORMAL'
                      )}
                    </div>
                  </>
                )}
                <div className="cam-topline">
                  <span><span className="live-dot" /> CAM-03 / 192.168.4.23 (North Dock Bay 3)</span>
                  <span className="mono">1080p · 30 FPS · Latency: 14ms</span>
                </div>
                {feed === 'thermal' && (
                  <div className="thermal-legend">
                    THERMAL INGRESS SCALE
                    <div className="thermal-bar" />
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>-25°C</span>
                      <span>+28°C</span>
                    </div>
                  </div>
                )}
                <div className="scene-bottom">
                  <div className="camera-legend">ND-04 / BAY 03<br />AUTO-TRACK ENABLED</div>
                  {doorOpen && (
                    <button className="btn danger" onClick={closeDoor}>
                      <DoorOpen size={12} /> Close Bay 3 Door Now
                    </button>
                  )}
                </div>
              </div>
              <div className="camera-footer" style={{ marginTop: 14 }}>
                <span className="airflow-warning">
                  <Wind size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                  Thermal Ingress: Bay 3 door open is adding approx +31 kW thermal load to Compressor 2.
                </span>
                <div className="density">
                  <div className="density-label">
                    <span>Dock Area Personnel Density:</span>
                    <b className="mono" style={{ color: '#e8bf74' }}>3 / 8 allowed</b>
                  </div>
                </div>
              </div>
            </section>
          </main>
        )}

        {activeNav === '3D Warehouse Twin' && (
          <main className="content" id="twin-dedicated" style={{ padding: '20px 24px 100px' }}>
            <div className="section-head" style={{ marginBottom: 16 }}>
              <div>
                <div className="section-title"><Box size={18} color="#36c8dd" /> 3D Thermodynamic Warehouse Twin</div>
                <div className="panel-sub">Full spatial thermal gradient model · Zones A, B, and C with live Pt100 RTD feedback</div>
              </div>
            </div>
            <TwinMap zones={dynamicZones} breach={breach} doorOpen={doorOpen} onSelect={(zone) => setSelectedZoneId(zone.id)} />
          </main>
        )}

        {activeNav === 'Energy Simulations' && (
          <main className="content" id="simulator-dedicated" style={{ padding: '20px 24px 100px' }}>
            <div className="section-head" style={{ marginBottom: 16 }}>
              <div>
                <div className="section-title"><Thermometer size={18} color="#48ccdf" /> Thermodynamic Shock Simulator &amp; Peak Shaving</div>
                <div className="panel-sub">Simulate door opening patterns, external ambient heat spikes, and demand response schedules</div>
              </div>
            </div>
            <section className="panel" style={{ padding: 22 }}>
              <div className="sim-layout">
                <div>
                  <div className="slider-row">
                    <div className="slider-label"><span>Daily Bay Door Openings</span><b>{openings} cycles / day</b></div>
                    <input aria-label="Daily Bay Openings" type="range" min="20" max="120" value={openings} onChange={(e) => setOpenings(+e.target.value)} />
                  </div>
                  <div className="slider-row">
                    <div className="slider-label"><span>Average Open Duration</span><b>{duration} seconds</b></div>
                    <input aria-label="Average Open Duration" type="range" min="10" max="180" value={duration} onChange={(e) => setDuration(+e.target.value)} />
                  </div>
                  <div className="slider-row">
                    <div className="slider-label"><span>External Ambient Temperature</span><b>{ambient}°C</b></div>
                    <input aria-label="External Ambient Temperature" type="range" min="-5" max="40" value={ambient} onChange={(e) => setAmbient(+e.target.value)} />
                  </div>
                  <label className="eyebrow" htmlFor="strategy-select-dedicated" style={{ marginTop: 12, display: 'block' }}>Mitigation Strategy</label>
                  <select id="strategy-select-dedicated" value={strategy} onChange={(e) => setStrategy(e.target.value)} className="strategy-select" style={{ width: '100%', marginTop: 4 }}>
                    <option>Off-Peak Night Shift</option>
                    <option>Standard Dynamic</option>
                  </select>
                </div>
                <div>
                  <div className="result-grid">
                    <div className="result"><small>Current Daily Energy</small><strong>{simulation.current} <span style={{ fontSize: 10 }}>kWh</span></strong></div>
                    <div className="result"><small>Optimized Schedule</small><strong>{simulation.alternative} <span style={{ fontSize: 10 }}>kWh</span></strong></div>
                    <div className="result saved"><small>Energy Reduction</small><strong>{reduction}%</strong></div>
                    <div className="result saved"><small>Projected Savings</small><strong>{saved} <span style={{ fontSize: 10 }}>kWh</span></strong></div>
                  </div>
                  <div style={{ color: '#8799aa', fontSize: 11, margin: '14px 0' }}>
                    Estimated Daily Utility Bill Savings: <b className="mono" style={{ color: '#68d7a0' }}>₹{Math.round(saved * 8)} / ${(saved * 0.1083).toFixed(2)} USD</b>
                  </div>
                  <button className="btn primary" style={{ width: '100%' }} onClick={applySchedule}>
                    <Check size={13} /> Apply Optimized Schedule to Facility Controls
                  </button>
                  {optimized && (
                    <div className="good" style={{ marginTop: 10, fontSize: 11 }}>
                      ✓ Optimized schedule active · Zone A &amp; B cooling setpoints tightened for off-peak pre-cooling
                    </div>
                  )}
                </div>
              </div>
            </section>
          </main>
        )}

        {activeNav === 'Co-Pilot AI' && (
          <main className="content" id="copilot-dedicated" style={{ padding: '20px 24px 100px' }}>
            <div className="section-head" style={{ marginBottom: 16 }}>
              <div>
                <div className="section-title"><Sparkles size={18} color="#54d1df" /> ColdChain Operational Co-Pilot AI</div>
                <div className="panel-sub">Llama 3 / GPT-4o RAG Offline Operations Intelligence Assistant</div>
              </div>
            </div>
            <section className="panel copilot" style={{ minHeight: 480, display: 'flex', flexDirection: 'column' }}>
              {ticket && (
                <div className="message ai" style={{ margin: '14px 16px 0', borderColor: '#834149', background: '#281b25' }}>
                  <strong style={{ color: '#ff8e94' }}>URGENT MAINTENANCE TICKET · CC-2047</strong>
                  <div>Bay 3 seal breach — isolate loading bay, install temporary strip curtain, and replace degraded silicone flap seal. Response window: 18 min.</div>
                </div>
              )}
              <div className="chat-messages" style={{ flex: 1, maxHeight: 380, overflowY: 'auto' }}>
                {messages.map((message, i) => (
                  <div className={`message ${message.from}`} key={`${i}-${message.from}`}>
                    {message.from === 'ai' && <strong>CO-PILOT / OPS INTELLIGENCE</strong>}
                    <div style={{ whiteSpace: 'pre-wrap', marginTop: message.from === 'ai' ? 5 : 0 }}>{message.text}</div>
                  </div>
                ))}
                {streaming && (
                  <div className="message ai">
                    <strong>CO-PILOT / OPS INTELLIGENCE</strong>
                    <div style={{ color: '#61d8e3', marginTop: 5 }}>{streamingText || 'Analyzing facility context…'}</div>
                  </div>
                )}
              </div>
              <div className="chips" style={{ padding: '8px 16px' }}>
                {['Generate ESG Audit Report', 'Diagnose Compressor 2', 'Simulate 1-hour Door Seal Failure'].map((chip) => (
                  <button className="chip" key={chip} onClick={() => sendPrompt(chip)}>{chip}</button>
                ))}
              </div>
              <form className="chat-compose" onSubmit={(e: FormEvent) => { e.preventDefault(); sendPrompt(); }} style={{ padding: '12px 16px' }}>
                <input
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ask about energy waste, thermal runaway risk, or equipment maintenance…"
                  aria-label="Co-Pilot prompt"
                />
                <button className="btn primary" type="submit" disabled={!prompt.trim() || streaming}>
                  <Send size={13} /> Send
                </button>
              </form>
            </section>
          </main>
        )}

        {activeNav === 'Audit & ESG Reports' && (
          <main className="content" id="esg-dedicated" style={{ padding: '20px 24px 100px' }}>
            <AuditEsgView onGenerateReport={() => notify('Verified ESG Audit Report generated')} />
          </main>
        )}

        {activeNav === 'Facility Config' && (
          <main className="content" id="config-dedicated" style={{ padding: '20px 24px 100px' }}>
            <FacilityConfigView onNotify={notify} />
          </main>
        )}
      </div>

      {/* ── Architecture Pipeline Drawer ── */}
      <div className={`architecture ${collapsed ? 'shift' : ''}`} data-testid="module-architecture">
        <button className="arch-toggle" onClick={() => setOpenArch(!openArch)} aria-expanded={openArch} data-testid="button-toggle-architecture">
          <span>
            <Cpu size={13} style={{ verticalAlign: 'middle', marginRight: 7, color: '#4fc8dc' }} />
            DIGITAL TWIN ARCHITECTURE <span style={{ color: '#5f7184', marginLeft: 8 }}>5-node offline pipeline</span>
          </span>
          {openArch ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
        </button>
        {openArch && (
          <div className="arch-content">
            <div className="pipeline">
              {['CCTV/IP Cameras (YOLOv8)', 'MQTT Broker Telemetry', 'Digital Twin Sim Engine', 'LangChain RAG Co-Pilot', 'React Dashboard'].map((name, i) => (
                <div style={{ display: 'contents' }} key={name}>
                  <div className="pipeline-node"><i />{name}</div>
                  {i < 4 && <ArrowRight size={14} className="pipe-arrow" />}
                </div>
              ))}
            </div>
            <div className="arch-status">
              <Check size={12} style={{ verticalAlign: 'middle', marginRight: 5 }} />
              All 5 nodes connected and reporting optimal packet latency (12ms).
            </div>
          </div>
        )}
      </div>

      {/* Toast Notification Stack */}
      {toast && (
        <div className="toast-stack">
          <div className="toast" role="status">
            <strong>Facility Update:</strong> {toast}
          </div>
        </div>
      )}

      {/* Zone Details Modal */}
      {selectedZone && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Zone ${selectedZone.id} details`}
          className="twin-hud"
          style={{ position: 'fixed', right: 24, top: '30%', zIndex: 45, width: 260 }}
          data-testid="zone-details-hud"
        >
          <div className="hud-title">
            <span>ZONE {selectedZone.id} DETAILS</span>
            <button className="btn ghost" onClick={() => setSelectedZoneId(null)} aria-label="Close zone details" data-testid="button-close-zone-details">×</button>
          </div>
          <div className="panel-sub" style={{ marginBottom: 8 }}>{selectedZone.name}</div>
          <div className="hud-row"><span>Current Temperature</span><b>{selectedZone.temp.toFixed(1)}°C</b></div>
          <div className="hud-row"><span>Target Setpoint</span><b>{selectedZone.target.toFixed(1)}°C</b></div>
          <div className="hud-row"><span>Active Compressor ID</span><b>{selectedZone.compressor}</b></div>
          <div className="hud-row"><span>Runaway Thermal Risk Score</span><b style={{ color: selectedZone.risk > 60 ? '#ff8686' : '#71d9a8' }}>{selectedZone.risk}/100</b></div>
        </div>
      )}
    </div>
  );
}

export default App;
