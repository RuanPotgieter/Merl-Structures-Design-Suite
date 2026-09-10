// @ts-nocheck
/// <reference types="@react-three/fiber" />
import React, { useMemo, useRef, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { Canvas, ReactThreeFiber, ThreeElements } from '@react-three/fiber';

declare global {
  namespace JSX {
    interface IntrinsicElements extends ThreeElements {}
  }
}
import { OrbitControls, Grid, ContactShadows, GizmoHelper, GizmoViewport, Edges } from '@react-three/drei';
import { Box, Eye, Square, Columns, RotateCcw, Compass, ArrowUpFromLine, ArrowDownToLine, Maximize2 } from 'lucide-react';
import { DeckCalculationResult, Rostrum, Foot, TerrainConfig, Ledger, RampPlate } from '../types';
import { 
  COMPONENT_COLORS, 
  DECK_THICKNESS, 
  SOLE_BOARD_THICKNESS 
} from '../constants';
import { getGroundYAt } from '../utils/deckLogic';

// --- Professional CAD Materials with Crisp Metallic Sheen ---

const MAT_SILVER = new THREE.MeshStandardMaterial({
  color: "#C0C0C0",
  metalness: 0.95,
  roughness: 0.2,
});

const MAT_GREY = new THREE.MeshPhysicalMaterial({
  color: "#d4dcde",
  metalness: 0.92,
  roughness: 0.16,
  clearcoat: 0.35,
  clearcoatRoughness: 0.15,
});

const MAT_BRACE = new THREE.MeshPhysicalMaterial({
  color: "#ffffff",
  metalness: 0.85,
  roughness: 0.22,
  clearcoat: 0.25,
});

const MAT_RED = new THREE.MeshPhysicalMaterial({
  color: "#ff334b",
  metalness: 0.85,
  roughness: 0.28,
  clearcoat: 0.25,
});

// Yellow Basejack and Adjustment Nut Materials
const MAT_BASE_JACK = new THREE.MeshPhysicalMaterial({
  color: "#eab308", // Authentic scaffolding yellow
  metalness: 0.75,
  roughness: 0.28,
  clearcoat: 0.25,
});

// Light Pink Swivel Connector Material for Rake Braces
const MAT_SWIVEL_CONNECTOR = new THREE.MeshPhysicalMaterial({
  color: "#f472b6", // Light pink swivel coupler per user instruction
  metalness: 0.65,
  roughness: 0.35,
  clearcoat: 0.3,
});

const MAT_BASE_JACK_HANDLE = new THREE.MeshPhysicalMaterial({
  color: "#f59e0b", // Cast amber-yellow for wing nut & handles
  metalness: 0.8,
  roughness: 0.25,
  clearcoat: 0.3,
});

// Handrails: Black uprights, Green rails
const MAT_HANDRAIL_UPRIGHT = new THREE.MeshPhysicalMaterial({
  color: "#18181b", // Solid deep black metal
  metalness: 0.85,
  roughness: 0.28,
  clearcoat: 0.3,
});

const MAT_HANDRAIL_GREEN = new THREE.MeshPhysicalMaterial({
  color: "#16a34a", // Vibrant scaffolding green
  metalness: 0.8,
  roughness: 0.24,
  clearcoat: 0.25,
});

const MAT_ROSTRUM = new THREE.MeshStandardMaterial({
  color: "#ffffff",
  roughness: 1.0,
  metalness: 0.0,
  envMapIntensity: 0.0,
});

const MAT_TERRAIN = new THREE.MeshStandardMaterial({
  color: "#cbd5e1",
  roughness: 0.85,
  metalness: 0.05,
  polygonOffset: true,
  polygonOffsetFactor: 1,
});

const MAT_SOLE_BOARD = new THREE.MeshStandardMaterial({
  color: "#b45309",
  roughness: 0.85,
  metalness: 0.08,
});

const MAT_RAMP_PLATE = new THREE.MeshStandardMaterial({
  color: "#333333", // Dark grey/black for the 18mm board
  roughness: 0.9,
  metalness: 0.1,
});

const MAT_LEDGER_BLUE = new THREE.MeshPhysicalMaterial({ color: "#2563eb", roughness: 0.22, metalness: 0.78, clearcoat: 0.2 });
const MAT_LEDGER_GREEN = new THREE.MeshPhysicalMaterial({ color: "#10b981", roughness: 0.22, metalness: 0.78, clearcoat: 0.2 });
const MAT_LEDGER_BLACK = new THREE.MeshPhysicalMaterial({ color: "#161922", roughness: 0.18, metalness: 0.92, clearcoat: 0.3 });

const _TEMP_MATRIX = new THREE.Matrix4();
const _TEMP_COLOR = new THREE.Color();
const _TEMP_VECTOR = new THREE.Vector3();
const _TEMP_QUAT = new THREE.Quaternion();

// Correct Cylinder: Radius 1, Height 1 centered. 
// So Diameter is 2. Scale by radius (0.02415) to get 48.3mm.
const CYL_GEO = new THREE.CylinderGeometry(1, 1, 1, 18);
const BOX_GEO = new THREE.BoxGeometry(1, 1, 1);

// Detailed Basejack Components
const BASEJACK_PLATE_GEO = new THREE.BoxGeometry(0.15, 0.006, 0.15);

// Realistic Threaded Screw Spindle with ACME square thread profile
const createThreadedJackGeometry = () => {
  const pts: THREE.Vector2[] = [];
  const rRoot = 0.0175;
  const rCrest = 0.021;
  const turns = 24;
  pts.push(new THREE.Vector2(0, 0));
  pts.push(new THREE.Vector2(rRoot, 0));
  for (let i = 0; i < turns; i++) {
    const y0 = i / turns;
    const s = 1 / turns;
    pts.push(new THREE.Vector2(rRoot, y0));
    pts.push(new THREE.Vector2(rCrest, y0 + s * 0.3));
    pts.push(new THREE.Vector2(rCrest, y0 + s * 0.7));
    pts.push(new THREE.Vector2(rRoot, y0 + s));
  }
  pts.push(new THREE.Vector2(rRoot, 1));
  pts.push(new THREE.Vector2(0, 1));
  const geo = new THREE.LatheGeometry(pts, 20);
  geo.translate(0, -0.5, 0); // Center at origin for unit scaling
  geo.computeVertexNormals();
  return geo;
};
const THREADED_JACK_GEO = createThreadedJackGeometry();

// Cast Wing-Nut Adjustment Collar & Dual Horizontal Handles
const createBasejackHandleGeometry = () => {
  const collar = new THREE.CylinderGeometry(0.026, 0.026, 0.024, 16);
  const handleBar = new THREE.CylinderGeometry(0.0055, 0.0055, 0.14, 12);
  handleBar.rotateZ(Math.PI / 2);
  const leftKnob = new THREE.SphereGeometry(0.0085, 12, 12);
  leftKnob.translate(-0.07, 0, 0);
  const rightKnob = new THREE.SphereGeometry(0.0085, 12, 12);
  rightKnob.translate(0.07, 0, 0);

  const geos = [collar, handleBar, leftKnob, rightKnob];
  let totalPos = 0, totalNorm = 0, totalIdx = 0;
  geos.forEach(g => {
    totalPos += g.attributes.position.array.length;
    if (g.attributes.normal) totalNorm += g.attributes.normal.array.length;
    if (g.index) totalIdx += g.index.array.length;
  });

  const posArr = new Float32Array(totalPos);
  const normArr = new Float32Array(totalNorm);
  const idxArr = new Uint32Array(totalIdx);

  let posOffset = 0, normOffset = 0, idxOffset = 0, vertexOffset = 0;
  geos.forEach(g => {
    posArr.set(g.attributes.position.array, posOffset);
    if (g.attributes.normal) normArr.set(g.attributes.normal.array, normOffset);
    if (g.index) {
      for (let i = 0; i < g.index.array.length; i++) {
        idxArr[idxOffset + i] = g.index.array[i] + vertexOffset;
      }
      idxOffset += g.index.array.length;
    }
    vertexOffset += g.attributes.position.count;
    posOffset += g.attributes.position.array.length;
    if (g.attributes.normal) normOffset += g.attributes.normal.array.length;
  });

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
  if (totalNorm > 0) merged.setAttribute('normal', new THREE.BufferAttribute(normArr, 3));
  if (totalIdx > 0) merged.setIndex(new THREE.BufferAttribute(idxArr, 1));
  return merged;
};
const BASEJACK_HANDLE_GEO = createBasejackHandleGeometry();

// Refined Architectural CAD Origin Datum Indicator
const OriginMarker: React.FC<{ terrain: TerrainConfig; dimensions: any }> = () => {
  return (
    <group position={[0, 0, 0]}>
      {/* Ground Survey Datum Benchmark Target */}
      <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.08, 0.22, 32]} />
        <meshBasicMaterial color="#64748b" side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.035, 32]} />
        <meshBasicMaterial color="#0f172a" />
      </mesh>

      {/* X Axis Arrow (Red) - Width */}
      <group>
        <mesh position={[0.22, 0.005, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <cylinderGeometry args={[0.006, 0.006, 0.44, 12]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
        <mesh position={[0.48, 0.005, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[0.02, 0.08, 16]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
      </group>

      {/* Y Axis Arrow (Green) - Elevation */}
      <group>
        <mesh position={[0, 0.22, 0]}>
          <cylinderGeometry args={[0.006, 0.006, 0.44, 12]} />
          <meshBasicMaterial color="#10b981" />
        </mesh>
        <mesh position={[0, 0.48, 0]}>
          <coneGeometry args={[0.02, 0.08, 16]} />
          <meshBasicMaterial color="#10b981" />
        </mesh>
      </group>

      {/* Z Axis Arrow (Blue) - Depth */}
      <group>
        <mesh position={[0, 0.005, 0.22]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.006, 0.006, 0.44, 12]} />
          <meshBasicMaterial color="#3b82f6" />
        </mesh>
        <mesh position={[0, 0.005, 0.48]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.02, 0.08, 16]} />
          <meshBasicMaterial color="#3b82f6" />
        </mesh>
      </group>

      {/* Center Origin Precision Hub */}
      <mesh position={[0, 0.012, 0]}>
        <sphereGeometry args={[0.018, 16, 16]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.2} metalness={0.8} />
      </mesh>
    </group>
  );
};

const TerrainMesh: React.FC<{ terrain: TerrainConfig, dimensions: any, rostrums: any[] }> = ({ terrain, dimensions, rostrums }) => {
  const segments = 48;
  
  const geometry = useMemo(() => {
    // Provide a neat 8m apron around the deck rather than a sprawling 250m plane
    const margin = 8;
    const w = Math.max(dimensions.width + margin * 2, 24);
    const d = Math.max(dimensions.depth + margin * 2, 24);
    const geo = new THREE.PlaneGeometry(w, d, segments, segments);
    
    // Center the plane geometry's center on the deck's center in X and Z
    // width/2 for X, -depth/2 for Y (which maps to +Z in world)
    geo.translate(dimensions.width / 2, -dimensions.depth / 2, 0);

    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const worldZ = -pos.getY(i);
      let groundY = getGroundYAt(x, worldZ, terrain, dimensions.width, dimensions.depth);
      
      pos.setZ(i, groundY - 0.02);
    }
    geo.computeVertexNormals();
    return geo;
  }, [terrain, dimensions]);

  return (
    <group rotation={[-Math.PI / 2, 0, 0]}>
      <mesh geometry={geometry} material={MAT_TERRAIN} receiveShadow />
    </group>
  );
};

