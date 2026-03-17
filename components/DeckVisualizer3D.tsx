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
import { OrbitControls, Environment, Grid, GizmoHelper, GizmoViewport, Edges } from '@react-three/drei';
import { EffectComposer, N8AO, Bloom, ToneMapping, SMAA } from '@react-three/postprocessing';
import { DeckCalculationResult, Rostrum, Foot, TerrainConfig, Ledger } from '../types';
import { 
  COMPONENT_COLORS, 
  DECK_THICKNESS, 
  SOLE_BOARD_THICKNESS 
} from '../constants';
import { getGroundYAt } from '../utils/deckLogic';

// --- Professional CAD Materials ---

const MAT_SILVER = new THREE.MeshStandardMaterial({
  color: "#C0C0C0",
  metalness: 0.95,
  roughness: 0.2,
});

const MAT_GREY = new THREE.MeshPhysicalMaterial({
  color: "#808080",
  metalness: 0.95,
  roughness: 0.2,
});

const MAT_RED = new THREE.MeshPhysicalMaterial({
  color: "#ef4444",
  metalness: 0.8,
  roughness: 0.4,
});

const MAT_BASE_JACK = new THREE.MeshPhysicalMaterial({
  color: "#333333",
  metalness: 0.8,
  roughness: 0.6,
});

const MAT_ROSTRUM_GLASS = new THREE.MeshStandardMaterial({
  color: "#1a1a1a",
  roughness: 1.0,
  metalness: 0.0,
});

const MAT_TERRAIN = new THREE.MeshStandardMaterial({
  color: "#e5e7eb",
  roughness: 1.0,
  polygonOffset: true,
  polygonOffsetFactor: 1,
});

const MAT_SOLE_BOARD = new THREE.MeshStandardMaterial({
  color: "#d97706",
  roughness: 0.9,
});

const MAT_LEDGER_BLUE = new THREE.MeshStandardMaterial({ color: "#3b82f6", roughness: 0.3, metalness: 0.5 });
const MAT_LEDGER_GREEN = new THREE.MeshStandardMaterial({ color: "#22c55e", roughness: 0.3, metalness: 0.5 });
const MAT_LEDGER_BLACK = new THREE.MeshStandardMaterial({ color: "#1a1a1a", roughness: 0.3, metalness: 0.5 });

const _TEMP_MATRIX = new THREE.Matrix4();
const _TEMP_COLOR = new THREE.Color();
const _TEMP_VECTOR = new THREE.Vector3();
const _TEMP_QUAT = new THREE.Quaternion();

// Correct Cylinder: Radius 1, Height 1 centered. 
// So Diameter is 2. Scale by radius (0.02415) to get 48.3mm.
const CYL_GEO = new THREE.CylinderGeometry(1, 1, 1, 12);
const BOX_GEO = new THREE.BoxGeometry(1, 1, 1);

const OriginMarker: React.FC<{ terrain: TerrainConfig, dimensions: any }> = ({ terrain, dimensions }) => {
  return (
    <group position={[0, terrain.deckHeight, 0]}>
      <mesh position={[0, 0.2, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.08, 0.4, 16]} />
        <meshStandardMaterial color="#ef4444" roughness={0.3} metalness={0.2} />
      </mesh>
      <mesh position={[0, 0.45, 0]}>
        <sphereGeometry args={[0.15, 32, 32]} />
        <meshStandardMaterial color="#ef4444" roughness={0.3} metalness={0.2} />
      </mesh>
    </group>
  );
};

