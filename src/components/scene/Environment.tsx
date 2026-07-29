'use client';

/**
 * Ground, sky and light.
 *
 * No HDRI — it would be megabytes for an environment that is mostly one warm
 * gradient. A shader sphere gives the same read for a few hundred bytes and never
 * has to be fetched.
 *
 * Sandy albedo, low warm sun, linear fog matched to the horizon: Rajasthan at
 * mid-morning, which is where the telemetry says we are.
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BackSide, type Mesh } from 'three';

import { SCENE, SCENE_MATERIAL } from '@/lib/scenePalette';

const SKY_TOP = SCENE.skyZenith;
const SKY_HORIZON = SCENE.skyHorizon;
const GROUND = SCENE.ground;

/** Vertical gradient on the inside of a big sphere. Cheaper than a cubemap. */
const skyVertex = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vWorld = (modelMatrix * vec4(position, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const skyFragment = /* glsl */ `
  uniform vec3 top;
  uniform vec3 horizon;
  varying vec3 vWorld;
  void main() {
    float h = clamp(normalize(vWorld).y * 1.6 + 0.12, 0.0, 1.0);
    gl_FragColor = vec4(mix(horizon, top, pow(h, 0.8)), 1.0);
  }
`;

export function SceneEnvironment() {
  const sky = useRef<Mesh>(null);

  /**
   * THE SKY RIDES THE CAMERA.
   *
   * It used to be a fixed sphere of radius 420 centred on the origin, with the
   * camera's far plane at 600. That works while the camera stays near the middle
   * of the site — but fly out to a zone-C array and the camera sits ~275 m from
   * the origin, which puts the far side of the sphere at ~695 m, PAST the far
   * plane. It got clipped away and the clear colour showed through as a black
   * mass sitting on the horizon.
   *
   * Centring it on the camera makes that impossible at any distance, which is how
   * a skybox is meant to work anyway. Reading the camera and writing a transform
   * is presentational — it drives no state and no selector reads it.
   */
  useFrame((state) => {
    sky.current?.position.copy(state.camera.position);
  });

  return (
    <>
      {/* Fog colour matches the horizon so the field dissolves rather than ends. */}
      <fog attach="fog" args={[SKY_HORIZON, 70, 260]} />

      <mesh ref={sky}>
        <sphereGeometry args={[300, 24, 16]} />
        <shaderMaterial
          side={BackSide}
          depthWrite={false}
          fog={false}
          vertexShader={skyVertex}
          fragmentShader={skyFragment}
          uniforms={{
            top: { value: hexToVec(SKY_TOP) },
            horizon: { value: hexToVec(SKY_HORIZON) },
          }}
        />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow={false}>
        <planeGeometry args={[700, 700]} />
        <meshStandardMaterial color={GROUND} roughness={SCENE_MATERIAL.groundRoughness} metalness={0} />
      </mesh>

      {/* Low warm sun, matching a mid-morning site at 890 W/m². */}
      <directionalLight position={[-120, 70, 90]} intensity={SCENE_MATERIAL.sunIntensity} color={SCENE.sun} />
      <hemisphereLight args={[SCENE.skyFill, GROUND, SCENE_MATERIAL.hemisphereIntensity]} />
      <ambientLight intensity={0.15} />
    </>
  );
}

/** '#rrggbb' → the [0..1] triple a shader uniform wants. */
function hexToVec(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
