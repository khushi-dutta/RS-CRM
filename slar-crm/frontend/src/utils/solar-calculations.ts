// =============================================================================
// Solar Position & Shadow Calculations
// =============================================================================

export interface SolarPosition {
  azimuth: number;      // degrees, 0=N clockwise
  elevation: number;    // degrees above horizon
  declination: number;  // degrees
  hourAngle: number;    // degrees
  isAboveHorizon: boolean;
}

export interface ShadowVector {
  dirX: number;
  dirY: number;
  length: number;
}

/**
 * Calculate solar position for a given date, time, and location
 */
export function calculateSolarPosition(
  lat: number,
  lng: number,
  day: number,
  month: number,
  hour: number,
  minute: number,
  timezoneOffsetMinutes: number,
  year: number = new Date().getFullYear()
): SolarPosition {
  // Step 1: Day of year
  const daysBeforeMonth = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let dayOfYear = day + daysBeforeMonth[month - 1];
  
  // Add 1 for leap year if month > 2
  const isLeapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  if (isLeapYear && month > 2) {
    dayOfYear += 1;
  }

  // Step 2: Solar declination (degrees)
  const declinationRad = 23.45 * Math.sin((360 / 365) * (dayOfYear - 81) * Math.PI / 180);
  const declination = declinationRad;

  // Step 3: Equation of time (minutes)
  const B = (360 / 365) * (dayOfYear - 81) * Math.PI / 180;
  const EoT = 9.87 * Math.sin(2 * B) - 7.53 * Math.cos(B) - 1.5 * Math.sin(B);

  // Step 4: Solar noon (local solar time in minutes)
  const longitudeCorrection = (lng - Math.round(lng / 15) * 15) * 4;
  const solarNoonMinutes = 720 - longitudeCorrection - EoT + timezoneOffsetMinutes;

  // Step 5: Hour angle (degrees)
  const currentMinutes = hour * 60 + minute;
  const hourAngle = (currentMinutes - solarNoonMinutes) / 4;

  // Step 6: Solar elevation (degrees)
  const latRad = lat * Math.PI / 180;
  const decRad = declination * Math.PI / 180;
  const haRad = hourAngle * Math.PI / 180;

  const sinElev = Math.sin(latRad) * Math.sin(decRad) + 
                  Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad);
  const elevation = Math.asin(sinElev) * 180 / Math.PI;

  // Step 7: Solar azimuth (degrees, 0=N clockwise)
  const cosAz = (Math.sin(decRad) - Math.sin(latRad) * sinElev) / 
                (Math.cos(latRad) * Math.cos(Math.asin(sinElev)));
  
  // Clamp to [-1, 1] to avoid NaN from acos
  const clampedCosAz = Math.max(-1, Math.min(1, cosAz));
  let azimuth = Math.acos(clampedCosAz) * 180 / Math.PI;
  
  // Adjust azimuth based on hour angle
  if (hourAngle > 0) {
    azimuth = 360 - azimuth;
  }

  return {
    azimuth,
    elevation,
    declination,
    hourAngle,
    isAboveHorizon: elevation > 0,
  };
}

/**
 * Calculate shadow vector from solar position
 */
export function calculateShadowVector(
  solarPosition: SolarPosition,
  obstructionHeight: number,
  metersPerPixel: number
): ShadowVector {
  if (!solarPosition.isAboveHorizon || solarPosition.elevation <= 0) {
    return { dirX: 0, dirY: 0, length: 0 };
  }

  // Shadow length on ground
  const shadowLengthMeters = obstructionHeight / Math.tan(solarPosition.elevation * Math.PI / 180);
  const shadowLengthPixels = shadowLengthMeters / metersPerPixel;

  // Shadow direction (opposite to sun direction)
  const azimuthRad = solarPosition.azimuth * Math.PI / 180;
  const dirX = -Math.sin(azimuthRad);
  const dirY = Math.cos(azimuthRad);

  return {
    dirX,
    dirY,
    length: shadowLengthPixels,
  };
}

/**
 * Calculate shadow polygon for a cylindrical obstruction
 */
export function calculateCylinderShadow(
  centerX: number,
  centerY: number,
  radius: number,
  shadowVector: ShadowVector
): number[] {
  if (shadowVector.length === 0) return [];

  // Calculate perpendicular direction
  const perpX = -shadowVector.dirY;
  const perpY = shadowVector.dirX;

  // Four corners of shadow polygon
  const leftEdgeX = centerX + perpX * radius;
  const leftEdgeY = centerY + perpY * radius;
  const rightEdgeX = centerX - perpX * radius;
  const rightEdgeY = centerY - perpY * radius;

  const leftTipX = leftEdgeX + shadowVector.dirX * shadowVector.length;
  const leftTipY = leftEdgeY + shadowVector.dirY * shadowVector.length;
  const rightTipX = rightEdgeX + shadowVector.dirX * shadowVector.length;
  const rightTipY = rightEdgeY + shadowVector.dirY * shadowVector.length;

  return [
    leftEdgeX, leftEdgeY,
    leftTipX, leftTipY,
    rightTipX, rightTipY,
    rightEdgeX, rightEdgeY,
  ];
}

/**
 * Calculate shadow polygon for a rectangular/polygon obstruction
 */
export function calculatePolygonShadow(
  vertices: number[],
  height: number,
  shadowVector: ShadowVector
): number[] {
  if (shadowVector.length === 0) return [];

  const shadowPolygon: number[] = [];

  // Add original vertices
  for (let i = 0; i < vertices.length; i += 2) {
    shadowPolygon.push(vertices[i], vertices[i + 1]);
  }

  // Add projected vertices (in reverse order to maintain winding)
  for (let i = vertices.length - 2; i >= 0; i -= 2) {
    const projectedX = vertices[i] + shadowVector.dirX * shadowVector.length;
    const projectedY = vertices[i + 1] + shadowVector.dirY * shadowVector.length;
    shadowPolygon.push(projectedX, projectedY);
  }

  return shadowPolygon;
}

/**
 * Calculate shadow for a tree (circular crown)
 */
export function calculateTreeShadow(
  centerX: number,
  centerY: number,
  trunkHeight: number,
  crownRadius: number,
  crownHeight: number,
  shadowVector: ShadowVector,
  solarPosition: SolarPosition
): { centerX: number; centerY: number; radiusX: number; radiusY: number } {
  if (!solarPosition.isAboveHorizon) {
    return { centerX, centerY, radiusX: 0, radiusY: 0 };
  }

  // Crown center height
  const crownCenterZ = trunkHeight + crownHeight / 2;

  // Shadow center offset
  const shadowCenterX = centerX + shadowVector.dirX * shadowVector.length * (crownCenterZ / trunkHeight);
  const shadowCenterY = centerY + shadowVector.dirY * shadowVector.length * (crownCenterZ / trunkHeight);

  // Shadow radius (elliptical projection)
  const elevationRad = solarPosition.elevation * Math.PI / 180;
  const radiusX = crownRadius + crownCenterZ / Math.tan(elevationRad) * 0.3;
  const radiusY = crownRadius;

  return {
    centerX: shadowCenterX,
    centerY: shadowCenterY,
    radiusX,
    radiusY,
  };
}
