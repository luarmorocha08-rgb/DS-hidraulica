"use client";

/**
 * Modelos GLB profissionais (opcionais). Convenção de nomes em docs/MODELOS-3D.md.
 */

import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import * as THREE from "three";
import { GEAR_PARTS, partProgress, type PartRegistry } from "./gear/SteeringGear";
import { cabLiftAmount, explodeAmount, highlightAmount } from "./timeline";

const DRACO_PATH = "/draco/";

/** Tamanho de referência do caminhão na cena (comprimento em unidades). */
export const TRUCK_LENGTH = 9;

export interface TruckInfo {
  /** Posição do suporte da caixa de direção (espaço da cena). */
  mount: THREE.Vector3;
  mountQuaternion: THREE.Quaternion;
  /** Escala da caixa quando montada no chassi. */
  mountScale: number;
  frontZ: number;
  height: number;
  length: number;
}

export function TruckModel({
  url,
  progress,
  onInfo,
}: {
  url: string;
  progress: RefObject<number>;
  onInfo: (info: TruckInfo) => void;
}) {
  const gltf = useGLTF(url, DRACO_PATH);
  const root = useRef<THREE.Group>(null);
  const start = useRef<number | null>(null);

  const rig = useMemo(() => {
    const scene = gltf.scene;
    // normaliza escala e posição: comprimento = TRUCK_LENGTH, rodas no chão (y = 0)
    const box = new THREE.Box3().setFromObject(scene);
    const size = box.getSize(new THREE.Vector3());
    const scale = TRUCK_LENGTH / Math.max(size.x, size.z);
    scene.scale.setScalar(scale);
    const box2 = new THREE.Box3().setFromObject(scene);
    const center = box2.getCenter(new THREE.Vector3());
    scene.position.set(-center.x, -box2.min.y, -center.z);
    scene.updateMatrixWorld(true);

    const cab = scene.getObjectByName("Cab") ?? null;
    const cabBaseX = cab?.rotation.x ?? 0;
    const lights: THREE.MeshStandardMaterial[] = [];
    const dimmable: Array<{ mat: THREE.MeshStandardMaterial; color: THREE.Color }> = [];
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const mats = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]) as THREE.MeshStandardMaterial[];
      const isLight = /headlight/i.test(o.name) || /headlight/i.test(o.parent?.name ?? "");
      mats.forEach((mat) => {
        if (!mat || !("color" in mat)) return;
        if (isLight) {
          mat.emissive = new THREE.Color("#fff3dc");
          mat.emissiveIntensity = 0;
          lights.push(mat);
        } else {
          dimmable.push({ mat, color: mat.color.clone() });
        }
      });
    });

    const mountObj = scene.getObjectByName("SteeringGearMount");
    const mount = new THREE.Vector3();
    const mountQuaternion = new THREE.Quaternion();
    if (mountObj) {
      mountObj.getWorldPosition(mount);
      mountObj.getWorldQuaternion(mountQuaternion);
    } else {
      // sem marcador: frente do chassi, lado do motorista
      mount.set(-0.35 * (box2.max.x - box2.min.x) * 0.5, 0.9, box2.max.z - center.z - 0.9);
    }
    const info: TruckInfo = {
      mount,
      mountQuaternion,
      mountScale: 0.12,
      frontZ: box2.max.z - center.z,
      height: box2.max.y - box2.min.y,
      length: TRUCK_LENGTH,
    };
    return { scene, cab, cabBaseX, lights, dimmable, info };
  }, [gltf]);

  useEffect(() => onInfo(rig.info), [rig, onInfo]);

  useFrame((state) => {
    const p = progress.current ?? 0;
    if (start.current == null) start.current = state.clock.elapsedTime;
    const since = state.clock.elapsedTime - start.current;
    // faróis acendem suavemente na apresentação
    const lightOn = Math.min(1, Math.max(0, (since - 0.6) / 1.4));
    rig.lights.forEach((m) => (m.emissiveIntensity = 2.2 * lightOn));
    // cabine basculante acompanha o scroll (eixo X = largura do veículo)
    if (rig.cab) rig.cab.rotation.x = rig.cabBaseX + THREE.MathUtils.degToRad(52) * cabLiftAmount(p);
    // restante do veículo escurece enquanto a caixa está em destaque
    const dim = 1 - 0.78 * highlightAmount(p);
    rig.dimmable.forEach(({ mat, color }) => mat.color.copy(color).multiplyScalar(dim));
  });

  return <primitive ref={root} object={rig.scene} />;
}

/**
 * Caixa de direção em GLB. Cada peça deve ser um nó chamado `part_<id>` com os
 * mesmos ids do modelo paramétrico (housing, pitman, sideCover, sector, …),
 * no mesmo sistema de eixos (X = sem-fim, Z = eixo setor, Y = para cima).
 */
export function GearModel({
  url,
  progress,
  spread = 1,
  registry,
}: {
  url: string;
  progress: RefObject<number>;
  spread?: number;
  registry?: RefObject<PartRegistry>;
}) {
  const gltf = useGLTF(url, DRACO_PATH);
  const parts = useMemo(() => {
    const out: Array<{ obj: THREE.Object3D; base: THREE.Vector3; dir: THREE.Vector3; delay: number }> = [];
    for (const def of GEAR_PARTS) {
      const obj = gltf.scene.getObjectByName(`part_${def.id}`);
      if (obj) {
        out.push({ obj, base: obj.position.clone(), dir: new THREE.Vector3(...def.dir), delay: def.delay });
        if (registry?.current) registry.current[def.id] = obj;
      }
    }
    gltf.scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    return out;
  }, [gltf, registry]);

  useFrame(() => {
    const e = explodeAmount(progress.current ?? 0);
    for (const part of parts) {
      const t = partProgress(e, part.delay);
      part.obj.position.copy(part.base).addScaledVector(part.dir, t * spread);
    }
  });

  return <primitive object={gltf.scene} />;
}
