"use client";

/**
 * Caixa de direção hidráulica integral de esferas recirculantes — modelo
 * paramétrico. Usado enquanto um GLB profissional não é fornecido
 * (NEXT_PUBLIC_HERO_GEAR_MODEL). Ver docs/MODELOS-3D.md.
 *
 * Eixos: X = eixo do sem-fim/pistão · Z = eixo setor · Y = para cima.
 * A vista explodida segue a ordem real de desmontagem:
 *   braço Pitman → retentor do setor → tampa lateral → eixo setor →
 *   tampa traseira → pistão-cremalheira → corpo da válvula →
 *   válvula rotativa/eixo de entrada → sem-fim com esferas.
 * A remontagem é exatamente o caminho inverso.
 */

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, type ReactNode, type RefObject } from "react";
import * as THREE from "three";
import { explodeAmount, highlightAmount, smoother } from "../timeline";

type Axis = "x" | "y" | "z";
type V3 = [number, number, number];

const AXIS_ROT: Record<Axis, V3> = {
  x: [0, 0, -Math.PI / 2],
  y: [0, 0, 0],
  z: [Math.PI / 2, 0, 0],
};

const RING_ROT: Record<Axis, V3> = {
  x: [0, Math.PI / 2, 0],
  y: [Math.PI / 2, 0, 0],
  z: [0, 0, 0],
};

/* ------------------------------------------------------------------ */
/* Materiais                                                           */
/* ------------------------------------------------------------------ */

export function useGearMaterials() {
  return useMemo(() => {
    const cast = new THREE.MeshPhysicalMaterial({
      color: "#3a3d43",
      metalness: 0.6,
      roughness: 0.42,
      clearcoat: 0.35,
      clearcoatRoughness: 0.5,
      emissive: new THREE.Color("#f47712"),
      emissiveIntensity: 0,
    });
    const machined = new THREE.MeshPhysicalMaterial({
      color: "#b4b8be",
      metalness: 1,
      roughness: 0.26,
      emissive: new THREE.Color("#f47712"),
      emissiveIntensity: 0,
    });
    const steel = new THREE.MeshPhysicalMaterial({
      color: "#d2d6db",
      metalness: 1,
      roughness: 0.16,
      emissive: new THREE.Color("#f47712"),
      emissiveIntensity: 0,
    });
    const hardened = new THREE.MeshPhysicalMaterial({ color: "#7e8187", metalness: 1, roughness: 0.32 });
    const zinc = new THREE.MeshPhysicalMaterial({ color: "#c9ae6b", metalness: 1, roughness: 0.3 });
    const rubber = new THREE.MeshStandardMaterial({ color: "#121212", metalness: 0, roughness: 0.85 });
    const viton = new THREE.MeshStandardMaterial({ color: "#4a2410", metalness: 0, roughness: 0.7 });
    const hole = new THREE.MeshStandardMaterial({ color: "#050505", metalness: 0.2, roughness: 0.9 });
    const balls = new THREE.MeshPhysicalMaterial({ color: "#eef1f4", metalness: 1, roughness: 0.08 });
    return { cast, machined, steel, hardened, zinc, rubber, viton, hole, balls };
  }, []);
}

type Mats = ReturnType<typeof useGearMaterials>;

/* ------------------------------------------------------------------ */
/* Primitivas                                                          */
/* ------------------------------------------------------------------ */

interface PrimProps {
  axis?: Axis;
  pos?: V3;
  mat: THREE.Material;
  seg?: number;
}

function Cyl({ axis = "y", pos = [0, 0, 0], r, rTop, len, mat, seg = 48 }: PrimProps & { r: number; rTop?: number; len: number }) {
  return (
    <mesh position={pos} rotation={AXIS_ROT[axis]} material={mat} castShadow receiveShadow>
      <cylinderGeometry args={[rTop ?? r, r, len, seg]} />
    </mesh>
  );
}

