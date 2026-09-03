/**
 * The frame, after the scene has been drawn.
 *
 * Four passes: the scene into a multisampled half-float target, a depth of
 * field, a bloom, and the output pass that encodes to sRGB. Since r155 the
 * renderer tone maps only when drawing straight to the screen, so the moment
 * rendering goes through a target the OutputPass is what applies whatever the
 * renderer was told to do.
 *
 * What it is told here is nothing: NoToneMapping. The look of this scene was
 * decided in Cycles and baked into the lightmaps and the floor through
 * Blender's Standard view transform, which is the sRGB transfer function and
 * no more. A filmic curve on top of a baked filmic curve is the picture
 * graded twice, and the viewer beside the renders would never line up.
 *
 * `samples: 4` is not optional. `antialias: true` on the renderer describes
 * the canvas's own framebuffer, and nothing is drawn to it any more: without a
 * multisampled target every edge in the scene goes jagged on the day it gains
 * a highlight.
 *
 * The bloom runs at half the canvas, which is both cheaper and softer, and
 * what it is allowed to find was settled on 2 September.
 *
 * Its threshold was 0.85, and its job was written down as a soft halo on the
 * screens, the status lamp and the accent wires. It did none of that. Measured
 * in the linear Rec.601 luma the UnrealBloom high pass actually computes, the
 * status lamp is 0.542 and the accent wires 0.270, so neither has ever crossed
 * 0.85; the only thing in the scene that does is a white screen pixel, which
 * is exactly 1.0. And the high pass passes the whole texel rather than its
 * excess, so a five by three unit white landing page came back as a five by
 * three unit halo added onto itself. On shots/1440x900-01-website.png the
 * headline block held 22 points of luminance between its darkest glyph and its
 * background, against 153 with the bloom switched off: the one object on this
 * floor whose whole argument is that it is a real page was unreadable, and
 * nothing that was supposed to glow glowed.
 *
 * So the threshold is 1.05, five per cent clear of the brightest a screen can
 * be, and the true emitters are lifted over it instead rather than the bar
 * being lowered onto the screens. See EMITTER_GAIN in assets.ts.
 *
 * Strength 0.35 and radius 0.3 are what a baked scene wants rather than a lit
 * one, and they are the loosest thing in this module. Measured on the care
 * pair in tools/blender/renders/review with these values: the block around
 * the status lamp reads 214.8 in display luminance against the Cycles
 * render's 137.8, and the block over the lit LEDs 87.3 against 48.8. The live
 * halo is the wider and the warmer of the two, because a real-time bloom over
 * a mip chain spreads further than the glare node Cycles composited with. The
 * bake also hands the pass more than the emitters: the monitor bezel, lit at
 * 0.13 units from an emissive screen, crosses 1.05 on its own and rings the
 * hub shot in white. These two numbers are the first to move if the owner
 * wants the live frame nearer the render.
 */
import {
  HalfFloatType,
  NoToneMapping,
  Vector2,
  WebGLRenderTarget,
  type PerspectiveCamera,
  type Scene,
  type WebGLRenderer,
} from 'three';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

export const BLOOM = { strength: 0.35, radius: 0.3, threshold: 1.05 } as const;

/** The bloom's working resolution as a fraction of the canvas, in device pixels. */
export const BLOOM_SCALE = 0.5;

/**
 * BokehPass blurs by (focus - depth) * aperture, clamped to maxblur, in UV
 * units: gain / fstop is the aperture.
 *
 * The f-stop is the one the pose carries, which is the one the Cycles render
 * of that pose was shot at, so a stand at f/0.8 defocuses the floor behind
 * its object and the map at f/11 keeps the letter sharper than anything
 * else. `gain` sets what an f-stop is worth here, and `maxblur` caps the disc
 * so an object far behind the plane of focus does not smear across the frame.
 *
 * The f-stop alone cannot do it, which is what the first six pairs showed.
 * BokehPass blurs by (focus - depth) * aperture, so an aperture of gain over
 * f-stop is a blur per unit of depth that does not know how far off the shot
 * is standing. At the map, a 44.6 unit shot across a floor 40 units deep,
 * f/11 gave 0.006 / 11 = 5.45e-4 per unit, so a point 20 units off the plane
 * of focus blurred by 0.0109 of the frame, 16 px at 1440, and the live letter
 * came out softer than a Cycles frame that is sharp from the hub to every
 * node.
 *
 * So the distance divides it too: aperture = gain / (fstop * distance). A
 * lens does the same thing, from the other end, since depth of field grows
 * with the square of the subject distance. Measured at the two extremes with
 * gain 0.006: the map stands 44.6 units off at f/11, which is 1.22e-5 per
 * unit, so 20 units off the plane of focus is 2.4e-4 of the frame, 0.35 px at
 * 1440, and the letter is sharp. The website stand is 9.1 units off at f/0.8,
 * which is 8.24e-4 per unit: the object's own 2 units of depth blur by 1.2 px
 * and the floor 20 units behind it reaches maxblur, 17 px, which is the soft
 * near and far floor the render has at f/0.8.
 */
