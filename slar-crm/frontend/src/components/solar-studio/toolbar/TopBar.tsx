// =============================================================================
// Top Bar — View Toggle, Solar Access, Save
// =============================================================================

import { useDesignStore, MODULE_DATABASE } from '../store/designStore';
import type { ViewMode } from '../store/types';
import { calculateEnergyYield } from '../engine/EnergyYield';
import { calculateSolarAccess } from '../engine/SolarAccessEngine';
import { useMemo, useState } from 'react';

export default function TopBar({ onOpenLocationSelector }: { onOpenLocationSelector?: () => void }) {
  const store = useDesignStore();
  const [computing, setComputing] = useState(false);

  const views: { mode: ViewMode; label: string; shortcut: string }[] = [
    { mode: '2d', label: '2D', shortcut: '22' },
    { mode: '3d', label: '3D', shortcut: '33' },
    { mode: 'sld', label: 'SLD', shortcut: '44' },
  ];

  const totalModules = store.subArrays.reduce((s, sa) => s + sa.modules.length, 0);
  const totalKwp = useMemo(() => {
    let kw = 0;
    for (const sa of store.subArrays) {
      const spec = MODULE_DATABASE.find(m => m.id === sa.moduleSpecId);
      if (spec) kw += sa.modules.length * spec.wattage / 1000;
    }
    return kw;
  }, [store.subArrays]);

  const handleSolarAccess = async () => {
    setComputing(true);
    // Collect all modules
    const allModules = store.subArrays.flatMap(sa => sa.modules.map(m => ({ id: m.id, x: m.x, y: m.y })));

    // Run solar access (this is synchronous but could be moved to web worker)
    setTimeout(() => {
      const result = calculateSolarAccess(allModules, store.obstructions, store.latitude, store.pxPerMeter);
      store.setSolarAccess(result);
      store.setSolarAccessRun(true);
      setComputing(false);
    }, 100);
  };

  return (
    <div className="studio-topbar">
      <div className="studio-topbar-left">
        <span className="studio-title">☀️ Solar Studio</span>
        {totalModules > 0 && (
          <>
            <span style={{ color: '#3b82f6', fontSize: 12, fontWeight: 600 }}>
              {totalModules} panels
            </span>
            <span style={{ color: '#10b981', fontSize: 12, fontWeight: 600 }}>
              {totalKwp.toFixed(1)} kWp
            </span>
          </>
        )}
        {store.isDirty && (
          <span style={{ color: '#f59e0b', fontSize: 10 }}>● unsaved</span>
        )}
      </div>

      <div className="studio-topbar-center">
        {views.map(v => (
          <button
            key={v.mode}
            className={`view-btn ${store.viewMode === v.mode ? 'active' : ''}`}
            onClick={() => store.setViewMode(v.mode)}
            title={`Press ${v.shortcut} for ${v.label}`}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div className="studio-topbar-right">
        <button
          className="topbar-action-btn"
          onClick={onOpenLocationSelector}
          title="Select Location from Map"
          style={{ background: '#3b82f6', color: 'white', borderColor: '#3b82f6' }}
        >
          📍 Location
        </button>
        
        <button
          className="topbar-action-btn solar-access-btn"
          onClick={handleSolarAccess}
          disabled={computing || totalModules === 0}
          title="Run Solar Access Analysis"
        >
          {computing ? '⏳ Computing...' : '☀ Solar Access'}
        </button>

        <button
          className="topbar-action-btn save-btn"
          onClick={() => store.saveDesign()}
          title="Save Design (Ctrl+S)"
        >
          💾 Save
        </button>

        <button
          className="topbar-action-btn"
          onClick={() => store.undo()}
          title="Undo (Ctrl+Z)"
        >
          ↩
        </button>
        <button
          className="topbar-action-btn"
          onClick={() => store.redo()}
          title="Redo (Ctrl+Y)"
        >
          ↪
        </button>
      </div>
    </div>
  );
}