function Ring({ axis = "z", pos = [0, 0, 0], r, tube, mat }: PrimProps & { r: number; tube: number }) {
  return (
    <mesh position={pos} rotation={RING_ROT[axis]} material={mat} castShadow>
      <torusGeometry args={[r, tube, 14, 56]} />
    </mesh>
  );
}

/** Parafusos sextavados distribuídos em círculo numa face. */
function BoltCircle({
  axis,
  center,
  radius,
  count,
  mat,
  head = 0.075,
  height = 0.07,
  phase = 0,
}: {
  axis: Axis;
  center: V3;
  radius: number;
  count: number;
  mat: THREE.Material;
  head?: number;
  height?: number;
  phase?: number;
}) {
  const items = Array.from({ length: count }, (_, i) => {
    const a = phase + (i / count) * Math.PI * 2;
    const u = Math.cos(a) * radius;
    const v = Math.sin(a) * radius;
    const p: V3 =
      axis === "x" ? [center[0], center[1] + u, center[2] + v] : axis === "y" ? [center[0] + u, center[1], center[2] + v] : [center[0] + u, center[1] + v, center[2]];
    return p;
  });
  return (
    <>
      {items.map((p, i) => (
        <Cyl key={i} axis={axis} pos={p} r={head} len={height} seg={6} mat={mat} />
      ))}
    </>
  );
}

class Helix extends THREE.Curve<THREE.Vector3> {
  constructor(
    private radius: number,
    private length: number,
    private turns: number,
  ) {
    super();
  }
  getPoint(t: number, target = new THREE.Vector3()) {
    const a = t * this.turns * Math.PI * 2;
    return target.set(t * this.length - this.length / 2, Math.cos(a) * this.radius, Math.sin(a) * this.radius);
  }
}

/** Perfil do setor dentado (no plano XY, extrudado em Z). */
function sectorShape() {
  const shape = new THREE.Shape();
  const root = 0.42;
  const tip = 0.57;
  const teeth = [-120, -90, -60].map((d) => (d * Math.PI) / 180);
  const halfRoot = (8 * Math.PI) / 180;
  const halfTip = (4.5 * Math.PI) / 180;
  const a0 = (-148 * Math.PI) / 180;
  const a1 = (-32 * Math.PI) / 180;
  const pts: THREE.Vector2[] = [];
  const steps = 160;
  for (let i = 0; i <= steps; i++) {
    const a = a0 + ((a1 - a0) * i) / steps;
    let r = root;
    for (const t of teeth) {
      const d = Math.abs(a - t);
      if (d < halfTip) r = tip;
      else if (d < halfRoot) r = Math.max(r, tip - ((d - halfTip) / (halfRoot - halfTip)) * (tip - root));
    }
    pts.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r));
  }
  shape.moveTo(Math.cos(a0) * 0.2, Math.sin(a0) * 0.2);
  pts.forEach((p) => shape.lineTo(p.x, p.y));
  shape.lineTo(Math.cos(a1) * 0.2, Math.sin(a1) * 0.2);
  shape.absarc(0, 0, 0.2, a1, a0 + Math.PI * 2, false);
  return shape;
}

/** Perfil dos dentes da cremalheira do pistão (plano XY, extrudado em Z). */
function rackShape() {
  const shape = new THREE.Shape();
  const base = 0;
  const top = 0.15;
  const xs = [-0.34, -0.11, 0.11, 0.34];
  shape.moveTo(-0.5, base);
  for (const x of xs) {
    shape.lineTo(x - 0.075, base);
    shape.lineTo(x - 0.04, top);
    shape.lineTo(x + 0.04, top);
    shape.lineTo(x + 0.075, base);
  }
  shape.lineTo(0.5, base);
  shape.lineTo(0.5, -0.12);
  shape.lineTo(-0.5, -0.12);
  shape.closePath();
  return shape;
}

