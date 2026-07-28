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

import { thermalAmount } from '@/lib/scene';
import { useDemoClock } from '@/store/demoClock';

/* The ramp, matching --iron-00 … --iron-100 in globals.css. */
const fragment = /* glsl */ `
  uniform float amount;

  vec3 ironbow(float x) {
    x = clamp(x, 0.0, 1.0);
    vec3 c0 = vec3(0.106, 0.063, 0.208);   // --iron-00  #1B1035
    vec3 c1 = vec3(0.290, 0.114, 0.431);   // --iron-20  #4A1D6E
    vec3 c2 = vec3(0.608, 0.165, 0.388);   // --iron-40  #9B2A63
    vec3 c3 = vec3(0.851, 0.290, 0.239);   // --iron-60  #D94A3D
    vec3 c4 = vec3(0.941, 0.545, 0.165);   // --iron-80  #F08B2A
    vec3 c5 = vec3(1.000, 0.788, 0.302);   // --iron-95  #FFC94D
    vec3 c6 = vec3(1.000, 0.953, 0.839);   // --iron-100 #FFF3D6
    float s = x * 6.0;
    if (s < 1.0) return mix(c0, c1, s);
    if (s < 2.0) return mix(c1, c2, s - 1.0);
    if (s < 3.0) return mix(c2, c3, s - 2.0);
    if (s < 4.0) return mix(c3, c4, s - 3.0);
    if (s < 5.0) return mix(c4, c5, s - 4.0);
    return mix(c5, c6, s - 5.0);
  }

  void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
    float lum = dot(inputColor.rgb, vec3(0.299, 0.587, 0.114));

    // Quantise: a thermal sensor has far fewer usable levels than an 8-bit RGB
    // frame, and the banding is a large part of why one reads as a sensor.
    float quantised = floor(lum * 32.0) / 32.0;

    // Scanlines, and a slight horizontal softening to suggest lower resolution.
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
    effect.setAmount(thermalAmount(useDemoClock.getState().t));
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