const TerrainMesh: React.FC<{ terrain: TerrainConfig, dimensions: any }> = ({ terrain, dimensions }) => {
  const segments = 64;
  const boundSize = 200;
  
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(boundSize, boundSize, segments, segments);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getY(i);
      const groundY = getGroundYAt(x, z, terrain, dimensions.width, dimensions.depth);
      pos.setZ(i, groundY);
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

const InfrastructureGroup: React.FC<{ feet: Foot[]; ledgers: Ledger[]; braces: any[]; layers: any }> = ({ feet, ledgers, braces, layers }) => {
  const meshStd = useRef<THREE.InstancedMesh>(null);
  const meshJack = useRef<THREE.InstancedMesh>(null);
  const meshPipe = useRef<THREE.InstancedMesh>(null);
  const meshSole = useRef<THREE.InstancedMesh>(null);
  const meshLedger = useRef<THREE.InstancedMesh>(null);
  const meshBrace = useRef<THREE.InstancedMesh>(null);
  const meshConnector = useRef<THREE.InstancedMesh>(null);

  const assembly = useMemo(() => {
    const stds: any[] = [], jacks: any[] = [], pipes: any[] = [], soles: any[] = [], ledgerInsts: any[] = [], braceInsts: any[] = [], connectors: any[] = [];
    
    const STD_RADIUS = 0.0325; // 65mm / 2

    feet.forEach(f => {
      const { x, y } = f.position;
      soles.push({ pos: [x, f.groundHeight + SOLE_BOARD_THICKNESS / 2, y] });
      
      if (f.assembly) {
        let curY = f.groundHeight + SOLE_BOARD_THICKNESS;
        
        // Basejack
        const bjH = f.assembly.basejack / 1000;
        jacks.push({ pos: [x, curY + bjH / 2, y], h: bjH });
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

    return { stds, jacks, pipes, soles, ledgers: ledgerInsts, braces: braceInsts, connectors, stdRadius: STD_RADIUS };
  }, [feet, ledgers, braces, layers.ledgers, layers.structure]);

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

    if (meshJack.current && assembly.jacks.length > 0) {
      assembly.jacks.forEach((j, i) => {
        if (i >= meshJack.current!.count) return;
        _TEMP_MATRIX.makeTranslation(j.pos[0], j.pos[1], j.pos[2]).scale(_TEMP_VECTOR.set(0.02, j.h, 0.02));
        meshJack.current!.setMatrixAt(i, _TEMP_MATRIX);
      });
      meshJack.current.instanceMatrix.needsUpdate = true;
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
        _TEMP_MATRIX.compose(new THREE.Vector3(...b.pos), b.quat, _TEMP_VECTOR.set(0.04, b.len, 0.04));
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
  }, [assembly, layers.ledgers, layers.structure]);

  return (
    <group>
      {assembly.stds.length > 0 && <instancedMesh ref={meshStd} args={[CYL_GEO, MAT_SILVER, assembly.stds.length]} castShadow />}
      {assembly.jacks.length > 0 && <instancedMesh ref={meshJack} args={[CYL_GEO, MAT_BASE_JACK, assembly.jacks.length]} castShadow />}
      {assembly.pipes.length > 0 && <instancedMesh ref={meshPipe} args={[CYL_GEO, MAT_SILVER, assembly.pipes.length]} castShadow />}
      {assembly.soles.length > 0 && <instancedMesh ref={meshSole} args={[BOX_GEO, MAT_SOLE_BOARD, assembly.soles.length]} receiveShadow />}
      {assembly.ledgers.length > 0 && <instancedMesh ref={meshLedger} args={[CYL_GEO, MAT_SILVER, assembly.ledgers.length]} castShadow />}
      {assembly.braces.length > 0 && <instancedMesh ref={meshBrace} args={[CYL_GEO, MAT_GREY, assembly.braces.length]} castShadow />}
      {assembly.connectors.length > 0 && <instancedMesh ref={meshConnector} args={[CYL_GEO, MAT_RED, assembly.connectors.length]} castShadow />}
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
      {assembly.upInsts.length > 0 && <instancedMesh ref={meshUpright} args={[BOX_GEO, MAT_SILVER, assembly.upInsts.length]} castShadow />}
      {assembly.railInsts.length > 0 && <instancedMesh ref={meshRail} args={[CYL_GEO, MAT_SILVER, assembly.railInsts.length]} castShadow />}
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
      const midElev = r.isRamp && r.startElevation !== undefined && r.endElevation !== undefined 
        ? (r.startElevation + r.endElevation) / 2 
        : terrain.deckHeight;
      const isRamp = !!r.isRamp;
      
      if (isRamp && r.slope) {
        const slopeRad = r.slope * Math.PI / 180;
        const cosVal = Math.max(0.01, Math.abs(Math.cos(slopeRad)));
        if (r.side === 'top' || r.side === 'bottom') {
          depth = depth / cosVal;
        } else {
          // For left/right, the slope is along the X axis, so width is the length
          // Wait, in calculateDecks, width is always X-diff, depth is Y-diff.
          // If side is left/right, the ramp extends along X. So width needs scaling.
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

      data.push({
        id: r.id,
        pos: [cx, midElev - DECK_THICKNESS / 2, cz],
        rot: [rotX, rotY, rotZ],
        scale: [finalWidth - 0.005, DECK_THICKNESS, finalDepth - 0.005],
        color: isRamp ? "#ff00d2" : "#00d2ff" // Original bright pink / blue
      });
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
            args={[BOX_GEO, MAT_ROSTRUM_GLASS, instances.length]} 
            castShadow 
            receiveShadow 
          />
          <lineSegments geometry={edgesGeometry}>
            <lineBasicMaterial color="#00ffff" toneMapped={false} />
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
}

export const DeckVisualizer3D: React.FC<DeckVisualizer3DProps> = ({ data, layers }) => {
  const BG_COLOR = "#080808";
  const controlsRef = useRef<any>(null);

  const setView = (view: string) => {
    if (!controlsRef.current) return;
    const controls = controlsRef.current;
    const target = new THREE.Vector3(0, data.terrain.deckHeight, 0);
    controls.target.copy(target);

    const distance = Math.max(data.dimensions.width, data.dimensions.depth) * 1.5 + 5;

    switch(view) {
      case 'iso':
        controls.object.position.set(-distance, distance, -distance);
        break;
      case 'top':
        controls.object.position.set(0, distance * 1.5, 0);
        break;
      case 'bottom':
        controls.object.position.set(0, -distance * 1.5, 0);
        break;
      case 'left':
        controls.object.position.set(-distance, data.terrain.deckHeight, 0);
        break;
      case 'right':
        controls.object.position.set(distance, data.terrain.deckHeight, 0);
        break;
      case 'front':
        controls.object.position.set(0, data.terrain.deckHeight, distance);
        break;
      case 'back':
        controls.object.position.set(0, data.terrain.deckHeight, -distance);
        break;
    }
    controls.update();
  };

  const initialDistance = Math.max(data.dimensions.width, data.dimensions.depth) * 1.5 + 5;

  return (
    <div className="w-full h-full bg-[#080808] overflow-hidden relative">
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2 bg-black/50 p-2 rounded-lg backdrop-blur-sm border border-white/10">
        <div className="text-xs text-white/50 uppercase tracking-wider font-semibold mb-1 text-center">Views</div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setView('iso')} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs rounded transition-colors col-span-2">Isometric</button>
          <button onClick={() => setView('top')} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs rounded transition-colors">Top</button>
          <button onClick={() => setView('bottom')} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs rounded transition-colors">Bottom</button>
          <button onClick={() => setView('left')} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs rounded transition-colors">Left</button>
          <button onClick={() => setView('right')} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs rounded transition-colors">Right</button>
          <button onClick={() => setView('front')} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs rounded transition-colors">Front</button>
          <button onClick={() => setView('back')} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs rounded transition-colors">Back</button>
        </div>
      </div>

      <Canvas 
        shadows 
        dpr={[1, 2]} 
        camera={{ position: [-initialDistance, initialDistance, -initialDistance], fov: 30 }}
        gl={{ 
          antialias: false,
          powerPreference: "high-performance" 
        }}
      >
        <color attach="background" args={[BG_COLOR]} />
        <ambientLight intensity={0.4} />
        <directionalLight 
          position={[50, 80, 50]} 
          intensity={2.5} 
          castShadow 
          shadow-mapSize={[2048, 2048]}
          shadow-camera-left={-30}
          shadow-camera-right={30}
          shadow-camera-top={30}
          shadow-camera-bottom={-30}
        />
        <Environment preset="night" />
        
        <group>
          <OriginMarker terrain={data.terrain} dimensions={data.dimensions} />
          
          {layers.terrain && <TerrainMesh terrain={data.terrain} dimensions={data.dimensions} />}
          {!layers.terrain && (
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
              <planeGeometry args={[150, 150]} />
              <meshStandardMaterial color="#e5e7eb" roughness={1.0} />
            </mesh>
          )}
          
          {layers.structure && <InfrastructureGroup feet={data.feet} ledgers={data.ledgers} braces={data.braces} layers={layers} />}
          
          {layers.structure && <HandrailGroup uprights={data.uprights} handrails={data.handrails} />}
          
          {layers.rostrums && <RostrumGroup rostrums={data.rostrums} terrain={data.terrain} />}
        </group>

        <OrbitControls 
          ref={controlsRef}
          makeDefault 
          dampingFactor={0.1} 
          minDistance={5} 
          maxDistance={150} 
          target={[0, data.terrain.deckHeight, 0]}
        />
        
        <GizmoHelper alignment="bottom-right" margin={[120, 40]}>
          <GizmoViewport axisColors={['#ff4d4d', '#4dff4d', '#4d4dff']} labelColor="white" />
        </GizmoHelper>

        <EffectComposer disableNormalPass multisampling={0}>
          <N8AO aoRadius={0.5} intensity={1.5} color="#000000" />
          <Bloom luminanceThreshold={1.2} mipmapBlur intensity={0.5} />
          <SMAA />
          <ToneMapping />
        </EffectComposer>
      </Canvas>
    </div>
  );
};