/** Braço Pitman: cônico, no plano XY, extrudado em Z. */
function pitmanShape() {
  const s = new THREE.Shape();
  s.moveTo(-0.22, 0);
  s.lineTo(0.22, 0);
  s.lineTo(0.13, -1.65);
  s.lineTo(-0.13, -1.65);
  s.closePath();
  return s;
}

/* ------------------------------------------------------------------ */
/* Peças                                                               */
/* ------------------------------------------------------------------ */

const SECTOR_C: [number, number] = [0.25, 1.0];

function Housing({ m }: { m: Mats }) {
  return (
    <group>
      {/* cilindro do pistão */}
      <Cyl axis="x" pos={[0.025, 0, 0]} r={0.62} len={2.95} mat={m.cast} seg={64} />
      <Cyl axis="x" pos={[-1.4, 0, 0]} r={0.69} len={0.12} mat={m.machined} seg={64} />
      <Cyl axis="x" pos={[1.47, 0, 0]} r={0.66} len={0.08} mat={m.machined} seg={64} />
      {/* alojamento do setor */}
      <Cyl axis="z" pos={[SECTOR_C[0], 0.95, 0]} r={0.72} len={1.2} mat={m.cast} seg={64} />
      <Cyl axis="z" pos={[SECTOR_C[0], SECTOR_C[1], 0.585]} r={0.76} len={0.05} mat={m.machined} seg={64} />
      {/* ressalto traseiro por onde sai o eixo setor */}
      <Cyl axis="z" pos={[SECTOR_C[0], SECTOR_C[1], -0.67]} r={0.36} len={0.14} mat={m.machined} />
      {/* nervuras de fundição */}
      {[-0.95, -0.35].map((x) => (
        <mesh key={x} position={[x, 0.52, 0]} material={m.cast} castShadow>
          <boxGeometry args={[0.08, 0.36, 0.9]} />
        </mesh>
      ))}
      {/* pés de fixação no chassi */}
      {[-0.95, 0.95].map((x) => (
        <group key={x}>
          <mesh position={[x, -0.6, 0]} material={m.cast} castShadow receiveShadow>
            <boxGeometry args={[0.5, 0.2, 1.15]} />
          </mesh>
          {[-0.4, 0.4].map((z) => (
            <Cyl key={z} axis="y" pos={[x, -0.6, z]} r={0.075} len={0.21} mat={m.hole} seg={20} />
          ))}
        </group>
      ))}
      {/* bujão de sangria */}
      <Cyl axis="y" pos={[-0.7, 0.66, 0.2]} r={0.06} len={0.1} seg={6} mat={m.zinc} />
    </group>
  );
}

function EndCover({ m }: { m: Mats }) {
  return (
    <group>
      <Cyl axis="x" pos={[-1.53, 0, 0]} r={0.66} len={0.1} mat={m.machined} seg={64} />
      <Cyl axis="x" pos={[-1.6, 0, 0]} r={0.18} len={0.06} mat={m.hardened} seg={32} />
      <BoltCircle axis="x" center={[-1.61, 0, 0]} radius={0.52} count={6} mat={m.hardened} phase={Math.PI / 6} />
    </group>
  );
}

function Piston({ m }: { m: Mats }) {
  const rack = useMemo(() => new THREE.ExtrudeGeometry(rackShape(), { depth: 0.38, bevelEnabled: false }), []);
  const ballGuide = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.75, 0.2, 0.42),
      new THREE.Vector3(-0.6, 0.42, 0.52),
      new THREE.Vector3(-0.2, 0.46, 0.55),
      new THREE.Vector3(0.2, 0.42, 0.52),
      new THREE.Vector3(0.35, 0.2, 0.42),
    ]);
    return new THREE.TubeGeometry(curve, 40, 0.05, 10, false);
  }, []);
  return (
    <group>
      <Cyl axis="x" pos={[-0.15, 0, 0]} r={0.52} len={1.5} mat={m.steel} seg={64} />
      <Ring axis="x" pos={[-0.78, 0, 0]} r={0.52} tube={0.028} mat={m.viton} />
      <Ring axis="x" pos={[-0.66, 0, 0]} r={0.52} tube={0.022} mat={m.rubber} />
      {/* base plana da cremalheira */}
      <mesh position={[SECTOR_C[0], 0.4, 0]} material={m.machined} castShadow>
        <boxGeometry args={[0.95, 0.12, 0.38]} />
      </mesh>
      <mesh geometry={rack} position={[SECTOR_C[0], 0.44, -0.19]} material={m.steel} castShadow />
      <mesh geometry={ballGuide} material={m.machined} castShadow />
    </group>
  );
}

