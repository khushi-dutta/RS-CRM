// =============================================================================
// Solar Access Engine — Per-module solar access calculation
// =============================================================================

import type { SolarAccessResult, DesignModule, DesignObstruction, Point2D } from '../store/types';

const DEG = Math.PI / 180;

interface SunPos { elevation: number; azimuth: number; }

function calcSunPosition(dayOfYear: number, hour: number, latDeg: number): SunPos {
  const declination = 23.45 * Math.sin(((360 / 365) * (284 + dayOfYear)) * DEG);
  const hourAngle = 15 * (hour - 12);
  const lat = latDeg * DEG;
  const dec = declination * DEG;
  const ha = hourAngle * DEG;

  const sinElev = Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(ha);
  const elev = Math.asin(Math.max(-1, Math.min(1, sinElev)));

  const cosAz = (Math.sin(dec) - Math.sin(lat) * sinElev) / (Math.cos(lat) * Math.cos(elev));
  const az = Math.acos(Math.max(-1, Math.min(1, cosAz)));

  return {
    elevation: elev / DEG,
    azimuth: hourAngle < 0 ? az / DEG : 360 - az / DEG,
  };
}

// Monthly GHI weights for Delhi (kWh/m²/day)
const MONTHLY_GHI = [3.5, 4.2, 5.1, 5.8, 6.2, 6.0, 4.8, 4.5, 5.2, 5.5, 4.5, 3.8];

/**
 * Calculate solar access for each module (0-100%).
 * Samples representative days and hours, checks ray intersection with obstructions.
 */
export function calculateSolarAccess(
  modules: { id: string; x: number; y: number }[],
  obstructions: DesignObstruction[],
  latDeg: number,
  pxPerMeter: number,
): SolarAccessResult {
  const result: SolarAccessResult = {};
  const hours = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
  const sampleDays = [15, 46, 75, 106, 136, 167, 197, 228, 259, 289, 320, 350]; // ~15th of each month

  for (const mod of modules) {
    let unshadedGHI = 0;
    let totalGHI = 0;

    for (let mi = 0; mi < 12; mi++) {
      const doy = sampleDays[mi];
      const monthGHI = MONTHLY_GHI[mi];
      const ghibPerHour = monthGHI / hours.length;

      for (const hour of hours) {
        const sun = calcSunPosition(doy, hour, latDeg);
        if (sun.elevation <= 0) continue;

        totalGHI += ghibPerHour;

        // Cast a ray from module center toward sun, check obstruction intersection
        let shaded = false;
        const sunAzRad = sun.azimuth * DEG;
        const sunElRad = sun.elevation * DEG;
        const rayDirX = -Math.sin(sunAzRad) * pxPerMeter;
        const rayDirY = -Math.cos(sunAzRad) * pxPerMeter;

        for (const obs of obstructions) {
          const obsHeight = obs.height || 1.5;
          const shadowLenPx = (obsHeight * pxPerMeter) / Math.tan(sunElRad);

          // Get obstruction center
          const obsCx = obs.center?.x ?? (obs.vertices.reduce((s, v) => s + v.x, 0) / Math.max(obs.vertices.length, 1));
          const obsCy = obs.center?.y ?? (obs.vertices.reduce((s, v) => s + v.y, 0) / Math.max(obs.vertices.length, 1));

          // Shadow tip position
          const shadowTipX = obsCx + Math.sin(sunAzRad) * shadowLenPx;
          const shadowTipY = obsCy + Math.cos(sunAzRad) * shadowLenPx;

          // Check if module is within shadow cone
          const dx = mod.x - obsCx;
          const dy = mod.y - obsCy;
          const sdx = shadowTipX - obsCx;
          const sdy = shadowTipY - obsCy;
          const sLen = Math.hypot(sdx, sdy);
          if (sLen < 1) continue;

          const proj = (dx * sdx + dy * sdy) / (sLen * sLen);
          if (proj > 0 && proj < 1) {
            const perpDist = Math.abs(dx * sdy / sLen - dy * sdx / sLen);
            const obsRadius = obs.radius ? obs.radius * pxPerMeter : (obs.type === 'tree' ? (obs.crownRadius || 2) * pxPerMeter : 2 * pxPerMeter);
            if (perpDist < obsRadius) {
              shaded = true;
              break;
            }
          }
        }

        if (!shaded) {
          unshadedGHI += ghibPerHour;
        }
      }
    }

    result[mod.id] = totalGHI > 0 ? Math.round((unshadedGHI / totalGHI) * 100) : 100;
  }

  return result;
}

/** Get solar access color for a given percentage */
export function solarAccessColor(percent: number): string {
  if (percent < 50) return '#dc2626';   // deep red
  if (percent < 65) return '#ea580c';   // orange
  if (percent < 75) return '#eab308';   // yellow
  if (percent < 85) return '#84cc16';   // yellow-green
  if (percent < 95) return '#22c55e';   // light green
  return '#16a34a';                      // dark green
}
