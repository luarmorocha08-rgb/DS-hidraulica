"use client";

/**
 * Cavalo mecânico cara-chata (cabine basculante) modelado proceduralmente.
 * Unidades ≈ metros · frente em +Z · Y para cima · rodas em y = 0.
 * Lado esquerdo (motorista) = +X, onde fica a caixa de direção, presa por
 * fora da longarina, à frente do eixo dianteiro — como nos caminhões reais.
 *
 * Um GLB profissional (NEXT_PUBLIC_HERO_TRUCK_MODEL) substitui este modelo.
 */

import { RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { cabLiftAmount, highlightAmount, ramp, STAGE } from "../timeline";
import type { TruckInfo } from "../models";

type V3 = [number, number, number];

/** Dobradiça da cabine (frente, embaixo). */
const HINGE: V3 = [0, 1.34, 2.92];
/** Suporte da caixa de direção na longarina esquerda. */
export const GEAR_MOUNT: V3 = [0.69, 1.0, 2.5];
export const GEAR_MOUNT_SCALE = 0.15;
const FRONT_AXLE_Z = 2.05;
const REAR_AXLE_Z = -1.75;
const WHEEL_R = 0.53;

function useTruckMaterials() {
  return useMemo(() => {
    const paint = new THREE.MeshPhysicalMaterial({ color: "#5b6068", metalness: 0.75, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.6 });
    const accent = new THREE.MeshPhysicalMaterial({ color: "#f47712", metalness: 0.4, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.1 });
    const silver = new THREE.MeshPhysicalMaterial({ color: "#c5c7c9", metalness: 0.9, roughness: 0.25, clearcoat: 0.6 });
    const chrome = new THREE.MeshPhysicalMaterial({ color: "#e9ecef", metalness: 1, roughness: 0.06 });
    const plastic = new THREE.MeshStandardMaterial({ color: "#0d0e10", metalness: 0.2, roughness: 0.6 });
    const chassis = new THREE.MeshStandardMaterial({ color: "#16171a", metalness: 0.55, roughness: 0.55 });
    const engine = new THREE.MeshStandardMaterial({ color: "#2b2d31", metalness: 0.7, roughness: 0.42 });
    const rubber = new THREE.MeshStandardMaterial({ color: "#0b0b0c", metalness: 0, roughness: 0.92 });
    const rim = new THREE.MeshPhysicalMaterial({ color: "#a9adb3", metalness: 0.95, roughness: 0.22 });
    const aluminium = new THREE.MeshPhysicalMaterial({ color: "#d9dce0", metalness: 1, roughness: 0.18 });
    const glass = new THREE.MeshPhysicalMaterial({ color: "#0a0d12", metalness: 0.9, roughness: 0.04, clearcoat: 1, transparent: true, opacity: 0.92 });
    const headlight = new THREE.MeshStandardMaterial({ color: "#fff6e6", emissive: new THREE.Color("#fff1d6"), emissiveIntensity: 0, roughness: 0.1 });
    const drl = new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: new THREE.Color("#ffffff"), emissiveIntensity: 0 });
    const tail = new THREE.MeshStandardMaterial({ color: "#5a0b0b", emissive: new THREE.Color("#ff2a1a"), emissiveIntensity: 0 });
    const marker = new THREE.MeshStandardMaterial({ color: "#7a3a00", emissive: new THREE.Color("#ff8a1f"), emissiveIntensity: 0 });
    return { paint, accent, silver, chrome, plastic, chassis, engine, rubber, rim, aluminium, glass, headlight, drl, tail, marker };
  }, []);
}

type Mats = ReturnType<typeof useTruckMaterials>;

function Box({ size, pos, mat, rot }: { size: V3; pos: V3; mat: THREE.Material; rot?: V3 }) {
  return (
    <mesh position={pos} rotation={rot} material={mat} castShadow receiveShadow>
      <boxGeometry args={size} />
    </mesh>
  );
}

