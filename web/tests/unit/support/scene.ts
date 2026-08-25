import { Box3, Group, Mesh, Vector3 } from 'three';

import { LABELS } from '../../../src/components/crossroads/labels';
import { BUILDERS, type Unit } from '../../../src/components/crossroads/objects';
import { LANES } from '../../../src/components/crossroads/scene';

/**
 * Building the scene's objects for real, with no GPU and no browser.
 *
 * Shared by the framing suite and the objects suite, which need the same three
 * awkward things: a document that is enough for a CanvasTexture, a lane group
 * rotated the way scene.ts rotates it, and the world-space corners of every
 * solid on it. Not in a .spec file, because importing one of those into
 * another registers its tests twice.
 */

/**
 * Enough of a document for surfaces.paint() to make a texture.
 *
 * The way builders draw two mock interfaces to a 2D canvas, and neither suite
 * is about what is painted on them, so the context records nothing and returns
 * nothing. The i18n rule those textures carry is asserted properly in
 * crossroads-textures.spec.ts, against a stub that does remember.
 */
function stubDocument(): () => void {
  const ctx2d = new Proxy(
    {},
    { get: (_t, key) => (key === 'canvas' ? {} : () => undefined), set: () => true },
  );
  const scope = globalThis as unknown as { document?: unknown };
  const had = 'document' in scope;
  scope.document = {
    createElement: () => ({ width: 0, height: 0, getContext: () => ctx2d }),
    fonts: undefined,
  };
  return () => {
    if (!had) delete scope.document;
  };
}

export type Lane = {
  key: string;
  group: Group;
  units: Unit[];
  corners: Vector3[];
  box: Box3;
};

/** Every world-space corner of every solid in one lane group. */
function cornersOf(group: Group): Vector3[] {
  group.updateMatrixWorld(true);
  const out: Vector3[] = [];
  const box = new Box3();
  group.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    child.geometry.computeBoundingBox();
    const local = child.geometry.boundingBox;
    if (!local) return;
    box.copy(local).applyMatrix4(child.matrixWorld);
    for (const x of [box.min.x, box.max.x]) {
      for (const y of [box.min.y, box.max.y]) {
        for (const z of [box.min.z, box.max.z]) out.push(new Vector3(x, y, z));
      }
    }
  });
  return out;
}

/**
 * The fan, built exactly as boot() builds it.
 *
 * The rotation is the one in scene.ts rather than a copy of the intent. A lane
 * measured at the wrong angle is a lane nobody ever sees, and the whole value
 * of projecting these without a GPU is that the numbers describe the shipped
 * scene.
 */
export function buildLanes(): Lane[] {
  const restore = stubDocument();
  const track = <T>(item: T): T => item;
  const out: Lane[] = [];
  try {
    for (const geom of LANES) {
      const group = new Group();
      group.rotation.y = geom.angle;
      const units = BUILDERS[geom.key]({ lane: group, z: -geom.dist, track, labels: LABELS.de });
      const corners = cornersOf(group);
      out.push({ key: geom.key, group, units, corners, box: new Box3().setFromPoints(corners) });
    }
  } finally {
    restore();
  }
  return out;
}
