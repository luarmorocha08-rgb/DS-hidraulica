"use client";

import { ContactShadows, Environment, Grid, Lightformer, MeshReflectorMaterial, PerformanceMonitor, Sparkles } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useCallback, useMemo, useRef, useState, type RefObject } from "react";
import * as THREE from "three";
import { GEAR_PARTS, partProgress, SteeringGear, type PartRegistry } from "./gear/SteeringGear";
import { GearModel, TruckModel, type TruckInfo } from "./models";
import { ProceduralTruck } from "./truck/ProceduralTruck";
import type { Quality } from "./quality";
import {
  explodeAmount,
  GEAR_CAMERA,
  highlightAmount,
  ramp,
  sampleKeys,
  showcaseAmount,
  smooth,
  STAGE,
  viewShift,
  type CameraKey,
} from "./timeline";

export interface HeroCanvasProps {
  progress: RefObject<number>;
  quality: Exclude<Quality, "static" | "low">;
  active: boolean;
  truckUrl?: string;
  gearUrl?: string;
  onReady?: () => void;
  /** Modo de captura (pré-renderização da sequência de imagens). */
  capture?: boolean;
  /** Elementos DOM das etiquetas técnicas (posicionados a partir do 3D). */
  labels?: RefObject<Record<string, HTMLElement | null>>;
  /**
   * "photo": o caminhão é a foto (HTML) e a cena mostra só a caixa de direção;
   * "procedural": caminhão modelado em 3D (usado se a foto não existir).
   */
  vehicle?: "photo" | "procedural";
}

const FLOOR_Y = -1.15;

/** Fator de distância da câmera em telas estreitas (mais longe só na vista explodida). */
function aspectFactor(aspect: number, explode: number) {
  if (aspect >= 1.45) return 1;
  const near = Math.min(2.1, 1.0 / Math.max(aspect, 0.4));
  const far = Math.min(2.2, 1.45 / Math.max(aspect, 0.4));
  return near + (far - near) * explode;
}

function truckCamera(info: TruckInfo): { keys: CameraKey[]; showcase: THREE.Vector3 } {
  const L = info.length;
  const H = info.height;
  const M = info.mount;
  const F = info.frontZ;
  // a caixa sai do chassi e flutua à frente do caminhão para a vista explodida
  const S = new THREE.Vector3(0.6, Math.max(2.2, H * 0.58), F + 3.6);
  const add = (v: THREE.Vector3, x: number, y: number, z: number): [number, number, number] => [v.x + x, v.y + y, v.z + z];
  const wide: CameraKey["pos"] = [L * 1.05, H * 0.78, F + L * 1.15];
  const look: CameraKey["target"] = [0, H * 0.4, 0.3];
  const keys: CameraKey[] = [
    { p: 0, pos: wide, target: look },
    { p: STAGE.introEnd, pos: [L * 0.92, H * 0.66, F + L * 0.98], target: [0, H * 0.38, 0.6] },
    // lateral baixa: a cabine bascula e a caixa aparece presa à longarina
    { p: STAGE.approachEnd, pos: add(M, 7.2, 2.3, 4.2), target: add(M, -1.1, 0.8, -0.9) },
    { p: STAGE.revealEnd, pos: add(S, 1.8, 2.0, 6.6), target: add(S, 0.4, 0.55, 0) },
    { p: STAGE.explodeFull, pos: add(S, 3.0, 4.4, 12.4), target: add(S, 0.6, 0.4, 0.4) },
    { p: STAGE.holdEnd, pos: add(S, 0.8, 4.2, 12.6), target: add(S, 0.6, 0.4, 0.4) },
    { p: STAGE.reassembleEnd, pos: add(S, 5.2, 2.2, 7.4), target: add(S, 0.4, 0.4, -0.6) },
    { p: 1, pos: wide, target: look },
  ];
  return { keys, showcase: S };
}