export const DOF = { gain: 0.006, maxblur: 0.012 } as const;

export type Post = {
  render(): void;
  /** CSS pixels, as renderer.setSize takes them. The pixel ratio is applied here. */
  setSize(width: number, height: number): void;
  /** The plane of focus, in world units from the lens, and the aperture that blurs around it. */
  setFocus(distance: number, fstop: number): void;
  dispose(): void;
};

const atLeastOne = (n: number) => Math.max(1, Math.round(n));

export function createPost(renderer: WebGLRenderer, scene: Scene, camera: PerspectiveCamera): Post {
  // The OutputPass applies the renderer's tone mapping, so this is where the
  // decision above is actually made rather than left to whoever built the
  // renderer.
  renderer.toneMapping = NoToneMapping;

  const ratio = renderer.getPixelRatio();
  const size = renderer.getSize(new Vector2());
  const target = new WebGLRenderTarget(atLeastOne(size.x * ratio), atLeastOne(size.y * ratio), {
    samples: 4,
    type: HalfFloatType,
  });
  const composer = new EffectComposer(renderer, target);
  const bokeh = new BokehPass(scene, camera, {
    // A pose is applied before the first frame, so these three are only ever
    // the values the pass is built with. They are the map's, at the map's own
    // distance, so a frame drawn before setFocus would still be a sane one.
    focus: 10,
    aperture: DOF.gain / (11 * 10),
    maxblur: DOF.maxblur,
  });
  const bloom = new UnrealBloomPass(
    new Vector2(atLeastOne(size.x * ratio * BLOOM_SCALE), atLeastOne(size.y * ratio * BLOOM_SCALE)),
    BLOOM.strength,
    BLOOM.radius,
    BLOOM.threshold,
  );
  const output = new OutputPass();
  // @types/three declares BokehPass.uniforms as a bare `object`, so the two
  // this module moves are named here. It is the pass's own uniform object,
  // not a copy: BokehPass hands out the same one its material holds.
  const dof = bokeh.uniforms as Record<'focus' | 'aperture', { value: number }>;
  composer.addPass(new RenderPass(scene, camera));
  // Before the bloom, not after: a defocused emitter should glow as the soft
  // disc it has become, and blurring the halo afterwards would blur the sharp
  // parts of the frame along with it.
  composer.addPass(bokeh);
  composer.addPass(bloom);
  composer.addPass(output);

  return {
    render: () => composer.render(),
    setSize(width, height) {
      // Read here, not the `ratio` the targets were built with: a window
      // dragged from a 1x screen onto a 2x one changes what the renderer
      // reports, and everything between the scene and the canvas would
      // otherwise stay at the size the first screen wanted. The composer
      // keeps a ratio of its own for the two buffers it owns, so it is told
      // as well as asked.
      const live = renderer.getPixelRatio();
      composer.setPixelRatio(live);
      // The composer sizes every pass to the full device resolution. The
      // bloom and the bokeh are then told their own sizes, so the order of
      // these lines matters.
      composer.setSize(width, height);
      bloom.setSize(
        atLeastOne(width * live * BLOOM_SCALE),
        atLeastOne(height * live * BLOOM_SCALE),
      );
      bokeh.setSize(atLeastOne(width * live), atLeastOne(height * live));
    },
    setFocus(distance, fstop) {
      dof.focus.value = distance;
      dof.aperture.value = DOF.gain / (fstop * distance);
    },
    dispose() {
      // composer.dispose() frees its own targets and copy pass, not the passes
      // it was handed.
      bokeh.dispose();
      bloom.dispose();
      output.dispose();
      composer.dispose();
    },
  };
}
