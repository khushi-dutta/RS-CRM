// =============================================================================
// 3D View — Three.js Scene for the Design Studio
// =============================================================================

import { useMemo, useState, Suspense, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Sky, Environment, Text as DreiText, Line as DreiLine } from '@react-three/drei';
import * as THREE from 'three';
import { useDesignStore, MODULE_DATABASE } from '../store/designStore';
import { solarAccessColor } from '../engine/SolarAccessEngine';

export default function ThreeJSView() {
  const store = useDesignStore();
  const [hour, setHour] = useState(12);
  const controlsRef = useRef<any>(null);

  const handleRecenter = () => {
    if (controlsRef.current) {
      // Reset camera position and controls
      controlsRef.current.reset();
    }
  };

  // Calculate irradiance based on time of day (simplified)
  const getIrradianceColor = (baseColor: string, hour: number) => {
    if (!store.showIrradianceMap) return baseColor;
    
    // Peak irradiance at noon, lower at morning/evening
    const peakHour = 12;
    const hourDiff = Math.abs(hour - peakHour);
    const irradianceFactor = Math.max(0, 1 - (hourDiff / 6)); // 0 to 1
    
    // Color gradient from blue (low) to yellow (medium) to red (high)
    if (irradianceFactor > 0.7) return '#ef4444'; // High - red
    if (irradianceFactor > 0.4) return '#f59e0b'; // Medium - orange
    return '#3b82f6'; // Low - blue
  };

  return (
    <div className="studio-canvas-area" style={{ position: 'relative' }}>
      {/* Time slider */}
      <div style={{
        position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        background: '#1a1d27ee', borderRadius: 12, padding: '8px 20px', zIndex: 20,
        display: 'flex', alignItems: 'center', gap: 12,
        border: '1px solid #2a2d3a', color: '#94a3b8', fontSize: 12,
      }}>
        <span>6 AM</span>
        <input type="range" min={6} max={18} step={0.5} value={hour}
          onChange={e => setHour(Number(e.target.value))}
          style={{ width: 200, accentColor: '#f59e0b' }} />
        <span>6 PM</span>
        <span style={{ color: '#f59e0b', fontWeight: 600 }}>
          {hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
        </span>
      </div>

      {/* Recenter button */}
      <button
        onClick={handleRecenter}
        style={{
          position: 'absolute',
          bottom: 24,
          right: 24,
          background: '#1a1d27ee',
          border: '1px solid #2a2d3a',
          borderRadius: 8,
          padding: '10px 20px',
          color: '#94a3b8',
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          transition: 'all 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#2a2d3aee';
          e.currentTarget.style.color = '#f59e0b';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = '#1a1d27ee';
          e.currentTarget.style.color = '#94a3b8';
        }}
        title="Reset camera to default position"
      >
        <span style={{ fontSize: 16 }}>⟲</span>
        Recenter
      </button>

      {/* Irradiance Map Legend */}
      {store.showIrradianceMap && (
        <div style={{
          position: 'absolute',
          top: 24,
          right: 24,
          background: '#1a1d27ee',
          border: '1px solid #2a2d3a',
          borderRadius: 8,
          padding: '12px 16px',
          zIndex: 20,
          color: '#94a3b8',
          fontSize: 12,
        }}>
          <div style={{ fontWeight: 600, marginBottom: 8, color: '#f59e0b' }}>
            ☀ Irradiance Map
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 16, height: 16, background: '#ef4444', borderRadius: 3 }} />
              <span>High (700-1000 W/m²)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 16, height: 16, background: '#f59e0b', borderRadius: 3 }} />
              <span>Medium (400-700 W/m²)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 16, height: 16, background: '#3b82f6', borderRadius: 3 }} />
              <span>Low (0-400 W/m²)</span>
            </div>
          </div>
        </div>
      )}

      <Canvas shadows dpr={[1, 2]}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}>
        <Suspense fallback={null}>
          <Environment preset="city" />
          <Sky sunPosition={[-1, 0, 1]} inclination={0.2} azimuth={0.25} />
          <PerspectiveCamera makeDefault fov={45} position={[20, 25, 30]} />
          <OrbitControls 
            ref={controlsRef}
            enablePan 
            enableZoom 
            enableRotate
            enableDamping
            dampingFactor={0.1}
            panSpeed={2.0}
            rotateSpeed={1.0}
            zoomSpeed={1.5}
            maxPolarAngle={Math.PI / 2 - 0.05} 
            minDistance={3} 
            maxDistance={300}
            mouseButtons={{
              LEFT: THREE.MOUSE.ROTATE,
              MIDDLE: THREE.MOUSE.DOLLY,
              RIGHT: THREE.MOUSE.PAN
            }}
            touches={{
              ONE: THREE.TOUCH.ROTATE,
              TWO: THREE.TOUCH.DOLLY_PAN
            }}
          />
          <ambientLight intensity={0.4} />
          <directionalLight
            position={[30, 40, 20]}
            castShadow
            intensity={2}
            shadow-mapSize={[2048, 2048]}
          />

          {/* Ground */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
            <planeGeometry args={[200, 200]} />
            <meshStandardMaterial color="#6b7280" roughness={1} />
          </mesh>
          <gridHelper args={[200, 200, '#4b5563', '#9ca3af']} position={[0, -0.09, 0]} />

          {/* Roofs */}
          {store.roofs.map(roof => <Roof3D key={roof.id} roof={roof} pxPerMeter={store.pxPerMeter} hour={hour} getIrradianceColor={getIrradianceColor} />)}

          {/* Modules */}
          {store.subArrays.map(sa => <SubArray3D key={sa.id} sa={sa} store={store} hour={hour} getIrradianceColor={getIrradianceColor} />)}

          {/* Obstructions */}
          {store.obstructions.map(obs => <Obstruction3D key={obs.id} obs={obs} pxPerMeter={store.pxPerMeter} store={store} />)}

          {/* Inverters */}
          {store.inverters.map(inv => (
            <mesh key={inv.id} position={[inv.x / store.pxPerMeter, 1, inv.y / store.pxPerMeter]}>
              <boxGeometry args={[0.5, 0.8, 0.3]} />
              <meshStandardMaterial color="#7c3aed" />
            </mesh>
          ))}

          {/* Strings */}
          {store.layers.stringing && store.inverters.map(inv =>
            inv.strings.map((str, si) => {
              const points: THREE.Vector3[] = [];
              for (const modId of str.moduleIds) {
                for (const sa of store.subArrays) {
                  const mod = sa.modules.find(m => m.id === modId);
                  if (mod) {
                    points.push(new THREE.Vector3(mod.x / store.pxPerMeter, 0.3, mod.y / store.pxPerMeter));
                  }
                }
              }
              if (points.length < 2) return null;
              return (
                <DreiLine
                  key={`${inv.id}-s${si}`}
                  points={points}
                  color="#22c55e"
                  lineWidth={2}
                />
              );
            })
          )}

          {/* Text blocks as billboards */}
          {store.textBlocks.map(tb => (
            <DreiText
              key={tb.id}
              position={[tb.x / store.pxPerMeter, 2, tb.y / store.pxPerMeter]}
              fontSize={0.3}
              color={tb.color}
              anchorX="center"
              anchorY="middle"
            >
              {tb.text}
            </DreiText>
          ))}
        </Suspense>
      </Canvas>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Roof3D({ roof, pxPerMeter, hour, getIrradianceColor }: { roof: any; pxPerMeter: number; hour: number; getIrradianceColor: (color: string, hour: number) => string }) {
  const { shape, center } = useMemo(() => {
    if (!roof.vertices || roof.vertices.length < 3) return { shape: null, center: { x: 0, y: 0 } };
    
    // Convert vertices to meters
    const pts = roof.vertices.map((v: any) => ({ x: v.x / pxPerMeter, y: v.y / pxPerMeter }));
    
    // Calculate centroid
    const centerX = pts.reduce((sum: number, p: any) => sum + p.x, 0) / pts.length;
    const centerY = pts.reduce((sum: number, p: any) => sum + p.y, 0) / pts.length;
    
    // Create shape relative to centroid (so shape is centered at origin)
    const s = new THREE.Shape();
    s.moveTo(pts[0].x - centerX, pts[0].y - centerY);
    for (let i = 1; i < pts.length; i++) {
      s.lineTo(pts[i].x - centerX, pts[i].y - centerY);
    }
    s.closePath();
    
    return { shape: s, center: { x: centerX, y: centerY } };
  }, [roof.vertices, pxPerMeter]);

  if (!shape) return null;

  const store = useDesignStore();
  const isSelected = store.selectedIds.includes(roof.id);
  
  // Use the roof's color from the store, with irradiance overlay
  const baseRoofColor = roof.color || '#3b82f6';
  const roofColor = getIrradianceColor(baseRoofColor, hour);
  const buildingHeight = roof.height || 3; // Building wall height in meters
  const roofThickness = 0.2; // Roof slab thickness
  const baseHeight = roof.baseHeight || 0;

  // Create building walls (extruded from ground to roof level)
  const wallGeo = useMemo(() => {
    return new THREE.ExtrudeGeometry(shape, { 
      depth: buildingHeight,
      bevelEnabled: false 
    });
  }, [shape, buildingHeight]);

  // Create roof slab (thin extrusion for the roof surface)
  const roofGeo = useMemo(() => {
    return new THREE.ExtrudeGeometry(shape, { 
      depth: roofThickness,
      bevelEnabled: false 
    });
  }, [shape]);

  return (
    <group position={[center.x, 0, center.y]}>
      {/* Building walls - rotated to stand vertical */}
      <group rotation={[-Math.PI / 2, 0, 0]} position={[0, baseHeight, 0]}>
        <mesh 
          geometry={wallGeo} 
          castShadow 
          receiveShadow
          onClick={(e) => { 
            e.stopPropagation(); 
            store.selectObjects([roof.id], 'roof'); 
          }}
        >
          <meshStandardMaterial 
            color="#e5e7eb"
            roughness={0.9}
            metalness={0.0}
          />
        </mesh>
        
        {/* Wall edges */}
        <lineSegments geometry={new THREE.EdgesGeometry(wallGeo)}>
          <lineBasicMaterial color="#9ca3af" />
        </lineSegments>
      </group>

      {/* Roof surface - positioned on top of walls */}
      <group rotation={[-Math.PI / 2, 0, 0]} position={[0, baseHeight + buildingHeight, 0]}>
        <mesh 
          geometry={roofGeo} 
          castShadow 
          receiveShadow
          onClick={(e) => { 
            e.stopPropagation(); 
            store.selectObjects([roof.id], 'roof'); 
          }}
        >
          <meshStandardMaterial 
            color={isSelected ? '#fbbf24' : roofColor} 
            roughness={0.6}
            metalness={0.2}
            side={THREE.DoubleSide}
          />
        </mesh>
        
        {/* Roof edge lines */}
        <lineSegments geometry={new THREE.EdgesGeometry(roofGeo)}>
          <lineBasicMaterial color={isSelected ? '#fbbf24' : '#1e293b'} />
        </lineSegments>
      </group>
    </group>
  );
}

function SubArray3D({ sa, store, hour, getIrradianceColor }: { sa: any; store: any; hour: number; getIrradianceColor: (color: string, hour: number) => string }) {
  const spec = MODULE_DATABASE.find((m: any) => m.id === sa.moduleSpecId);
  if (!spec) return null;

  let pw = spec.widthMm / 1000;
  let ph = spec.lengthMm / 1000;
  if (sa.orientation === 'landscape') [pw, ph] = [ph, pw];

  // Find the roof this subarray belongs to
  const roof = store.roofs.find((r: any) => r.id === sa.roofId);
  if (!roof) return null;
  
  const roofHeight = (roof.baseHeight || 0) + (roof.height || 3) + 0.2;

  // Convert tilt and azimuth to radians
  const tiltRad = (sa.tilt || 0) * Math.PI / 180;
  const azimuthRad = (sa.azimuth || 180) * Math.PI / 180;
  
  // Structure dimensions
  const structureHeight = (sa.mountHeight || 0.5) + 0.3; // Taller structure (0.8m default)
  const railWidth = 0.08; // Thicker rails
  const legWidth = 0.06; // Thicker legs
  const panelOffset = structureHeight * 0.7; // Panel sits higher on structure

  return (
    <>
      {sa.modules.map((mod: any) => {
        const saPct = store.solarAccess[mod.id];
        let color = '#2563eb';
        
        // Priority: Solar Access > Irradiance Map > Default
        if (store.solarAccessRun && saPct !== undefined) {
          color = solarAccessColor(saPct);
        } else if (store.showIrradianceMap) {
          color = getIrradianceColor('#2563eb', hour);
        }
        
        const moduleHeight = roofHeight;
        
        // Geometry constraints
        const structureHeight = (sa.mountHeight || 0.5) + 0.1; // Center point elevation
        const railWidth = 0.05;
        const legWidth = 0.05;
        const legOffsetZ = ph * 0.35;
        const legOffsetX = pw * 0.35;
        
        // Dynamic leg heights to adapt seamlessly to panel tilt
        const frontLegHeight = structureHeight - legOffsetZ * Math.sin(tiltRad);
        const backLegHeight  = structureHeight + legOffsetZ * Math.sin(tiltRad);
        
        const validFrontH = Math.max(0.05, frontLegHeight);
        const validBackH = Math.max(0.05, backLegHeight);
        
        return (
          <group 
            key={mod.id} 
            position={[
              mod.x / store.pxPerMeter, 
              moduleHeight, 
              mod.y / store.pxPerMeter
            ]}
            rotation={[0, azimuthRad - Math.PI, 0]}
          >
            {/* TILTED ASSEMBLY: Panel + Upper Rails */}
            <group position={[0, structureHeight, 0]} rotation={[tiltRad, 0, 0]}>
              {/* The Solar Panel */}
              <group position={[0, railWidth / 2 + 0.02, 0]}>
                <mesh castShadow receiveShadow>
                  <boxGeometry args={[pw, 0.04, ph]} />
                  <meshPhysicalMaterial 
                    color={color} 
                    metalness={0.7} 
                    roughness={0.15} 
                    clearcoat={1}
                    clearcoatRoughness={0.1}
                    emissive={color}
                    emissiveIntensity={0.1}
                  />
                </mesh>
                <lineSegments>
                  <edgesGeometry args={[new THREE.BoxGeometry(pw, 0.04, ph)]} />
                  <lineBasicMaterial color="#1e40af" />
                </lineSegments>
              </group>
              
              {/* Upper Mounting Rails (flush underneath panel) */}
              <mesh position={[0, 0, legOffsetZ]} castShadow>
                <boxGeometry args={[pw * 0.85, railWidth, railWidth]} />
                <meshStandardMaterial color="#6b7280" metalness={0.85} roughness={0.25} />
              </mesh>
              <mesh position={[0, 0, -legOffsetZ]} castShadow>
                <boxGeometry args={[pw * 0.85, railWidth, railWidth]} />
                <meshStandardMaterial color="#6b7280" metalness={0.85} roughness={0.25} />
              </mesh>
              
              {/* Cross Beams connecting upper rails */}
              <mesh position={[-legOffsetX, 0, 0]} castShadow>
                <boxGeometry args={[railWidth, railWidth, ph * 0.7]} />
                <meshStandardMaterial color="#6b7280" metalness={0.85} roughness={0.25} />
              </mesh>
              <mesh position={[legOffsetX, 0, 0]} castShadow>
                <boxGeometry args={[railWidth, railWidth, ph * 0.7]} />
                <meshStandardMaterial color="#6b7280" metalness={0.85} roughness={0.25} />
              </mesh>
            </group>

            {/* STATIC ASSEMBLY: Flat Base on Roof + Vertical Legs reaching up */}
            <group>
              {/* Front Base Rail */}
              <mesh position={[0, 0.02, legOffsetZ * Math.cos(tiltRad)]} castShadow>
                <boxGeometry args={[pw * 0.9, 0.04, railWidth]} />
                <meshStandardMaterial color="#374151" metalness={0.8} roughness={0.3} />
              </mesh>
              
              {/* Back Base Rail */}
              <mesh position={[0, 0.02, -legOffsetZ * Math.cos(tiltRad)]} castShadow>
                <boxGeometry args={[pw * 0.9, 0.04, railWidth]} />
                <meshStandardMaterial color="#374151" metalness={0.8} roughness={0.3} />
              </mesh>
              
              {/* Front Legs */}
              <mesh position={[-legOffsetX, validFrontH / 2, legOffsetZ * Math.cos(tiltRad)]} castShadow>
                <boxGeometry args={[legWidth, validFrontH, legWidth]} />
                <meshStandardMaterial color="#4b5563" metalness={0.7} roughness={0.4} />
              </mesh>
              <mesh position={[legOffsetX, validFrontH / 2, legOffsetZ * Math.cos(tiltRad)]} castShadow>
                <boxGeometry args={[legWidth, validFrontH, legWidth]} />
                <meshStandardMaterial color="#4b5563" metalness={0.7} roughness={0.4} />
              </mesh>
              
              {/* Back Legs */}
              <mesh position={[-legOffsetX, validBackH / 2, -legOffsetZ * Math.cos(tiltRad)]} castShadow>
                <boxGeometry args={[legWidth, validBackH, legWidth]} />
                <meshStandardMaterial color="#4b5563" metalness={0.7} roughness={0.4} />
              </mesh>
              <mesh position={[legOffsetX, validBackH / 2, -legOffsetZ * Math.cos(tiltRad)]} castShadow>
                <boxGeometry args={[legWidth, validBackH, legWidth]} />
                <meshStandardMaterial color="#4b5563" metalness={0.7} roughness={0.4} />
              </mesh>
            </group>
            
          </group>
        );
      })}
    </>
  );
}

function Obstruction3D({ obs, pxPerMeter, store }: { obs: any; pxPerMeter: number; store: any }) {
  // Find the roof this obstruction belongs to
  const roof = store.roofs.find((r: any) => r.id === obs.roofId);
  const roofHeight = roof ? (roof.baseHeight || 0) + (roof.height || 3) : 0;

  if (obs.type === 'cylinder' && obs.center) {
    return (
      <mesh position={[obs.center.x / pxPerMeter, roofHeight + obs.height / 2, obs.center.y / pxPerMeter]} castShadow>
        <cylinderGeometry args={[(obs.radius || 15) / pxPerMeter, (obs.radius || 15) / pxPerMeter, obs.height, 16]} />
        <meshStandardMaterial color="#ef4444" opacity={0.6} transparent />
      </mesh>
    );
  }

  if (obs.type === 'tree' && obs.center) {
    const tH = obs.trunkHeight || 3;
    const cH = obs.crownHeight || 4;
    const cR = obs.crownRadius || 2.5;
    return (
      <group position={[obs.center.x / pxPerMeter, roofHeight, obs.center.y / pxPerMeter]}>
        {/* Trunk */}
        <mesh position={[0, tH / 2, 0]} castShadow>
          <cylinderGeometry args={[0.15, 0.2, tH, 8]} />
          <meshStandardMaterial color="#8b6b4a" />
        </mesh>
        {/* Crown */}
        <mesh position={[0, tH + cH / 2, 0]} castShadow>
          <sphereGeometry args={[cR, 12, 12]} />
          <meshStandardMaterial color="#16a34a" opacity={0.7} transparent />
        </mesh>
      </group>
    );
  }

  if (obs.type === 'handrail' && obs.vertices.length >= 2) {
    const points = obs.vertices.map((v: any) =>
      new THREE.Vector3(v.x / pxPerMeter, roofHeight + (obs.height || 0.9), v.y / pxPerMeter)
    );
    const curve = new THREE.CatmullRomCurve3(points, false);
    const geo = new THREE.TubeGeometry(curve, 20, 0.03, 8, false);
    return (
      <mesh geometry={geo} castShadow>
        <meshStandardMaterial color="#a855f7" metalness={0.6} roughness={0.3} />
      </mesh>
    );
  }

  // Polygon/rectangle obstruction
  if (obs.vertices.length >= 3) {
    const shape = new THREE.Shape();
    const pts = obs.vertices.map((v: any) => ({ x: v.x / pxPerMeter, y: v.y / pxPerMeter }));
    shape.moveTo(pts[0].x, pts[0].y);
    pts.slice(1).forEach((p: any) => shape.lineTo(p.x, p.y));
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: obs.height || 0.6, bevelEnabled: false });

    return (
      <group rotation={[-Math.PI / 2, 0, 0]} position={[0, roofHeight, 0]}>
        <mesh geometry={geo} castShadow>
          <meshStandardMaterial color="#ef4444" opacity={0.5} transparent />
        </mesh>
      </group>
    );
  }

  return null;
}
