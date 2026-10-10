'use client';

import { useEffect, useMemo } from 'react';
import { MeshStandardMaterial } from 'three';
import { SCENE, SCENE_MATERIAL, SITE } from '@/lib/scenePalette';

export function SiteEnvironment({ dark, inspection = false }: { dark: boolean; inspection?: boolean }) {
  const ground = useMemo(() => {
    const material = new MeshStandardMaterial({ color: dark ? SITE.nightGround : SITE.sand, roughness: 1 });
    // Fixed world-space variation adds grain without assets, shadow maps or a clock.
    material.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 groundAt;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\ngroundAt = (modelMatrix * vec4(position, 1.0)).xz;');
      shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec2 groundAt;')
        .replace('#include <color_fragment>', '#include <color_fragment>\nfloat grain = fract(sin(dot(floor(groundAt * 3.0), vec2(12.9898, 78.233))) * 43758.5453);\ndiffuseColor.rgb *= 0.96 + grain * 0.08;');
    };
    return material;
  }, [dark]);
  useEffect(() => () => ground.dispose(), [ground]);
  return <>
    <color attach="background" args={[dark ? SITE.nightSky : SITE.sky]} />
    <fog attach="fog" args={[dark ? SITE.nightSky : SITE.sky, 280, 600]} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} material={ground}>
      <planeGeometry args={[1000, 1000]} />
    </mesh>
    {/* The inspection keeps the validated light rig; its module texture and crop
        must see the same illumination even as the surrounding site is improved. */}
    <directionalLight position={inspection ? [-120, 70, 90] : [-120, 100, 90]} intensity={inspection ? SCENE_MATERIAL.sunIntensity : dark ? 2.8 : 2.2} color={inspection ? SCENE.sun : SITE.sky} />
    <hemisphereLight args={[inspection ? SCENE.skyFill : SITE.sky, inspection ? SCENE.ground : dark ? SITE.nightGround : SITE.sand, inspection ? SCENE_MATERIAL.hemisphereIntensity : dark ? 1.6 : 1.4]} />
    {inspection && <ambientLight intensity={0.15} />}
  </>;
}
