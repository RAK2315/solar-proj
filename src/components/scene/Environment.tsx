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

import { BackSide } from 'three';

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
  return (
    <>
      {/* Fog colour matches the horizon so the field dissolves rather than ends. */}
      <fog attach="fog" args={[SKY_HORIZON, 90, 340]} />

      <mesh scale={[1, 1, 1]}>
        <sphereGeometry args={[420, 24, 16]} />
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
        <planeGeometry args={[900, 900]} />
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