function Cyl({ r, len, pos, mat, axis = "x", seg = 32, rTop }: { r: number; len: number; pos: V3; mat: THREE.Material; axis?: "x" | "y" | "z"; seg?: number; rTop?: number }) {
  const rot: V3 = axis === "x" ? [0, 0, Math.PI / 2] : axis === "z" ? [Math.PI / 2, 0, 0] : [0, 0, 0];
  return (
    <mesh position={pos} rotation={rot} material={mat} castShadow receiveShadow>
      <cylinderGeometry args={[rTop ?? r, r, len, seg]} />
    </mesh>
  );
}

/** Barra entre dois pontos (barra de direção, coluna, tubulações). */
function Rod({ from, to, r, mat }: { from: V3; to: V3; r: number; mat: THREE.Material }) {
  const { pos, quat, len } = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const dir = b.clone().sub(a);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    return { pos: a.add(b).multiplyScalar(0.5), quat: q, len: dir.length() };
  }, [from, to]);
  return (
    <mesh position={pos} quaternion={quat} material={mat} castShadow>
      <cylinderGeometry args={[r, r, len, 12]} />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/* Rodas                                                               */
/* ------------------------------------------------------------------ */

function useTireGeometry() {
  return useMemo(() => {
    // perfil arredondado do pneu girado em torno do eixo (Y → depois X)
    const pts: THREE.Vector2[] = [];
    const inner = 0.31;
    const outer = WHEEL_R;
    const half = 0.155;
    const bulge = 0.05;
    const steps = 10;
    pts.push(new THREE.Vector2(inner, -half));
    for (let i = 0; i <= steps; i++) {
      const a = -Math.PI / 2 + (i / steps) * Math.PI;
      pts.push(new THREE.Vector2(outer - bulge + Math.cos(a) * bulge, Math.sin(a) * half));
    }
    pts.push(new THREE.Vector2(inner, half));
    const g = new THREE.LatheGeometry(pts, 48);
    g.rotateZ(Math.PI / 2);
    return g;
  }, []);
}

function Wheel({ m, tire, side, dual = false }: { m: Mats; tire: THREE.BufferGeometry; side: 1 | -1; dual?: boolean }) {
  const nuts = useMemo(
    () =>
      Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2;
        return [Math.cos(a) * 0.17, Math.sin(a) * 0.17] as const;
      }),
    [],
  );
  const face = side * 0.13;
  return (
    <group>
      <mesh geometry={tire} material={m.rubber} castShadow receiveShadow />
      {/* aro */}
      <Cyl r={0.31} len={0.27} pos={[0, 0, 0]} mat={m.rim} seg={40} />
      <Cyl r={0.27} len={0.02} pos={[face, 0, 0]} mat={m.chassis} seg={40} />
      {!dual && (
        <>
          {/* cubo e porcas */}
          <Cyl r={0.13} rTop={0.1} len={0.12} pos={[face + side * 0.06, 0, 0]} mat={m.chrome} seg={24} />
          {nuts.map(([y, z], i) => (
            <Cyl key={i} r={0.022} len={0.05} pos={[face + side * 0.03, y, z]} mat={m.chrome} seg={6} />
          ))}
          {/* furos de ventilação do aro */}
          {Array.from({ length: 8 }, (_, i) => {
            const a = (i / 8) * Math.PI * 2 + 0.2;
            return <Cyl key={`h${i}`} r={0.04} len={0.03} pos={[face + side * 0.005, Math.cos(a) * 0.235, Math.sin(a) * 0.235]} mat={m.plastic} seg={12} />;
          })}
        </>
      )}
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Cabine                                                              */
/* ------------------------------------------------------------------ */

function Cab({ m }: { m: Mats }) {
  // coordenadas relativas à dobradiça
  const spoiler = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-2.1, 0); // z (traseira), y
    s.lineTo(-0.2, 0);
    s.quadraticCurveTo(-0.55, 0.42, -1.2, 0.52);
    s.lineTo(-2.1, 0.56);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 2.28, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.04, bevelSegments: 3 });
    g.translate(0, 0, -1.14);
    g.rotateY(-Math.PI / 2); // perfil no plano ZY
    return g;
  }, []);
  const cabY = 1.12; // centro vertical (relativo à dobradiça)
  const cabZ = -1.12;
  return (
    <group>
      {/* casco */}
      <RoundedBox args={[2.46, 2.24, 2.22]} radius={0.16} smoothness={4} position={[0, cabY, cabZ]} material={m.paint} castShadow receiveShadow />
      {/* defletor de teto */}
      <mesh geometry={spoiler} position={[0, 2.22, 0]} material={m.paint} castShadow />
      {/* para-brisa e moldura */}
      <Box size={[2.2, 0.9, 0.05]} pos={[0, 1.66, -0.0]} mat={m.plastic} rot={[-0.07, 0, 0]} />
      <Box size={[2.08, 0.8, 0.05]} pos={[0, 1.66, 0.025]} mat={m.glass} rot={[-0.07, 0, 0]} />
      {/* quebra-sol */}
      <Box size={[2.3, 0.1, 0.32]} pos={[0, 2.14, 0.08]} mat={m.plastic} />
      {[-0.9, -0.3, 0.3, 0.9].map((x) => (
        <Box key={x} size={[0.1, 0.06, 0.06]} pos={[x, 2.22, 0.06]} mat={m.marker} />
      ))}
      {/* grade frontal com frisos */}
      <Box size={[1.76, 0.82, 0.05]} pos={[0, 0.66, 0.0]} mat={m.plastic} />
      {[0.38, 0.54, 0.7, 0.86, 1.0].map((y) => (
        <Box key={y} size={[1.66, 0.045, 0.04]} pos={[0, y, 0.035]} mat={m.chrome} />
      ))}
      {/* emblema laranja */}
      <RoundedBox args={[0.52, 0.18, 0.04]} radius={0.03} position={[0, 1.2, 0.03]} material={m.accent} />
      {/* faixa laranja frontal e laterais (identidade DS) */}
      <Box size={[2.3, 0.07, 0.03]} pos={[0, 0.2, 0.0]} mat={m.accent} />
      {[1, -1].map((side) => (
        <group key={side}>
          <Box size={[0.03, 0.09, 2.0]} pos={[side * 1.235, 0.5, cabZ]} mat={m.accent} />
          {/* janela lateral */}
          <Box size={[0.03, 0.62, 0.95]} pos={[side * 1.235, 1.62, -0.62]} mat={m.glass} />
          {/* linha da porta */}
          <Box size={[0.025, 1.6, 0.02]} pos={[side * 1.236, 0.95, -1.15]} mat={m.plastic} />
          <Box size={[0.03, 0.04, 0.2]} pos={[side * 1.24, 1.08, -0.92]} mat={m.chrome} />
          {/* retrovisores */}
          <Box size={[0.3, 0.04, 0.04]} pos={[side * 1.36, 1.78, -0.12]} mat={m.plastic} />
          <RoundedBox args={[0.12, 0.62, 0.26]} radius={0.04} position={[side * 1.55, 1.55, -0.12]} material={m.paint} castShadow />
          <Box size={[0.02, 0.54, 0.2]} pos={[side * 1.49, 1.55, -0.12]} mat={m.chrome} />
          {/* lanterna lateral */}
          <Box size={[0.03, 0.05, 0.12]} pos={[side * 1.24, 0.3, -0.25]} mat={m.marker} />
        </group>
      ))}
      {/* interior escuro visível pelos vidros */}
      <Box size={[2.3, 1.0, 1.9]} pos={[0, 1.3, cabZ]} mat={m.plastic} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Chassi                                                              */
/* ------------------------------------------------------------------ */

function Chassis({ m, tire, frontWheels }: { m: Mats; tire: THREE.BufferGeometry; frontWheels: RefObject<Array<THREE.Group | null>> }) {
  const railLen = 6.5;
  const railZ = -0.3;
  const pitmanEnd: V3 = [GEAR_MOUNT[0] + 0.13, GEAR_MOUNT[1] - 0.09, GEAR_MOUNT[2] + 0.04];
  return (
    <group>
      {/* longarinas e travessas */}
      {[1, -1].map((s) => (
        <Box key={s} size={[0.12, 0.3, railLen]} pos={[s * 0.48, 0.95, railZ]} mat={m.chassis} />
      ))}
      {[2.65, 1.1, -0.4, -2.0, -3.4].map((z) => (
        <Box key={z} size={[0.84, 0.18, 0.12]} pos={[0, 0.95, z]} mat={m.chassis} />
      ))}

      {/* para-choque com faróis (fica no chassi quando a cabine bascula) */}
      <RoundedBox args={[2.5, 0.42, 0.34]} radius={0.06} position={[0, 1.08, 3.0]} material={m.paint} castShadow />
      <Box size={[1.2, 0.1, 0.05]} pos={[0, 0.96, 3.17]} mat={m.plastic} />
      {[1, -1].map((s) => (
        <group key={s}>
          <RoundedBox args={[0.5, 0.2, 0.08]} radius={0.04} position={[s * 0.92, 1.15, 3.15]} material={m.plastic} />
          <Box size={[0.42, 0.13, 0.03]} pos={[s * 0.92, 1.15, 3.195]} mat={m.headlight} />
          <Box size={[0.3, 0.025, 0.02]} pos={[s * 0.92, 1.25, 3.2]} mat={m.drl} />
          <Cyl r={0.06} len={0.03} pos={[s * 0.62, 0.98, 3.18]} axis="z" mat={m.headlight} />
          {/* degraus */}
          <Box size={[0.36, 0.05, 0.3]} pos={[s * 1.12, 0.75, 1.35]} mat={m.aluminium} />
          <Box size={[0.36, 0.05, 0.3]} pos={[s * 1.12, 1.08, 1.35]} mat={m.aluminium} />
          <Box size={[0.04, 0.5, 0.3]} pos={[s * 0.95, 0.92, 1.35]} mat={m.chassis} />
        </group>
      ))}

      {/* motor, radiador, turbo */}
      <Box size={[0.95, 0.75, 1.5]} pos={[0, 1.42, 1.85]} mat={m.engine} />
      <Box size={[0.8, 0.12, 1.3]} pos={[0, 1.86, 1.85]} mat={m.accent} />
      <Box size={[1.25, 1.1, 0.12]} pos={[0, 1.55, 2.72]} mat={m.plastic} />
      <Cyl r={0.16} len={0.25} pos={[-0.55, 1.55, 1.6]} mat={m.aluminium} seg={24} />
      <Cyl r={0.09} len={1.2} pos={[0.2, 1.62, 1.85]} axis="z" mat={m.aluminium} seg={16} />
      <Box size={[0.9, 0.4, 0.6]} pos={[0, 1.08, 0.55]} mat={m.engine} />

      {/* eixo dianteiro, feixes de mola, barra de direção */}
      <Box size={[1.9, 0.16, 0.16]} pos={[0, WHEEL_R, FRONT_AXLE_Z]} mat={m.chassis} />
      {[1, -1].map((s) => (
        <Box key={s} size={[0.1, 0.1, 1.3]} pos={[s * 0.48, 0.74, FRONT_AXLE_Z]} mat={m.engine} />
      ))}
      <Rod from={[0.86, 0.6, FRONT_AXLE_Z - 0.32]} to={[-0.86, 0.6, FRONT_AXLE_Z - 0.32]} r={0.035} mat={m.chassis} />
      {/* barra de ligação da caixa (braço Pitman) até a manga de eixo */}
      <Rod from={pitmanEnd} to={[0.9, 0.62, FRONT_AXLE_Z - 0.3]} r={0.03} mat={m.silver} />
      {/* coluna de direção até a cabine */}
      <Rod from={[GEAR_MOUNT[0], GEAR_MOUNT[1], GEAR_MOUNT[2] + 0.44]} to={[0.6, 1.36, 2.62]} r={0.03} mat={m.silver} />
      <mesh position={[GEAR_MOUNT[0], GEAR_MOUNT[1], GEAR_MOUNT[2] + 0.44]} material={m.chrome}>
        <sphereGeometry args={[0.045, 12, 10]} />
      </mesh>
      {/* suporte da caixa na longarina */}
      <Box size={[0.08, 0.32, 0.5]} pos={[0.58, 0.98, GEAR_MOUNT[2]]} mat={m.chassis} />

      {/* rodas dianteiras (esterçam) */}
      {[1, -1].map((s, i) => (
        <group key={s} position={[s * 1.06, WHEEL_R, FRONT_AXLE_Z]} ref={(g) => void (frontWheels.current[i] = g)}>
          <Wheel m={m} tire={tire} side={s as 1 | -1} />
        </group>
      ))}
      {/* para-lamas dianteiros */}
      {[1, -1].map((s) => (
        <group key={s}>
          <Box size={[0.44, 0.05, 0.95]} pos={[s * 1.06, 1.2, FRONT_AXLE_Z + 0.05]} mat={m.plastic} />
          <Box size={[0.44, 0.05, 0.4]} pos={[s * 1.06, 1.08, FRONT_AXLE_Z + 0.62]} rot={[-0.55, 0, 0]} mat={m.plastic} />
          <Box size={[0.44, 0.05, 0.4]} pos={[s * 1.06, 1.08, FRONT_AXLE_Z - 0.52]} rot={[0.55, 0, 0]} mat={m.plastic} />
        </group>
      ))}

      {/* eixo traseiro com rodado duplo */}
      <Cyl r={0.12} len={1.75} pos={[0, WHEEL_R, REAR_AXLE_Z]} mat={m.chassis} />
      <mesh position={[0, WHEEL_R, REAR_AXLE_Z]} material={m.engine} castShadow>
        <sphereGeometry args={[0.26, 20, 16]} />
      </mesh>
      {[1, -1].map((s) => (
        <group key={s}>
          <group position={[s * 1.05, WHEEL_R, REAR_AXLE_Z]}>
            <Wheel m={m} tire={tire} side={s as 1 | -1} />
          </group>
          <group position={[s * 0.72, WHEEL_R, REAR_AXLE_Z]}>
            <Wheel m={m} tire={tire} side={s as 1 | -1} dual />
          </group>
          {/* para-lama traseiro e lameiro */}
          <Box size={[0.72, 0.05, 1.35]} pos={[s * 0.9, 1.16, REAR_AXLE_Z]} mat={m.plastic} />
          <Box size={[0.62, 0.55, 0.03]} pos={[s * 0.9, 0.55, REAR_AXLE_Z - 0.7]} mat={m.rubber} />
          <Box size={[0.14, 0.08, 0.05]} pos={[s * 0.62, 0.95, -3.55]} mat={m.tail} />
        </group>
      ))}

      {/* tanque de combustível (esquerda) e tanques de ar (direita) */}
      <Cyl r={0.33} len={1.3} pos={[0.9, 0.82, 0.35]} axis="z" mat={m.aluminium} seg={36} />
      {[-0.28, 1.0].map((z) => (
        <Box key={z} size={[0.7, 0.05, 0.06]} pos={[0.82, 1.16, z]} mat={m.chassis} />
      ))}
      <Cyl r={0.14} len={1.0} pos={[-0.78, 0.75, 0.4]} axis="z" mat={m.chassis} seg={20} />
      <Cyl r={0.14} len={1.0} pos={[-0.78, 1.06, 0.4]} axis="z" mat={m.chassis} seg={20} />
      <Box size={[0.5, 0.45, 0.6]} pos={[-0.85, 0.9, -0.55]} mat={m.plastic} />

      {/* quinta roda */}
      <Box size={[1.0, 0.1, 1.0]} pos={[0, 1.18, REAR_AXLE_Z + 0.15]} mat={m.chassis} />
      <Cyl r={0.55} len={0.08} pos={[0, 1.27, REAR_AXLE_Z + 0.15]} axis="y" mat={m.engine} seg={36} />
      <Box size={[0.18, 0.09, 0.6]} pos={[0, 1.3, REAR_AXLE_Z - 0.2]} mat={m.plastic} />

      {/* escapamento vertical atrás da cabine */}
      <Cyl r={0.09} len={1.9} pos={[-0.95, 2.35, 0.55]} axis="y" mat={m.chrome} seg={20} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* Conjunto                                                            */
/* ------------------------------------------------------------------ */

export function ProceduralTruck({ progress, onInfo, showLights = true }: { progress: RefObject<number>; onInfo: (info: TruckInfo) => void; showLights?: boolean }) {
  const m = useTruckMaterials();
  const tire = useTireGeometry();
  const cab = useRef<THREE.Group>(null);
  const frontWheels = useRef<Array<THREE.Group | null>>([]);
  const born = useRef<number | null>(null);
  const spotL = useRef<THREE.SpotLight>(null);
  const spotR = useRef<THREE.SpotLight>(null);
  const targetL = useMemo(() => new THREE.Object3D(), []);
  const targetR = useMemo(() => new THREE.Object3D(), []);

  // cores originais para escurecer o veículo enquanto a caixa está em destaque
  const dimmables = useMemo(() => {
    const keep = new Set<THREE.Material>([m.headlight, m.drl, m.tail, m.marker, m.accent]);
    return Object.values(m)
      .filter((mat) => !keep.has(mat))
      .map((mat) => ({ mat: mat as THREE.MeshStandardMaterial, color: (mat as THREE.MeshStandardMaterial).color.clone() }));
  }, [m]);

  useEffect(() => {
    onInfo({
      mount: new THREE.Vector3(...GEAR_MOUNT),
      // eixo do sem-fim ao longo da longarina, eixo setor para fora (+X)
      mountQuaternion: new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2),
      mountScale: GEAR_MOUNT_SCALE,
      frontZ: 3.2,
      height: 3.95,
      length: 6.8,
    });
  }, [onInfo]);

  useFrame((state) => {
    const p = progress.current ?? 0;
    const t = state.clock.elapsedTime;
    if (born.current == null) born.current = t;
    const since = t - born.current;

    // faróis acendem suavemente na apresentação
    const on = Math.min(1, Math.max(0, (since - 0.5) / 1.2));
    const flicker = since < 1.1 && since > 0.5 ? (Math.sin(since * 60) > 0 ? 1 : 0.3) : 1;
    m.headlight.emissiveIntensity = 3.2 * on * flicker;
    m.drl.emissiveIntensity = 2.4 * Math.min(1, since / 0.6);
    m.tail.emissiveIntensity = 1.6 * on;
    m.marker.emissiveIntensity = 1.4 * on;
    if (spotL.current) spotL.current.intensity = 40 * on * flicker;
    if (spotR.current) spotR.current.intensity = 40 * on * flicker;

    // cabine basculante acompanha o scroll
    if (cab.current) cab.current.rotation.x = THREE.MathUtils.degToRad(52) * cabLiftAmount(p);

    // rodas dianteiras esterçam suavemente na apresentação
    const idle = 1 - ramp(p, 0, STAGE.introEnd);
    const steer = Math.sin(t * 0.7) * 0.28 * idle;
    frontWheels.current.forEach((w) => w && (w.rotation.y = steer));

    // restante do veículo escurece enquanto a caixa de direção está em destaque
    const dim = 1 - 0.72 * highlightAmount(p);
    for (const d of dimmables) d.mat.color.copy(d.color).multiplyScalar(dim);
  });

  return (
    <group>
      <Chassis m={m} tire={tire} frontWheels={frontWheels} />
      <group position={HINGE} ref={cab}>
        <Cab m={m} />
      </group>
      {showLights && (
        <>
          <primitive object={targetL} position={[0.92, 0, 11]} />
          <primitive object={targetR} position={[-0.92, 0, 11]} />
          <spotLight ref={spotL} position={[0.92, 1.15, 3.25]} target={targetL} angle={0.42} penumbra={0.7} color="#fff1d6" distance={18} decay={1.4} />
          <spotLight ref={spotR} position={[-0.92, 1.15, 3.25]} target={targetR} angle={0.42} penumbra={0.7} color="#fff1d6" distance={18} decay={1.4} />
        </>
      )}
    </group>
  );
}