const InfrastructureGroup: React.FC<{ feet: Foot[]; ledgers: Ledger[]; braces: any[]; swivelConnectors?: any[]; layers: any }> = ({ feet, ledgers, braces, swivelConnectors = [], layers }) => {
  const meshStd = useRef<THREE.InstancedMesh>(null);
  const meshJack = useRef<THREE.InstancedMesh>(null);
  const meshJackPlate = useRef<THREE.InstancedMesh>(null);
  const meshJackHandle = useRef<THREE.InstancedMesh>(null);
  const meshPipe = useRef<THREE.InstancedMesh>(null);
  const meshSole = useRef<THREE.InstancedMesh>(null);
  const meshLedger = useRef<THREE.InstancedMesh>(null);
  const meshBrace = useRef<THREE.InstancedMesh>(null);
  const meshConnector = useRef<THREE.InstancedMesh>(null);
  const meshSwivel = useRef<THREE.InstancedMesh>(null);
  const meshSwivelBody = useRef<THREE.InstancedMesh>(null);

  const assembly = useMemo(() => {
    const stds: any[] = [];
    const jacks: any[] = [];
    const plates: any[] = [];
    const handles: any[] = [];
    const pipes: any[] = [];
    const soles: any[] = [];
    const ledgerInsts: any[] = [];
    const braceInsts: any[] = [];
    const connectors: any[] = [];
    
    const STD_RADIUS = 0.0325; // 65mm / 2

    feet.forEach(f => {
      const { x, y } = f.position;
      soles.push({ pos: [x, f.groundHeight + SOLE_BOARD_THICKNESS / 2, y] });
      
      if (f.assembly) {
        let curY = f.groundHeight + SOLE_BOARD_THICKNESS;
        
        // Basejack: Realistic square plate + threaded rod + wing-nut adjustment handles
        const bjH = f.assembly.basejack / 1000;
        // 1. Square baseplate resting directly on the soleboard
        plates.push({ pos: [x, curY + 0.003, y] });

        // 2. Threaded screw stem
        jacks.push({ pos: [x, curY + bjH / 2, y], h: bjH });

        // 3. Wing-nut collar and dual adjustment handles
        const rot = ((x * 17.3 + y * 31.7) % (Math.PI * 2));
        handles.push({ pos: [x, curY + bjH - 0.014, y], rot });

        curY += bjH;

        // Pipe
        const pipeH = f.assembly.pipe / 1000;
        pipes.push({ pos: [x, curY + pipeH / 2, y], h: pipeH });
        curY += pipeH;

        // Standards
        f.assembly.standards.forEach((sMm, index) => {
          const sH = sMm / 1000;
          const stdColor = (COMPONENT_COLORS.STANDARDS as any)[sH] ? (COMPONENT_COLORS.STANDARDS as any)[sH].replace('#', '') : "C0C0C0";
          stds.push({ 
            pos: [x, curY + sH / 2, y], 
            h: sH, 
            color: stdColor
          });
          
          if (index > 0) {
            connectors.push({
              pos: [x, curY, y],
              h: 0.1 // 100mm connector
            });
          }
          
          curY += sH;
        });
      }
    });

    if (layers.ledgers && ledgers) {
      ledgers.forEach(l => {
         ledgerInsts.push({
            pos: [l.position.x, l.position.z, l.position.y], // z is elevation
            rot: [l.rotation.x, l.rotation.y, l.rotation.z],
            len: l.length,
            color: l.color
         });
      });
    }

    if (layers.structure && braces) {
      braces.forEach(b => {
        const dx = b.endPos.x - b.startPos.x;
        const dy = b.endPos.z - b.startPos.z; // z is elev
        const dz = b.endPos.y - b.startPos.y; // y is depth
        
        const len = Math.sqrt(dx*dx + dy*dy + dz*dz);
        if (len < 0.001) return; // Skip if length is too small to prevent NaN
        
        const cx = (b.startPos.x + b.endPos.x) / 2;
        const cy = (b.startPos.z + b.endPos.z) / 2;
        const cz = (b.startPos.y + b.endPos.y) / 2;
        
        const dir = new THREE.Vector3(dx, dy, dz).normalize();
        const up = new THREE.Vector3(0, 1, 0);
        const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
        
        braceInsts.push({
          pos: [cx, cy, cz],
          quat: quat,
          len: len,
          color: b.color || "ffe600"
        });
      });
    }

    const swivelInsts: any[] = [];
    if (layers.structure && swivelConnectors) {
      swivelConnectors.forEach(sc => {
        // Position: sc.position.x is width (X), sc.position.z is elevation (Y in 3D), sc.position.y is depth (Z in 3D)
        swivelInsts.push({
          pos: [sc.position.x, sc.position.z, sc.position.y],
          color: sc.color || '#2563eb'
        });
      });
    }

    return { stds, jacks, plates, handles, pipes, soles, ledgers: ledgerInsts, braces: braceInsts, connectors, swivels: swivelInsts, stdRadius: STD_RADIUS };
  }, [feet, ledgers, braces, swivelConnectors, layers.ledgers, layers.structure]);

  useLayoutEffect(() => {
    if (meshStd.current && assembly.stds.length > 0) {
      assembly.stds.forEach((s, i) => {
        if (i >= meshStd.current!.count) return;
        _TEMP_MATRIX.makeTranslation(s.pos[0], s.pos[1], s.pos[2]).scale(_TEMP_VECTOR.set(assembly.stdRadius, s.h, assembly.stdRadius));
        meshStd.current!.setMatrixAt(i, _TEMP_MATRIX);
        meshStd.current!.setColorAt(i, _TEMP_COLOR.set(`#${s.color}`));
      });
      meshStd.current.instanceMatrix.needsUpdate = true;
      if (meshStd.current.instanceColor) meshStd.current.instanceColor.needsUpdate = true;
    }

    if (meshJackPlate.current && assembly.plates.length > 0) {
      assembly.plates.forEach((p, i) => {
        if (i >= meshJackPlate.current!.count) return;
        _TEMP_MATRIX.makeTranslation(p.pos[0], p.pos[1], p.pos[2]);
        meshJackPlate.current!.setMatrixAt(i, _TEMP_MATRIX);
      });
      meshJackPlate.current.instanceMatrix.needsUpdate = true;
    }

    if (meshJack.current && assembly.jacks.length > 0) {
      assembly.jacks.forEach((j, i) => {
        if (i >= meshJack.current!.count) return;
        _TEMP_MATRIX.makeTranslation(j.pos[0], j.pos[1], j.pos[2]).scale(_TEMP_VECTOR.set(1, j.h, 1));
        meshJack.current!.setMatrixAt(i, _TEMP_MATRIX);
      });
      meshJack.current.instanceMatrix.needsUpdate = true;
    }

    if (meshJackHandle.current && assembly.handles.length > 0) {
      assembly.handles.forEach((h, i) => {
        if (i >= meshJackHandle.current!.count) return;
        _TEMP_QUAT.setFromAxisAngle(_TEMP_VECTOR.set(0, 1, 0), h.rot);
        _TEMP_MATRIX.compose(new THREE.Vector3(...h.pos), _TEMP_QUAT, _TEMP_VECTOR.set(1, 1, 1));
        meshJackHandle.current!.setMatrixAt(i, _TEMP_MATRIX);
      });
      meshJackHandle.current.instanceMatrix.needsUpdate = true;
    }

    if (meshPipe.current && assembly.pipes.length > 0) {
      assembly.pipes.forEach((p, i) => {
        if (i >= meshPipe.current!.count) return;
        _TEMP_MATRIX.makeTranslation(p.pos[0], p.pos[1], p.pos[2]).scale(_TEMP_VECTOR.set(assembly.stdRadius, p.h, assembly.stdRadius));
        meshPipe.current!.setMatrixAt(i, _TEMP_MATRIX);
      });
      meshPipe.current.instanceMatrix.needsUpdate = true;
    }

    if (meshSole.current && assembly.soles.length > 0) {
      assembly.soles.forEach((s, i) => {
        if (i >= meshSole.current!.count) return;
        _TEMP_MATRIX.makeTranslation(s.pos[0], s.pos[1], s.pos[2]).scale(_TEMP_VECTOR.set(0.25, SOLE_BOARD_THICKNESS, 0.25));
        meshSole.current!.setMatrixAt(i, _TEMP_MATRIX);
      });
      meshSole.current.instanceMatrix.needsUpdate = true;
    }

    if (meshLedger.current && layers.ledgers && assembly.ledgers.length > 0) {
      assembly.ledgers.forEach((l, i) => {
        if (i >= meshLedger.current!.count) return;
        _TEMP_QUAT.setFromEuler(new THREE.Euler(...l.rot));
        _TEMP_MATRIX.compose(new THREE.Vector3(...l.pos), _TEMP_QUAT, _TEMP_VECTOR.set(0.015, l.len, 0.015));
        meshLedger.current!.setMatrixAt(i, _TEMP_MATRIX);
        meshLedger.current!.setColorAt(i, _TEMP_COLOR.set(`#${l.color.replace('#', '')}`));
      });
      meshLedger.current.instanceMatrix.needsUpdate = true;
      if (meshLedger.current.instanceColor) meshLedger.current.instanceColor.needsUpdate = true;
    }

    if (meshBrace.current && layers.structure && assembly.braces.length > 0) {
      assembly.braces.forEach((b, i) => {
        if (i >= meshBrace.current!.count) return;
        _TEMP_MATRIX.compose(new THREE.Vector3(...b.pos), b.quat, _TEMP_VECTOR.set(0.024, b.len, 0.024));
        meshBrace.current!.setMatrixAt(i, _TEMP_MATRIX);
        meshBrace.current!.setColorAt(i, _TEMP_COLOR.set(`#${b.color.replace('#', '')}`));
      });
      meshBrace.current.instanceMatrix.needsUpdate = true;
      if (meshBrace.current.instanceColor) meshBrace.current.instanceColor.needsUpdate = true;
    }

    if (meshConnector.current && assembly.connectors.length > 0) {
      assembly.connectors.forEach((c, i) => {
        if (i >= meshConnector.current!.count) return;
        _TEMP_MATRIX.makeTranslation(c.pos[0], c.pos[1], c.pos[2]).scale(_TEMP_VECTOR.set(assembly.stdRadius * 1.1, c.h, assembly.stdRadius * 1.1));
        meshConnector.current!.setMatrixAt(i, _TEMP_MATRIX);
      });
      meshConnector.current.instanceMatrix.needsUpdate = true;
    }

    if (meshSwivel.current && assembly.swivels.length > 0) {
      assembly.swivels.forEach((s, i) => {
        if (i >= meshSwivel.current!.count) return;
        _TEMP_MATRIX.makeTranslation(s.pos[0], s.pos[1], s.pos[2]).scale(
          _TEMP_VECTOR.set(assembly.stdRadius * 1.5, 0.08, assembly.stdRadius * 1.5)
        );
        meshSwivel.current!.setMatrixAt(i, _TEMP_MATRIX);
        meshSwivel.current!.setColorAt(i, _TEMP_COLOR.set(s.color));
      });
      meshSwivel.current.instanceMatrix.needsUpdate = true;
      if (meshSwivel.current.instanceColor) meshSwivel.current.instanceColor.needsUpdate = true;
    }

    if (meshSwivelBody.current && assembly.swivels.length > 0) {
      assembly.swivels.forEach((s, i) => {
        if (i >= meshSwivelBody.current!.count) return;
        _TEMP_MATRIX.makeTranslation(s.pos[0], s.pos[1], s.pos[2]).scale(
          _TEMP_VECTOR.set(0.085, 0.06, 0.085)
        );
        meshSwivelBody.current!.setMatrixAt(i, _TEMP_MATRIX);
        meshSwivelBody.current!.setColorAt(i, _TEMP_COLOR.set(s.color));
      });
      meshSwivelBody.current.instanceMatrix.needsUpdate = true;
      if (meshSwivelBody.current.instanceColor) meshSwivelBody.current.instanceColor.needsUpdate = true;
    }
  }, [assembly, layers.ledgers, layers.structure]);

  return (
    <group>
      {assembly.stds.length > 0 && <instancedMesh ref={meshStd} args={[CYL_GEO, MAT_SILVER, assembly.stds.length]} castShadow />}
      {assembly.plates.length > 0 && <instancedMesh ref={meshJackPlate} args={[BASEJACK_PLATE_GEO, MAT_BASE_JACK, assembly.plates.length]} castShadow receiveShadow />}
      {assembly.jacks.length > 0 && <instancedMesh ref={meshJack} args={[THREADED_JACK_GEO, MAT_BASE_JACK, assembly.jacks.length]} castShadow />}
      {assembly.handles.length > 0 && <instancedMesh ref={meshJackHandle} args={[BASEJACK_HANDLE_GEO, MAT_BASE_JACK_HANDLE, assembly.handles.length]} castShadow />}
      {assembly.pipes.length > 0 && <instancedMesh ref={meshPipe} args={[CYL_GEO, MAT_SILVER, assembly.pipes.length]} castShadow />}
      {assembly.soles.length > 0 && <instancedMesh ref={meshSole} args={[BOX_GEO, MAT_SOLE_BOARD, assembly.soles.length]} receiveShadow />}
      {assembly.ledgers.length > 0 && <instancedMesh ref={meshLedger} args={[CYL_GEO, MAT_SILVER, assembly.ledgers.length]} castShadow />}
      {assembly.braces.length > 0 && <instancedMesh ref={meshBrace} args={[CYL_GEO, MAT_BRACE, assembly.braces.length]} castShadow />}
      {assembly.connectors.length > 0 && <instancedMesh ref={meshConnector} args={[CYL_GEO, MAT_RED, assembly.connectors.length]} castShadow />}
      {assembly.swivels.length > 0 && (
        <>
          <instancedMesh ref={meshSwivel} args={[CYL_GEO, MAT_SWIVEL_CONNECTOR, assembly.swivels.length]} castShadow />
          <instancedMesh ref={meshSwivelBody} args={[BOX_GEO, MAT_SWIVEL_CONNECTOR, assembly.swivels.length]} castShadow />
        </>
      )}
    </group>
  );
};