function CameraRig({ progress, keys, capture }: { progress: RefObject<number>; keys: CameraKey[]; capture?: boolean }) {
  const { camera, size } = useThree();
  const pos = useRef(new THREE.Vector3(...keys[0].pos));
  const target = useRef(new THREE.Vector3(...keys[0].target));
  const shift = useRef({ x: 0, y: 0 });
  const tmpPos = useMemo(() => new THREE.Vector3(), []);
  const tmpTarget = useMemo(() => new THREE.Vector3(), []);
  const pointer = useRef({ x: 0, y: 0 });

  useFrame((state, delta) => {
    const p = progress.current ?? 0;
    const aspect = size.width / size.height;
    const k = sampleKeys(keys, p);
    tmpTarget.set(...k.target);
    tmpPos.set(...k.pos).sub(tmpTarget).multiplyScalar(aspectFactor(aspect, smooth(ramp(p, STAGE.revealEnd, STAGE.explodeFull - 0.05)) * (1 - smooth(ramp(p, STAGE.holdEnd, STAGE.reassembleEnd))))).add(tmpTarget);
    // paralaxe sutil com o mouse (desktop)
    if (!capture) {
      pointer.current.x += (state.pointer.x - pointer.current.x) * 0.04;
      pointer.current.y += (state.pointer.y - pointer.current.y) * 0.04;
      tmpPos.x += pointer.current.x * 0.35;
      tmpPos.y += pointer.current.y * 0.2;
    }
    const damp = capture ? 1 : 1 - Math.exp(-delta * 4.5);
    pos.current.lerp(tmpPos, damp);
    target.current.lerp(tmpTarget, damp);
    camera.position.copy(pos.current);
    camera.lookAt(target.current);

    // enquadramento: objeto à direita no desktop, acima do texto no celular
    const wide = aspect > 1.15;
    const sx = wide ? viewShift(p) : 0;
    const sy = wide ? 0 : 0.16 * (1 - ramp(p, STAGE.introEnd - 0.04, STAGE.introEnd + 0.04)) - 0.02;
    shift.current.x += (sx - shift.current.x) * damp;
    shift.current.y += (sy - shift.current.y) * damp;
    const cam = camera as THREE.PerspectiveCamera;
    cam.setViewOffset(size.width, size.height, -shift.current.x * size.width, shift.current.y * size.height, size.width, size.height);
  });
  return null;
}

/** Projeta os pontos de ancoragem das peças para as etiquetas em HTML. */
function LabelProjector({
  progress,
  registry,
  labels,
}: {
  progress: RefObject<number>;
  registry: RefObject<PartRegistry>;
  labels: RefObject<Record<string, HTMLElement | null>>;
}) {
  const { camera, size } = useThree();
  const v = useMemo(() => new THREE.Vector3(), []);
  const center = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const e = explodeAmount(progress.current ?? 0);
    const housing = registry.current?.housing;
    if (housing) {
      housing.getWorldPosition(center);
      center.project(camera);
    }
    const cx = ((center.x + 1) / 2) * size.width;
    for (const part of GEAR_PARTS) {
      const el = labels.current?.[part.id];
      const obj = registry.current?.[part.id];
      if (!el || !obj || !part.anchor) continue;
      const t = part.id === "housing" ? ramp(e, 0.55, 0.85) : ramp(partProgress(e, part.delay), 0.65, 1);
      if (t <= 0.001) {
        if (el.style.opacity !== "0") el.style.opacity = "0";
        continue;
      }
      v.set(...part.anchor);
      obj.localToWorld(v);
      v.project(camera);
      const x = ((v.x + 1) / 2) * size.width;
      const y = ((1 - v.y) / 2) * size.height;
      el.dataset.side = x < cx ? "left" : "right";
      el.style.opacity = String(smooth(t));
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    }
  });
  return null;
}

