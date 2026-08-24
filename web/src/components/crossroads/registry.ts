/**
 * Everything the scene allocates on the GPU, in one place, so stop() can put
 * all of it back.
 *
 * three.js frees nothing when you remove a mesh from a scene, and it frees
 * nothing when you dispose the renderer either: geometries, materials and
 * textures are all owned separately. A component that mounts and unmounts on
 * route changes therefore leaks an entire scene each time unless something
 * tracks them. The prototype disposed the renderer alone.
 */
export type Disposable = { dispose(): void };

export function createRegistry() {
  const items = new Set<Disposable>();
  return {
    /** Tracks and returns its argument, so it can wrap a constructor call. */
    track<T extends Disposable>(item: T): T {
      items.add(item);
      return item;
    },
    size: (): number => items.size,
    disposeAll(): void {
      for (const item of items) item.dispose();
      items.clear();
    },
  };
}
