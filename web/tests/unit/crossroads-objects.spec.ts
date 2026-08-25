import { expect, test } from '@playwright/test';
import { LineSegments, Mesh } from 'three';

import { BUILDERS } from '../../src/components/crossroads/objects';
import { buildLanes } from './support/scene';

test('there is exactly one builder per service, keyed and not indexed', () => {
  // Keyed, so reordering the copy cannot silently repoint an object at the
  // wrong service. A missing key here is a lane with nothing at the end of it.
  expect(Object.keys(BUILDERS).sort()).toEqual(['app', 'capacity', 'care', 'website']);
});

/**
 * The drawing and the thing cannot drift apart.
 *
 * This is the one guarantee the whole directory is built around and nothing
 * asserted it. Every solid gets a LineSegments sibling built by EdgesGeometry
 * from the very same BufferGeometry instance, so the two describe the same
 * shape at any camera angle. What can be checked without a renderer is the
 * consequence: the pair sit at the same place, at the same angle, at the same
 * scale, and their geometries occupy the same box.
 *
 * The scale is not padding. `piece` takes a squash used by the cloud, and a
 * scale set on the mesh alone would leave the drawing describing a shape the
 * solid does not have. That is exactly the bug this asserts against.
 */
test('every solid has a drawing of itself, in register', () => {
  for (const lane of buildLanes()) {
    const meshes: Mesh[] = [];
    const lines: LineSegments[] = [];
    lane.group.traverse((child) => {
      if (child instanceof LineSegments) lines.push(child);
      else if (child instanceof Mesh) meshes.push(child);
    });

    expect(meshes.length, `${lane.key} has no solids`).toBeGreaterThan(0);
    expect(lines.length, `${lane.key} has a solid with no drawing`).toBe(meshes.length);

    for (const [i, mesh] of meshes.entries()) {
      const line = lines[i];
      expect(line, `${lane.key} solid ${i} has no drawing`).toBeDefined();
      if (!line) continue;
      const where = `${lane.key} solid ${i}`;
      expect(line.position.distanceTo(mesh.position), `${where} sits apart`).toBeLessThan(1e-9);
      expect(line.scale.distanceTo(mesh.scale), `${where} is scaled apart`).toBeLessThan(1e-9);
      expect(line.rotation.x, `${where} is turned apart`).toBeCloseTo(mesh.rotation.x, 12);
      expect(line.rotation.y, `${where} is turned apart`).toBeCloseTo(mesh.rotation.y, 12);

      mesh.geometry.computeBoundingBox();
      line.geometry.computeBoundingBox();
      const solid = mesh.geometry.boundingBox;
      const drawn = line.geometry.boundingBox;
      expect(solid, `${where} has no solid box`).toBeTruthy();
      expect(drawn, `${where} has no drawn box`).toBeTruthy();
      if (!solid || !drawn) continue;
      expect(drawn.min.distanceTo(solid.min), `${where} describes a smaller shape`).toBeLessThan(
        1e-6,
      );
      expect(drawn.max.distanceTo(solid.max), `${where} describes a larger shape`).toBeLessThan(
        1e-6,
      );
    }
  }
});
