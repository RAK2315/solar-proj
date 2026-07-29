'use client';

/**
 * ThermalPass — the ironbow post-process, active t=48..56.
 *
 * THIS IS THE AESTHETIC BET PAYING OFF. The LUT below is the same seven stops as
 * the --iron-* CSS tokens and the same seven the matplotlib render uses in
 * scripts/thermal_hotspot.py. When the feed goes thermal, the cinematic and the
 * console's anomaly matrix are speaking one colour language, so it reads as one
 * instrument switching modes rather than as two applications.
 *
 * plan/04 §1 rule 3: --iron-* is referenced directly in exactly two places, the
 * matrix interpolator and this LUT. Those two must agree for the same normalised
 * value. If you reshade the ramp, reshade both.
 *
 * Sensor character: real thermal sensors are lower-resolution than the visible
 * camera, so the pass adds scanlines and a slight quantisation. The fidelity DROP
 * is what makes it read as authentic.
 */

import { EffectComposer } from '@react-three/postprocessing';
import { useFrame } from '@react-three/fiber';
import { forwardRef, useLayoutEffect, useMemo, useRef } from 'react';
import { BlendFunction, Effect } from 'postprocessing';
import { Uniform } from 'three';

import { ironbowGlsl } from '@/lib/ironbow';
import { thermalAmount } from '@/lib/scene';
import { flightCueNow } from '@/store/flightCue';

/**
 * The ramp is GENERATED from src/lib/ironbow.ts rather than typed here, so the
 * shader and the anomaly matrix cannot drift apart. ironbow.test.ts also checks
 * both against the --iron-* declarations in globals.css.
 */
const fragment = /* glsl */ `
  uniform float amount;

${ironbowGlsl()}

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    float lum = dot(inputColor.rgb, vec3(0.299, 0.587, 0.114));

    // Quantise: a thermal sensor has far fewer usable levels than an 8-bit RGB
    // frame, and the banding is a large part of why one reads as a sensor.
    float quantised = floor(lum * 32.0) / 32.0;

    // Scanlines, suggesting the lower resolution a real thermal camera has.
    float scan = 0.94 + 0.06 * sin(uv.y * 1400.0);

    vec3 thermal = ironbow(quantised) * scan;
    outputColor = vec4(mix(inputColor.rgb, thermal, amount), inputColor.a);
  }
`;

class IronbowEffect extends Effect {
  constructor() {
    super('IronbowEffect', fragment, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map([['amount', new Uniform(0)]]),
    });
  }

  setAmount(value: number) {
    (this.uniforms.get('amount') as Uniform<number>).value = value;
  }
}

const Ironbow = forwardRef<IronbowEffect>(function Ironbow(_props, ref) {
  const effect = useMemo(() => new IronbowEffect(), []);

  useLayoutEffect(() => {
    if (typeof ref === 'function') ref(effect);
    else if (ref) ref.current = effect;
  }, [effect, ref]);

  useFrame(() => {
    effect.setAmount(thermalAmount(flightCueNow().t));
  });

  return <primitive object={effect} dispose={null} />;
});

export function ThermalPass() {
  const composer = useRef(null);
  return (
    <EffectComposer ref={composer}>
      <Ironbow />
    </EffectComposer>
  );
}