const HandrailGroup: React.FC<{ uprights: any[]; handrails: any[] }> = ({ uprights, handrails }) => {
  const meshUpright = useRef<THREE.InstancedMesh>(null);
  const meshRail = useRef<THREE.InstancedMesh>(null);

  const assembly = useMemo(() => {
    const upInsts: any[] = [];
    const railInsts: any[] = [];

    if (uprights) {
      uprights.forEach(u => {
        // Upright from zDeck - 0.2 to zDeck + 1.1 (length 1.3)
        const h = 1.3;
        const cy = u.zDeck + 0.45; // mid point of (-0.2 to 1.1)
        
        if (u.type === 'DOUBLE_UPRIGHT' || u.type === 'DOUBLE') {
          // Double upright: offset slightly
          const offset = 0.05; // 50mm offset
          upInsts.push({
            pos: [u.x + offset, cy, u.y + offset],
            h: h,
            rot: u.rotation
          });
          upInsts.push({
            pos: [u.x - offset, cy, u.y - offset],
            h: h,
            rot: u.rotation
          });
        } else {
          upInsts.push({
            pos: [u.x, cy, u.y],
            h: h,
            rot: u.rotation
          });
        }
      });
    }

    if (handrails) {
      handrails.forEach(hr => {
        const dx = hr.endPos.x - hr.startPos.x;
        const dy = hr.endPos.z - hr.startPos.z; // z is elev
        const dz = hr.endPos.y - hr.startPos.y; // y is depth
        
        const len = Math.sqrt(dx*dx + dy*dy + dz*dz);
        if (len < 0.001) return; // Skip if length is too small to prevent NaN
        
        const cx = (hr.startPos.x + hr.endPos.x) / 2;
        const cy = (hr.startPos.z + hr.endPos.z) / 2;
        const cz = (hr.startPos.y + hr.endPos.y) / 2;
        
        const dir = new THREE.Vector3(dx, dy, dz).normalize();
        const up = new THREE.Vector3(0, 1, 0);
        const quat = new THREE.Quaternion().setFromUnitVectors(up, dir);
        
        if (hr.isExplicit) {
          // Explicit rail segment (e.g. vertical return loop / termination bar)
          railInsts.push({
            pos: [cx, cy, cz],
            quat: quat.clone(),
            len: len
          });
        } else {
          // Top rail (z + 1.0)
          railInsts.push({
            pos: [cx, cy + 1.0, cz],
            quat: quat.clone(),
            len: len
          });
          
          // Mid rail (z + 0.5)
          railInsts.push({
            pos: [cx, cy + 0.5, cz],
            quat: quat.clone(),
            len: len
          });
        }
      });
    }

    return { upInsts, railInsts };
  }, [uprights, handrails]);

  useLayoutEffect(() => {
    if (meshUpright.current && assembly.upInsts.length > 0) {
      assembly.upInsts.forEach((u, i) => {
        if (i >= meshUpright.current!.count) return;
        _TEMP_QUAT.setFromEuler(new THREE.Euler(0, -u.rot, 0));
        _TEMP_MATRIX.compose(new THREE.Vector3(...u.pos), _TEMP_QUAT, _TEMP_VECTOR.set(0.04, u.h, 0.04));
        meshUpright.current!.setMatrixAt(i, _TEMP_MATRIX);
      });
      meshUpright.current.instanceMatrix.needsUpdate = true;
    }

    if (meshRail.current && assembly.railInsts.length > 0) {
      assembly.railInsts.forEach((r, i) => {
        if (i >= meshRail.current!.count) return;
        _TEMP_MATRIX.compose(new THREE.Vector3(...r.pos), r.quat, _TEMP_VECTOR.set(0.019, r.len, 0.019));
        meshRail.current!.setMatrixAt(i, _TEMP_MATRIX);
      });
      meshRail.current.instanceMatrix.needsUpdate = true;
    }
  }, [assembly]);

  return (
    <group>
      {assembly.upInsts.length > 0 && <instancedMesh ref={meshUpright} args={[BOX_GEO, MAT_HANDRAIL_UPRIGHT, assembly.upInsts.length]} castShadow />}
      {assembly.railInsts.length > 0 && <instancedMesh ref={meshRail} args={[CYL_GEO, MAT_HANDRAIL_GREEN, assembly.railInsts.length]} castShadow />}
    </group>
  );
};