function Worm({ m }: { m: Mats }) {
  const groove = useMemo(() => new THREE.TubeGeometry(new Helix(0.19, 1.5, 11), 600, 0.032, 8, false), []);
  return (
    <group>
      <Cyl axis="x" pos={[0.25, 0, 0]} r={0.18} len={2.2} mat={m.steel} seg={40} />
      <mesh geometry={groove} position={[-0.15, 0, 0]} material={m.hardened} castShadow />
      <Cyl axis="x" pos={[1.25, 0, 0]} r={0.22} len={0.2} mat={m.machined} seg={40} />
    </group>
  );
}

function Balls({ m, count = 26 }: { m: Mats; count?: number }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const helix = useMemo(() => new Helix(0.25, 1.1, 3.2), []);
  useFrame(() => {
    const mesh = ref.current;
    if (!mesh || mesh.userData.ready) return;
    const tmp = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      helix.getPoint(i / (count - 1), tmp.position);
      tmp.position.x -= 0.2;
      tmp.updateMatrix();
      mesh.setMatrixAt(i, tmp.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.userData.ready = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} material={m.balls} castShadow>
      <sphereGeometry args={[0.042, 16, 12]} />
    </instancedMesh>
  );
}

function RotaryValve({ m }: { m: Mats }) {
  return (
    <group>
      <Cyl axis="x" pos={[1.75, 0, 0]} r={0.3} len={0.6} mat={m.steel} seg={48} />
      {[1.55, 1.7, 1.85].map((x) => (
        <Ring key={x} axis="x" pos={[x, 0, 0]} r={0.3} tube={0.018} mat={m.viton} />
      ))}
      {/* eixo de entrada (barra de torção no interior) */}
      <Cyl axis="x" pos={[2.5, 0, 0]} r={0.12} len={0.95} mat={m.steel} seg={32} />
      {/* estrias de acoplamento com a coluna */}
      <Cyl axis="x" pos={[2.86, 0, 0]} r={0.135} len={0.28} mat={m.hardened} seg={18} />
    </group>
  );
}

function ValveHousing({ m }: { m: Mats }) {
  return (
    <group>
      <Cyl axis="x" pos={[1.875, 0, 0]} r={0.5} len={0.75} mat={m.cast} seg={56} />
      <Cyl axis="x" pos={[1.54, 0, 0]} r={0.64} len={0.08} mat={m.machined} seg={56} />
      <BoltCircle axis="x" center={[1.6, 0, 0]} radius={0.57} count={4} mat={m.hardened} phase={Math.PI / 4} />
      <Cyl axis="x" pos={[2.27, 0, 0]} r={0.2} len={0.06} mat={m.machined} />
      {/* conexões de pressão e retorno */}
      {[1.72, 2.04].map((x, i) => (
        <group key={x}>
          <Cyl axis="y" pos={[x, 0.5, 0]} r={0.11} len={0.14} mat={m.cast} seg={24} />
          <Cyl axis="y" pos={[x, 0.63, 0]} r={0.1} len={0.12} seg={6} mat={m.zinc} />
          <Cyl axis="y" pos={[x, 0.72, 0]} r={0.065} len={0.08} mat={i ? m.zinc : m.machined} seg={20} />
        </group>
      ))}
    </group>
  );
}

function SideCover({ m }: { m: Mats }) {
  return (
    <group>
      <Cyl axis="z" pos={[SECTOR_C[0], SECTOR_C[1], 0.67]} r={0.74} len={0.12} mat={m.cast} seg={64} />
      <BoltCircle axis="z" center={[SECTOR_C[0], SECTOR_C[1], 0.76]} radius={0.6} count={6} mat={m.hardened} phase={Math.PI / 6} />
      <Cyl axis="z" pos={[SECTOR_C[0], SECTOR_C[1], 0.76]} r={0.2} len={0.08} mat={m.machined} />
    </group>
  );
}

function AdjustScrew({ m }: { m: Mats }) {
  return (
    <group>
      <Cyl axis="z" pos={[SECTOR_C[0], SECTOR_C[1], 0.92]} r={0.05} len={0.42} mat={m.steel} seg={20} />
      <Cyl axis="z" pos={[SECTOR_C[0], SECTOR_C[1], 0.86]} r={0.11} len={0.09} seg={6} mat={m.hardened} />
    </group>
  );
}

function SectorShaft({ m }: { m: Mats }) {
  const sector = useMemo(() => new THREE.ExtrudeGeometry(sectorShape(), { depth: 0.5, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 2 }), []);
  return (
    <group>
      <Cyl axis="z" pos={[SECTOR_C[0], SECTOR_C[1], -0.3]} r={0.22} len={1.7} mat={m.steel} seg={40} />
      <mesh geometry={sector} position={[SECTOR_C[0], SECTOR_C[1], -0.25]} material={m.steel} castShadow />
      <Cyl axis="z" pos={[SECTOR_C[0], SECTOR_C[1], -1.0]} r={0.24} len={0.3} mat={m.hardened} seg={22} />
    </group>
  );
}

function PitmanArm({ m }: { m: Mats }) {
  const arm = useMemo(() => new THREE.ExtrudeGeometry(pitmanShape(), { depth: 0.16, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 3 }), []);
  return (
    <group position={[SECTOR_C[0], SECTOR_C[1], -1.0]}>
      <Cyl axis="z" pos={[0, 0, 0]} r={0.3} len={0.22} mat={m.cast} />
      <mesh geometry={arm} position={[0, 0, -0.08]} material={m.cast} castShadow />
      <mesh position={[0, -1.58, 0.16]} material={m.steel} castShadow>
        <sphereGeometry args={[0.13, 24, 18]} />
      </mesh>
      <Cyl axis="z" pos={[0, -1.58, 0.3]} r={0.07} rTop={0.05} len={0.22} mat={m.steel} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Montagem + vista explodida                                          */
/* ------------------------------------------------------------------ */

interface PartDef {
  id: string;
  dir: V3;
  delay: number;
  label?: string;
  anchor?: V3;
  render: (m: Mats) => ReactNode;
}

const SPAN = 0.32;

export const GEAR_PARTS: PartDef[] = [
  { id: "housing", dir: [0, 0, 0], delay: 0, label: "Carcaça", anchor: [-0.55, 0.75, 0.5], render: (m) => <Housing m={m} /> },
  { id: "pitman", dir: [0, -0.15, -1.7], delay: 0, label: "Braço Pitman", anchor: [0.25, -0.4, -1.0], render: (m) => <PitmanArm m={m} /> },
  {
    id: "sectorSeal",
    dir: [0, 0, -0.95],
    delay: 0.04,
    label: "Retentor do eixo setor",
    anchor: [0.25, 1.32, -0.72],
    render: (m) => <Ring axis="z" pos={[SECTOR_C[0], SECTOR_C[1], -0.75]} r={0.25} tube={0.045} mat={m.rubber} />,
  },
  { id: "screw", dir: [0, 0, 3.7], delay: 0.08, render: (m) => <AdjustScrew m={m} /> },
  { id: "sideCover", dir: [0, 0, 3.0], delay: 0.1, label: "Tampa lateral", anchor: [0.25, 1.78, 0.7], render: (m) => <SideCover m={m} /> },
  {
    id: "sideRing",
    dir: [0, 0, 2.4],
    delay: 0.13,
    render: (m) => <Ring axis="z" pos={[SECTOR_C[0], SECTOR_C[1], 0.6]} r={0.66} tube={0.03} mat={m.viton} />,
  },
  { id: "sector", dir: [0, 0, 1.95], delay: 0.17, label: "Eixo setor", anchor: [0.25, 1.27, 0.3], render: (m) => <SectorShaft m={m} /> },
  { id: "endCover", dir: [-2.5, 0, 0], delay: 0.28, label: "Tampa traseira", anchor: [-1.55, 0.72, 0], render: (m) => <EndCover m={m} /> },
  {
    id: "endRing",
    dir: [-2.05, 0, 0],
    delay: 0.31,
    label: "Vedações (O-rings)",
    anchor: [-1.45, -0.72, 0],
    render: (m) => <Ring axis="x" pos={[-1.45, 0, 0]} r={0.58} tube={0.03} mat={m.viton} />,
  },
  { id: "piston", dir: [-1.85, 0, 0], delay: 0.36, label: "Pistão-cremalheira", anchor: [-0.3, 0.68, 0], render: (m) => <Piston m={m} /> },
  { id: "valveHousing", dir: [3.75, 0, 0], delay: 0.46, label: "Corpo da válvula · pressão e retorno", anchor: [1.9, 0.98, 0], render: (m) => <ValveHousing m={m} /> },
  {
    id: "inputSeal",
    dir: [4.15, 0, 0],
    delay: 0.48,
    render: (m) => <Ring axis="x" pos={[2.31, 0, 0]} r={0.15} tube={0.035} mat={m.rubber} />,
  },
  { id: "valve", dir: [2.75, 0, 0], delay: 0.54, label: "Eixo de entrada e válvula rotativa", anchor: [2.3, 0.42, 0], render: (m) => <RotaryValve m={m} /> },
  { id: "worm", dir: [1.95, 0, 0], delay: 0.62, label: "Sem-fim de esferas recirculantes", anchor: [0.3, 0.38, 0], render: (m) => <><Worm m={m} /><Balls m={m} /></> },
];

export function partProgress(explode: number, delay: number) {
  return smoother(Math.min(1, Math.max(0, (explode - delay) / SPAN)) );
}

/** Peças em movimento, registradas para a camada de etiquetas. */
export type PartRegistry = Record<string, THREE.Object3D | null>;

export function SteeringGear({
  progress,
  spread = 1,
  registry,
}: {
  progress: RefObject<number>;
  spread?: number;
  registry?: RefObject<PartRegistry>;
}) {
  const m = useGearMaterials();
  const groups = useRef<PartRegistry>({});

  useFrame(() => {
    const p = progress.current ?? 0;
    const e = explodeAmount(p);
    const h = highlightAmount(p);
    for (const part of GEAR_PARTS) {
      const g = groups.current[part.id];
      if (!g) continue;
      const t = partProgress(e, part.delay);
      g.position.set(part.dir[0] * t * spread, part.dir[1] * t * spread, part.dir[2] * t * spread);
    }
    const glow = 0.022 * h;
    m.cast.emissiveIntensity = glow;
    m.machined.emissiveIntensity = glow * 0.5;
    m.steel.emissiveIntensity = glow * 0.25;
  });

  return (
    <group>
      {GEAR_PARTS.map((part) => (
        <group
          key={part.id}
          ref={(g) => {
            groups.current[part.id] = g;
            if (registry?.current) registry.current[part.id] = g;
          }}
        >
          {part.render(m)}
        </group>
      ))}
    </group>
  );
}
