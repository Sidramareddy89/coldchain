/**
 * cc-api-bridge.js
 * Shared DataClaw + Digital Twin API bridge for all static HTML pages.
 *
 * Usage: include this script at the bottom of any static HTML page, then call:
 *   CcApiBridge.showQuickLoadWidget('#container-id');
 *   CcApiBridge.loadDataset(csvText);
 *   CcApiBridge.onDataLoaded(callback);
 *
 * The bridge proxies to the Express API at /api/dataclaw/analyze (which in turn
 * calls the Python FastAPI service at port 8000).  If the Express server is
 * unreachable, it falls back to a lightweight JS-only CSV parser.
 */

(function (global) {
  'use strict';

  const API_BASE = ''; // Same-origin — Express proxies to FastAPI

  // ─── registered callbacks ─────────────────────────────────────────────────
  const _listeners = [];

  // ─── Lightweight JS-only CSV parser (mirrors Python fallback) ─────────────
  function _parseCsvFallback(csvText) {
    const lines = csvText.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return null;

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const dataRows = lines.slice(1).map(line =>
      line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
    );

    // Compute column means
    const means = {};
    headers.forEach((col, i) => {
      const vals = dataRows.map(row => parseFloat(row[i])).filter(n => !isNaN(n));
      if (vals.length) means[col.toLowerCase()] = vals.reduce((a, b) => a + b, 0) / vals.length;
    });

    const m = (patterns, fallback) => {
      for (const p of patterns) if (means[p] !== undefined) return means[p];
      return fallback;
    };

    const currentTemp  = m(['temp', 'temperature', 'cargo_temp', 'cargoTemp'], -20);
    const targetSp     = m(['setpoint', 'target_setpoint'], currentTemp);
    const highThresh   = m(['high_threshold', 'highthreshold', 'high_limit'], currentTemp + 5);
    const lowThresh    = m(['low_threshold', 'lowthreshold', 'low_limit'], currentTemp - 5);

    return {
      controls: {
        reeferPower: true, coolingMode: 'ECO', doorOpen: false, fanActive: true,
        targetSetpoint: +targetSp.toFixed(2),
        highThreshold: +highThresh.toFixed(2),
        lowThreshold: +lowThresh.toFixed(2),
      },
      telemetry: {
        currentTemp: +currentTemp.toFixed(2),
        ambientTemp: +m(['ambient', 'ambient_temp'], 30).toFixed(2),
        speedKmh:    +m(['speed', 'speed_kmh', 'vehicle_speed'], 0).toFixed(2),
        humidity:    +m(['humidity', 'rh'], 70).toFixed(2),
        powerKw:     +m(['power', 'power_kw', 'kw', 'energy'], 250).toFixed(2),
        shockG: {
          x: +m(['shock_x', 'shockx', 'accel_x'], 0.08).toFixed(3),
          y: +m(['shock_y', 'shocky', 'accel_y'], 0.11).toFixed(3),
          z: +m(['shock_z', 'shockz', 'accel_z'], 0.98).toFixed(3),
        },
      },
      activeFaults: [],
      csvInfo: { rows: dataRows.length, cols: headers.length, columns: headers },
      statistics: { mean: means },
      dataQuality: {},
    };
  }

  // ─── Main API: load CSV via backend (or JS fallback) ─────────────────────
  async function loadDataset(csvText, options) {
    options = options || {};
    const triggerCrew = options.triggerCrew !== false; // default true

    let result = null;
    let source = 'js-fallback';

    try {
      const resp = await fetch(API_BASE + '/api/dataclaw/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csv: csvText, trigger_crew: triggerCrew }),
      });

      if (resp.ok) {
        const json = await resp.json();
        if (json.success) {
          result = json.data;
          if (json.crew) result.crew = json.crew;
          source = json.source || 'api';
        }
      }
    } catch (err) {
      console.warn('[CcApiBridge] API unreachable, using JS fallback:', err.message);
    }

    // JS fallback
    if (!result) {
      result = _parseCsvFallback(csvText);
      if (!result) {
        console.error('[CcApiBridge] Failed to parse CSV data');
        return null;
      }
    }

    // Notify all registered listeners
    _listeners.forEach(cb => {
      try { cb(result, source); } catch (e) { console.error('[CcApiBridge] Listener error:', e); }
    });

    // Expose to window for debugging
    global.CcApiBridgeLastResult = result;
    console.info('[CcApiBridge] Dataset loaded from', source, ':', result.csvInfo);
    return result;
  }

  // ─── Register a callback for when data is loaded ─────────────────────────
  function onDataLoaded(callback) {
    if (typeof callback === 'function') _listeners.push(callback);
  }

  // ─── Inject a Quick Load widget into any DOM element ─────────────────────
  function showQuickLoadWidget(containerSelector, options) {
    options = options || {};
    const container = typeof containerSelector === 'string'
      ? document.querySelector(containerSelector)
      : containerSelector;
    if (!container) { console.warn('[CcApiBridge] Container not found:', containerSelector); return; }

    const styles = `
      .cc-bridge-widget { background: #081526; border: 1px solid #1e3a5f; border-radius: 10px; padding: 16px 18px; margin: 12px 0; font-family: 'Inter', system-ui, sans-serif; }
      .cc-bridge-widget h3 { color: #38bdf8; font-size: 13px; font-weight: 700; margin: 0 0 10px 0; display: flex; align-items: center; gap: 7px; }
      .cc-bridge-widget h3::before { content: '⬡'; font-size: 16px; color: #0284c7; }
      .cc-bridge-row { display: flex; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; align-items: center; }
      .cc-bridge-textarea { width: 100%; min-height: 120px; padding: 8px 10px; border-radius: 6px; background: #07111f; border: 1px solid #1e3a5f; color: #c3d4e5; font-size: 11px; font-family: monospace; resize: vertical; outline: none; box-sizing: border-box; }
      .cc-bridge-btn { padding: 7px 14px; border-radius: 6px; border: none; font-size: 11px; font-weight: 700; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; transition: opacity .15s; }
      .cc-bridge-btn-primary { background: linear-gradient(135deg, #0369a1, #0284c7); color: #fff; }
      .cc-bridge-btn-ghost { background: transparent; color: #64748b; border: 1px solid #1e293b; }
      .cc-bridge-btn:disabled { opacity: 0.45; cursor: not-allowed; }
      .cc-bridge-result { margin-top: 10px; padding: 10px 12px; background: #071a10; border: 1px solid #14532d; border-radius: 8px; font-size: 11px; color: #86efac; }
      .cc-bridge-result b { color: #4ade80; }
      .cc-bridge-error { background: #2d0c0c; border-color: #7f1d1d; color: #f87171; }
      .cc-bridge-preview { font-size: 10px; color: #64748b; margin: 4px 0; }
    `;

    if (!document.getElementById('cc-bridge-styles')) {
      const s = document.createElement('style');
      s.id = 'cc-bridge-styles';
      s.textContent = styles;
      document.head.appendChild(s);
    }

    const widgetId = 'cc-bridge-' + Math.random().toString(36).slice(2, 7);
    container.innerHTML = `
      <div class="cc-bridge-widget" id="${widgetId}">
        <h3>Quick Load Dataset — DataClaw MCP Bridge</h3>
        <div class="cc-bridge-row">
          <label for="${widgetId}-file" class="cc-bridge-btn cc-bridge-btn-ghost" style="cursor:pointer;">📁 Upload CSV</label>
          <input type="file" id="${widgetId}-file" accept=".csv,.txt,.json" style="display:none"/>
          <button class="cc-bridge-btn cc-bridge-btn-ghost" id="${widgetId}-sample">Load sample</button>
          <button class="cc-bridge-btn cc-bridge-btn-ghost" id="${widgetId}-clear">Clear</button>
        </div>
        <textarea id="${widgetId}-textarea" class="cc-bridge-textarea"
          placeholder="Paste CSV rows here, e.g.:\ntimestamp,temp,ambient,speed,humidity,power\n2024-01-01T00:00Z,-19.6,32.0,48,78,248"></textarea>
        <div class="cc-bridge-preview" id="${widgetId}-preview"></div>
        <div class="cc-bridge-row" style="margin-top: 8px;">
          <button class="cc-bridge-btn cc-bridge-btn-primary" id="${widgetId}-submit" disabled>⬢ Analyze &amp; Load into Twin</button>
          <label style="display:inline-flex;align-items:center;gap:5px;font-size:10px;color:#64748b;cursor:pointer;">
            <input type="checkbox" id="${widgetId}-crew" checked style="accent-color:#38bdf8"> Auto-trigger AI Crew
          </label>
        </div>
        <div id="${widgetId}-status" style="display:none;"></div>
      </div>
    `;

    const textarea  = document.getElementById(`${widgetId}-textarea`);
    const fileInput = document.getElementById(`${widgetId}-file`);
    const submitBtn = document.getElementById(`${widgetId}-submit`);
    const statusEl  = document.getElementById(`${widgetId}-status`);
    const previewEl = document.getElementById(`${widgetId}-preview`);
    const crewCb    = document.getElementById(`${widgetId}-crew`);

    const SAMPLE_CSV = `timestamp,temp,ambient,speed,humidity,power,shock_x,shock_y,shock_z
2024-01-01T00:00:00Z,-19.6,32.0,48.0,78.0,248.0,0.08,0.11,0.98
2024-01-01T00:00:01Z,-19.7,32.1,47.5,78.2,249.0,0.09,0.12,0.97
2024-01-01T00:00:02Z,-19.5,32.0,48.2,78.0,247.0,0.08,0.10,0.99`;

    function updatePreview(text) {
      if (!text.trim()) { previewEl.textContent = ''; submitBtn.disabled = true; return; }
      const lines = text.trim().split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) { previewEl.textContent = 'Need at least 1 header row + 1 data row'; submitBtn.disabled = true; return; }
      const cols = lines[0].split(',').map(h => h.trim()).slice(0, 6);
      previewEl.textContent = `${lines.length - 1} rows · ${lines[0].split(',').length} columns: ${cols.join(', ')}${lines[0].split(',').length > 6 ? ' …' : ''}`;
      submitBtn.disabled = false;
    }

    textarea.addEventListener('input', () => updatePreview(textarea.value));
    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = e => { textarea.value = e.target.result; updatePreview(textarea.value); };
      reader.readAsText(file);
      fileInput.value = '';
    });
    document.getElementById(`${widgetId}-sample`).addEventListener('click', () => {
      textarea.value = SAMPLE_CSV;
      updatePreview(SAMPLE_CSV);
    });
    document.getElementById(`${widgetId}-clear`).addEventListener('click', () => {
      textarea.value = '';
      updatePreview('');
      statusEl.style.display = 'none';
    });

    submitBtn.addEventListener('click', async () => {
      submitBtn.disabled = true;
      submitBtn.textContent = '⏳ Analyzing…';
      statusEl.style.display = 'none';

      const result = await loadDataset(textarea.value, { triggerCrew: crewCb.checked });

      submitBtn.disabled = false;
      submitBtn.textContent = '⬢ Analyze & Load into Twin';

      if (result) {
        statusEl.className = 'cc-bridge-result';
        const crewLine = result.crew
          ? `<br>CrewAI: <b>${result.crew.crewStatus}</b> · Shelf-life impact: <b>${result.crew.shelfLifeImpact}</b>`
          : '';
        statusEl.innerHTML = `✅ Loaded <b>${result.csvInfo.rows}</b> rows · Cargo temp: <b>${result.telemetry.currentTemp.toFixed(1)}°C</b> · Setpoint: <b>${result.controls.targetSetpoint.toFixed(1)}°C</b>${crewLine}`;
        statusEl.style.display = 'block';

        // Call page-specific handler if defined
        if (typeof options.onResult === 'function') options.onResult(result);
        // Also call window.onDataClawResult if defined globally by the page
        if (typeof global.onDataClawResult === 'function') global.onDataClawResult(result);
      } else {
        statusEl.className = 'cc-bridge-result cc-bridge-error';
        statusEl.textContent = '❌ Failed to parse CSV. Check format and try again.';
        statusEl.style.display = 'block';
      }
    });
  }

  // ─── Public API ──────────────────────────────────────────────────────────
  global.CcApiBridge = {
    loadDataset,
    onDataLoaded,
    showQuickLoadWidget,
  };

})(window);