const RostrumGroup: React.FC<{ rostrums: Rostrum[], terrain: TerrainConfig }> = ({ rostrums, terrain }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const instances = useMemo(() => {
    const data: { id: string, pos: [number, number, number], rot: [number, number, number], scale: [number, number, number], color: string }[] = [];
    rostrums.forEach(r => {
      const width = r.width;
      let depth = r.depth;
      const cx = r.center.x;
      const cz = r.center.y;
      const midElev = r.startElevation !== undefined && r.endElevation !== undefined 
        ? (r.startElevation + r.endElevation) / 2 
        : (r.startElevation !== undefined ? r.startElevation : Number(terrain?.deckHeight) || 0);
      const isRamp = !!r.isRamp;
      
      if (isRamp && r.slope) {
        const slopeRad = r.slope * Math.PI / 180;
        const cosVal = Math.max(0.01, Math.abs(Math.cos(slopeRad)));
        if (r.side === 'top' || r.side === 'bottom') {
          depth = depth / cosVal;
        } else {
          // For left/right, the slope is along the X axis, so width is the length
        }
      }
      
      let finalWidth = width;
      let finalDepth = depth;
      if (isRamp && r.slope && (r.side === 'left' || r.side === 'right')) {
        const cosVal = Math.max(0.01, Math.abs(Math.cos(r.slope * Math.PI / 180)));
        finalWidth = width / cosVal;
      }
      
      const rotX = isRamp && (r.side === 'top' || r.side === 'bottom') ? (r.side === 'bottom' ? -1 : 1) * (r.slope! * Math.PI / 180) : 0;
      const rotY = r.rotationY;
      const rotZ = isRamp && (r.side === 'left' || r.side === 'right') ? (r.side === 'left' ? 1 : -1) * (r.slope! * Math.PI / 180) : 0;

      if (r.isRiserFascia) {
        // Skirts / riser fascias have been removed per user instruction
        return;
      } else if (r.isStepBox) {
        // Intermediate step box: 125mm riser, sitting on the deck level
        const stepH = 0.125;
        data.push({
          id: r.id,
          pos: [cx, midElev - stepH / 2, cz],
          rot: [0, 0, 0],
          scale: [Math.max(0.01, finalWidth - 0.01), stepH, Math.max(0.01, finalDepth - 0.01)],
          color: "#18181b"
        });
      } else {
        data.push({
          id: r.id,
          pos: [cx, midElev - DECK_THICKNESS / 2, cz],
          rot: [rotX, rotY, rotZ],
          scale: [Math.max(0.01, finalWidth - 0.005), DECK_THICKNESS, Math.max(0.01, finalDepth - 0.005)],
          color: "#141720" // Non-reflective matte dark stage board surface
        });
      }
    });
    return data;
  }, [rostrums]);

  const edgesGeometry = useMemo(() => {
    const baseCorners = [
      new THREE.Vector3(-0.5, -0.5, -0.5),
      new THREE.Vector3(0.5, -0.5, -0.5),
      new THREE.Vector3(0.5, 0.5, -0.5),
      new THREE.Vector3(-0.5, 0.5, -0.5),
      new THREE.Vector3(-0.5, -0.5, 0.5),
      new THREE.Vector3(0.5, -0.5, 0.5),
      new THREE.Vector3(0.5, 0.5, 0.5),
      new THREE.Vector3(-0.5, 0.5, 0.5),
    ];
    const edgeIndices = [
      0,1, 1,2, 2,3, 3,0,
      4,5, 5,6, 6,7, 7,4,
      0,4, 1,5, 2,6, 3,7
    ];

    const positions = new Float32Array(instances.length * 24 * 3);
    let offset = 0;

    const mat = new THREE.Matrix4();
    const quat = new THREE.Quaternion();
    const vec = new THREE.Vector3();

    instances.forEach(inst => {
      quat.setFromEuler(new THREE.Euler(...inst.rot));
      mat.compose(
        new THREE.Vector3(...inst.pos),
        quat,
        new THREE.Vector3(...inst.scale)
      );

      edgeIndices.forEach(index => {
        vec.copy(baseCorners[index]).applyMatrix4(mat);
        positions[offset++] = vec.x;
        positions[offset++] = vec.y;
        positions[offset++] = vec.z;
      });
    });

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [instances]);

  useLayoutEffect(() => {
    if (!meshRef.current) return;
    
    instances.forEach((inst, i) => {
      if (i >= meshRef.current!.count) return;
      _TEMP_QUAT.setFromEuler(new THREE.Euler(...inst.rot));
      _TEMP_MATRIX.compose(
        new THREE.Vector3(...inst.pos), 
        _TEMP_QUAT, 
        _TEMP_VECTOR.set(...inst.scale)
      );
      meshRef.current!.setMatrixAt(i, _TEMP_MATRIX);
      meshRef.current!.setColorAt(i, _TEMP_COLOR.set(inst.color));
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  }, [instances]);

  return (
    <group>
      {instances.length > 0 && (
        <>
          <instancedMesh 
            ref={meshRef} 
            args={[BOX_GEO, MAT_ROSTRUM, instances.length]} 
            castShadow 
            receiveShadow 
          />
          <lineSegments geometry={edgesGeometry}>
            <lineBasicMaterial color="#f59e0b" toneMapped={false} />
          </lineSegments>
        </>
      )}
    </group>
  );
};

export interface DeckVisualizer3DProps {
  data: DeckCalculationResult;
  onSelect: (type: string | null, id: string | null, data: any | null) => void;
  selectionId: string | null;
  layers: { structure: boolean; ledgers: boolean; terrain: boolean; rostrums: boolean };
  active?: boolean;
}

export const RampPlateGroup: React.FC<{ rampPlates: RampPlate[] }> = ({ rampPlates }) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    if (meshRef.current && rampPlates.length > 0) {
      rampPlates.forEach((p, i) => {
        if (i >= meshRef.current.count) return;
        _TEMP_QUAT.setFromEuler(new THREE.Euler(0, -p.rotation, 0));
        _TEMP_MATRIX.compose(
          new THREE.Vector3(p.position.x, p.position.z + 0.009, p.position.y), // y is depth (Z in 3D), z is elev (Y in 3D). Elevates by half thickness (9mm).
          _TEMP_QUAT,
          _TEMP_VECTOR.set(p.width, 0.018, p.depth) // 18mm thickness
        );
        meshRef.current.setMatrixAt(i, _TEMP_MATRIX);
      });
      meshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [rampPlates]);

  if (!rampPlates || rampPlates.length === 0) return null;

  return (
    <instancedMesh ref={meshRef} args={[BOX_GEO, MAT_RAMP_PLATE, rampPlates.length]} castShadow receiveShadow />
  );
};

export const DeckVisualizer3D: React.FC<DeckVisualizer3DProps> = React.memo(({ data, layers, active = true }) => {
  const BG_COLOR = "#e5e7eb"; // Clean architectural light grey viewport background
  const controlsRef = useRef<any>(null);

  const setView = (view: string) => {
    if (!controlsRef.current) return;
    const controls = controlsRef.current;
    const deckH = Number(data.terrain?.deckHeight) || 0;
    const target = new THREE.Vector3(0, deckH, 0);
    controls.target.copy(target);

    const distance = Math.max(data.dimensions.width, data.dimensions.depth) * 1.5 + 5;

    switch(view) {
      case 'iso':
        controls.object.position.set(-distance, distance, -distance);
        break;
      case 'top':
        controls.object.position.set(0.001, distance * 1.5, 0.001);
        break;
      case 'bottom':
        controls.object.position.set(0.001, -distance * 1.5, 0.001);
        break;
      case 'left':
        controls.object.position.set(-distance, deckH, 0);
        break;
      case 'right':
        controls.object.position.set(distance, deckH, 0);
        break;
      case 'front':
        controls.object.position.set(0, deckH, distance);
        break;
      case 'back':
        controls.object.position.set(0, deckH, -distance);
        break;
    }
    controls.update();
  };

  const initialDistance = Math.max(12, Math.max(data.dimensions?.width || 10, data.dimensions?.depth || 10) * 1.5 + 5);

  return (
    <div className="w-full h-full bg-[#e5e7eb] overflow-hidden relative touch-none">
      {/* Decluttered Minimalist CAD Camera View Toolbar with Small Icons */}
      <div className="absolute top-3 left-3 z-20 flex items-center gap-0.5 p-1 bg-slate-900/80 backdrop-blur-md rounded-md border border-slate-700/60 shadow-md">
        <div className="flex items-center gap-1 px-1.5 py-2 border-r border-slate-700/60 text-slate-400">
          <Compass size={10} className="text-amber-400" />
        </div>
        <button 
          onClick={() => setView('iso')} 
          className="flex items-center gap-1 px-1.5 py-2 rounded text-xs font-mono font-medium text-slate-200 hover:text-amber-400 hover:bg-amber-400/15 transition-all"
          title="Isometric CAD Perspective"
        >
          <Box size={10} className="text-amber-400" />
          <span>ISO</span>
        </button>
        <button 
          onClick={() => setView('top')} 
          className="flex items-center gap-1 px-1.5 py-2 rounded text-xs font-mono text-slate-300 hover:text-amber-400 hover:bg-amber-400/15 transition-all"
          title="Top Plan View"
        >
          <Square size={9} />
          <span>TOP</span>
        </button>
        <button 
          onClick={() => setView('front')} 
          className="flex items-center gap-1 px-1.5 py-2 rounded text-xs font-mono text-slate-300 hover:text-amber-400 hover:bg-amber-400/15 transition-all"
          title="Front Elevation"
        >
          <Eye size={9} />
          <span>FRT</span>
        </button>
        <button 
          onClick={() => setView('right')} 
          className="flex items-center gap-1 px-1.5 py-2 rounded text-xs font-mono text-slate-300 hover:text-amber-400 hover:bg-amber-400/15 transition-all"
          title="Side View (Right)"
        >
          <Columns size={9} />
          <span>SIDE</span>
        </button>
        <button 
          onClick={() => setView('left')} 
          className="px-1.5 py-2 rounded text-xs font-mono text-slate-400 hover:text-amber-400 hover:bg-amber-400/15 transition-all"
          title="Left Elevation"
        >
          LFT
        </button>
        <button 
          onClick={() => setView('bottom')} 
          className="px-1.5 py-2 rounded text-xs font-mono text-slate-400 hover:text-amber-400 hover:bg-amber-400/15 transition-all"
          title="Bottom Underneath View"
        >
          BTM
        </button>
      </div>

      <Canvas 
        frameloop={active ? "always" : "never"}
        shadows 
        dpr={[1, Math.min(typeof window !== 'undefined' ? window.devicePixelRatio : 2, 2)]} 
        camera={{ position: [-initialDistance, initialDistance, -initialDistance], fov: 30, far: 5000 }}
        gl={{ 
          antialias: true,
          powerPreference: "high-performance" 
        }}
      >
        <color attach="background" args={[BG_COLOR]} />
        <ambientLight intensity={0.7} color="#ffffff" />
        <hemisphereLight args={["#ffffff", "#cbd5e1", 0.65]} position={[0, 50, 0]} />
        
        {/* Directional Studio Lighting with Key & Fill Highlights */}
        <directionalLight 
          position={[45, 65, 35]} 
          intensity={1.5} 
          castShadow 
          shadow-mapSize={[1024, 1024]}
          shadow-camera-left={-35}
          shadow-camera-right={35}
          shadow-camera-top={35}
          shadow-camera-bottom={-35}
          shadow-bias={-0.00005}
        />
        <directionalLight 
          position={[-35, 45, -40]} 
          intensity={0.65} 
          color="#dbeafe" 
        />
        <directionalLight 
          position={[0, 30, -50]} 
          intensity={0.3} 
          color="#ffffff" 
        />
        
        {/* Crisp Architectural Grid Ground Plane on Light Grey */}
        <Grid 
          position={[0, -0.005, 0]} 
          args={[120, 120]} 
          cellSize={1.2} 
          cellThickness={0.8} 
          cellColor="#cbd5e1" 
          sectionSize={4.8} 
          sectionThickness={1.2} 
          sectionColor="#94a3b8" 
          fadeDistance={85} 
          fadeStrength={1.5} 
          infiniteGrid 
        />

        {/* Soft Ground Shadow Rendering Under Structure */}
        <ContactShadows 
          position={[0, -0.002, 0]} 
          opacity={0.35} 
          scale={Math.max(data.dimensions.width, data.dimensions.depth) * 2 + 12} 
          blur={2.0} 
          far={20} 
          resolution={512} 
          frames={1}
          color="#000000" 
        />
        
        <group>
          <OriginMarker terrain={data.terrain} dimensions={data.dimensions} />
          
          {layers.terrain && <TerrainMesh terrain={data.terrain} dimensions={data.dimensions} rostrums={data.rostrums} />}
          
          {layers.structure && <InfrastructureGroup feet={data.feet} ledgers={data.ledgers} braces={data.braces} swivelConnectors={data.swivelConnectors} layers={layers} />}
          
          {layers.structure && <HandrailGroup uprights={data.uprights} handrails={data.handrails} />}
          
          {layers.rostrums && <RostrumGroup rostrums={data.rostrums} terrain={data.terrain} />}
        </group>

        <OrbitControls 
          ref={controlsRef}
          makeDefault 
          enableDamping={true}
          dampingFactor={0.12} 
          minDistance={1} 
          maxDistance={3000} 
          target={[0, Number(data.terrain?.deckHeight) || 0, 0]}
        />
        
        {/* Orientation Axis Gizmo in Top-Right Corner */}
        <GizmoHelper alignment="top-right" margin={[40, 75]}>
          <GizmoViewport 
            axisColors={['#ef4444', '#10b981', '#3b82f6']} 
            labelColor="#1e293b" 
          />
        </GizmoHelper>
      </Canvas>
    </div>
  );
});