/** Feixes de luz industriais (planos aditivos com degradê). */
function LightBeams() {
  const texture = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 4;
    c.height = 256;
    const g = c.getContext("2d")!;
    const grad = g.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, "rgba(255,190,120,0.55)");
    grad.addColorStop(0.5, "rgba(255,150,60,0.12)");
    grad.addColorStop(1, "rgba(255,120,30,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 4, 256);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  const beams: Array<[number, number, number, number]> = [
    [-6, 4.5, -7, 0.1],
    [-1.5, 4.5, -9, -0.05],
    [3.5, 4.5, -8, 0.12],
    [8, 4.5, -6, -0.1],
  ];
  return (
    <group>
      {beams.map(([x, y, z, rot], i) => (
        <group key={i} position={[x, y, z]}>
          <mesh rotation={[0, 0, rot]}>
            <planeGeometry args={[1.8, 11]} />
            <meshBasicMaterial map={texture} transparent depthWrite={false} blending={THREE.AdditiveBlending} opacity={0.55} />
          </mesh>
          <mesh position={[0, 5.4, 0.1]}>
            <boxGeometry args={[1.6, 0.08, 0.4]} />
            <meshBasicMaterial color="#ffd8b0" toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Floor({ quality, y }: { quality: HeroCanvasProps["quality"]; y: number }) {
  return (
    <group position={[0, y, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[80, 80]} />
        {quality === "high" ? (
          <MeshReflectorMaterial
            blur={[400, 120]}
            resolution={512}
            mixBlur={1}
            mixStrength={18}
            roughness={0.9}
            depthScale={1.1}
            minDepthThreshold={0.4}
            maxDepthThreshold={1.3}
            color="#0d0d0f"
            metalness={0.6}
          />
        ) : (
          <meshStandardMaterial color="#0e0e10" roughness={0.85} metalness={0.3} />
        )}
      </mesh>
      <Grid
        position={[0, 0.002, 0]}
        args={[60, 60]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor="#26272b"
        sectionSize={2.5}
        sectionThickness={0.9}
        sectionColor="#7a3a12"
        fadeDistance={26}
        fadeStrength={1.6}
        infiniteGrid
      />
    </group>
  );
}

function Lights({ progress, quality }: { progress: RefObject<number>; quality: HeroCanvasProps["quality"] }) {
  const rim = useRef<THREE.SpotLight>(null);
  const key = useRef<THREE.SpotLight>(null);
  const sweep = useRef<THREE.PointLight>(null);
  const top = useRef<THREE.DirectionalLight>(null);
  const born = useRef<number | null>(null);

  useFrame((state) => {
    const p = progress.current ?? 0;
    const t = state.clock.elapsedTime;
    if (born.current == null) born.current = t;
    const intro = smooth(Math.min(1, (t - born.current) / 1.8));
    const h = highlightAmount(p);
    if (key.current) key.current.intensity = (70 - 16 * h) * intro;
    if (rim.current) rim.current.intensity = (30 + 70 * h) * intro;
    // luz de bancada branca para ler as peças na vista explodida
    if (top.current) top.current.intensity = (0.25 + 1.6 * explodeAmount(p)) * intro;
    if (sweep.current) {
      // reflexo percorrendo as superfícies metálicas na apresentação
      const s = ((t - born.current) * 0.18) % 1;
      sweep.current.position.set(-7 + s * 14, 3.2, 4.5);
      sweep.current.intensity = 22 * intro * (1 - ramp(p, 0.05, STAGE.approachEnd));
    }
  });

  const shadows = quality === "high";
  return (
    <>
      <ambientLight intensity={0.16} />
      <spotLight
        ref={key}
        position={[6, 9, 7]}
        angle={0.75}
        penumbra={0.8}
        color="#ffe2c4"
        castShadow={shadows}
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0004}
        decay={1.2}
      />
      <spotLight ref={rim} position={[-6.5, 3.5, -5]} angle={0.6} penumbra={1} color="#f47712" decay={1.2} />
      <directionalLight position={[-6, 4, 6]} intensity={0.35} color="#9fb6ff" />
      <directionalLight ref={top} position={[1, 12, 4]} color="#f2f4ff" />
      <pointLight ref={sweep} color="#ffffff" distance={9} decay={1.5} />
    </>
  );
}

function SceneContent({ progress, quality, truckUrl, gearUrl, capture, labels, vehicle = "procedural" }: HeroCanvasProps) {
  const gearOnly = vehicle === "photo" && !truckUrl;
  const { size } = useThree();
  const narrow = size.width / size.height < 1;
  const [truck, setTruck] = useState<TruckInfo | null>(null);
  const onInfo = useCallback((info: TruckInfo) => setTruck(info), []);
  const gearRoot = useRef<THREE.Group>(null);
  const born = useRef<number | null>(null);
  const registry = useRef<PartRegistry>({});

  const rig = useMemo(() => (truck ? truckCamera(truck) : null), [truck]);
  const keys = rig?.keys ?? GEAR_CAMERA;
  const identity = useMemo(() => new THREE.Quaternion(), []);
  const spread = narrow ? 0.55 : 1;

  useFrame((state) => {
    const g = gearRoot.current;
    if (!g) return;
    const p = progress.current ?? 0;
    const t = state.clock.elapsedTime;
    if (born.current == null) born.current = t;
    if (gearOnly) {
      // caixa sozinha em exposição, surgindo quando a foto dá lugar ao 3D
      const appear = capture ? 1 : smooth(ramp(p, STAGE.approachEnd - 0.04, STAGE.approachEnd + 0.06));
      g.visible = true;
      g.position.set(0, (1 - appear) * -0.5 + Math.sin(t * 0.8) * 0.03, 0);
      g.rotation.set(0, -0.35 + (1 - appear) * -0.9, 0);
      g.scale.setScalar(0.8 + 0.2 * appear);
      return;
    }
    g.visible = !!truck;
    if (!truck || !rig) return;
    // da posição real no chassi para a posição de exibição, girando para a vista técnica
    const s = showcaseAmount(p);
    const lift = Math.sin(s * Math.PI) * 0.6; // arco ao sair do chassi
    g.position.lerpVectors(truck.mount, rig.showcase, s);
    g.position.y += lift;
    g.scale.setScalar(THREE.MathUtils.lerp(truck.mountScale, 1, s));
    g.quaternion.slerpQuaternions(truck.mountQuaternion, identity, s);
    // flutuação leve enquanto exposta
    g.position.y += Math.sin(t * 0.9) * 0.04 * s;
  });

  return (
    <>
      <color attach="background" args={["#08080a"]} />
      <fog attach="fog" args={["#08080a", 26, 64]} />
      <Environment resolution={quality === "high" ? 256 : 128} frames={1}>
        <Lightformer form="rect" intensity={2.4} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[12, 3, 1]} color="#ffffff" />
        <Lightformer form="rect" intensity={1.6} position={[-6, 2, 3]} rotation-y={Math.PI / 2} scale={[6, 2, 1]} color="#f47712" />
        <Lightformer form="rect" intensity={1.1} position={[6, 2, -2]} rotation-y={-Math.PI / 2} scale={[6, 2, 1]} color="#cfd8ff" />
        <Lightformer form="ring" intensity={1.2} position={[2, 3, 8]} scale={2.5} color="#ffffff" />
      </Environment>

      <Lights progress={progress} quality={quality} />
      <LightBeams />
      <Floor quality={quality} y={gearOnly ? FLOOR_Y : 0} />
      {quality === "high" && !capture && (
        <Sparkles count={70} scale={[16, 6, 10]} position={[0, 2, -2]} size={2.2} speed={0.25} color="#ffb070" opacity={0.5} />
      )}

      {truckUrl ? (
        <TruckModel url={truckUrl} progress={progress} onInfo={onInfo} />
      ) : gearOnly ? null : (
        <ProceduralTruck progress={progress} onInfo={onInfo} showLights={quality === "high" || !!capture} />
      )}

      <group ref={gearRoot}>
        {gearUrl ? (
          <GearModel url={gearUrl} progress={progress} spread={spread} registry={registry} />
        ) : (
          <SteeringGear progress={progress} spread={spread} registry={registry} />
        )}
      </group>
      {labels && !capture && <LabelProjector progress={progress} registry={registry} labels={labels} />}

      <ContactShadows position={[0, (gearOnly ? FLOOR_Y : 0) + 0.01, 0]} scale={16} blur={2.2} far={3.5} opacity={0.8} resolution={quality === "high" ? 512 : 256} frames={1} />

      <CameraRig progress={progress} keys={keys} capture={capture} />
    </>
  );
}

function FirstFrame({ onReady }: { onReady?: () => void }) {
  const done = useRef(false);
  useFrame(() => {
    if (!done.current) {
      done.current = true;
      requestAnimationFrame(() => onReady?.());
    }
  });
  return null;
}

export default function HeroCanvas(props: HeroCanvasProps) {
  const { quality, active, capture } = props;
  const [dpr, setDpr] = useState<number | [number, number]>(quality === "high" ? [1, 1.75] : [1, 1.25]);
  return (
    <Canvas
      shadows={quality === "high" ? "soft" : false}
      dpr={dpr}
      frameloop={active || capture ? "always" : "never"}
      camera={{ fov: 35, near: 0.1, far: 120, position: [7.2, 2.9, 9.6] }}
      gl={{ antialias: quality === "high", powerPreference: "high-performance", preserveDrawingBuffer: !!capture }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
      }}
      aria-hidden
    >
      {!capture && <PerformanceMonitor onDecline={() => setDpr(1)} flipflops={2} />}
      <Suspense fallback={null}>
        <SceneContent {...props} />
        <FirstFrame onReady={props.onReady} />
      </Suspense>
    </Canvas>
  );
}
