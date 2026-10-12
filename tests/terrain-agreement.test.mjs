import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorldData } from '../src/world-data.js';

test('collision agrees with the rendered Quiet Peaks triangle within one meter', () => {
  const data = createWorldData(42);
  const island = data.islands.find(value => value.name === 'Quiet Peaks');
  // Matches world.js high-detail terrain: 26 radial rings, 80 angular segments.
  const point = (ring, segment) => {
    const angle = segment / 80 * Math.PI * 2;
    const radius = ring / 26 * data.coast(island, angle);
    const x = island.x + Math.cos(angle) * island.rx * radius;
    const z = island.z + Math.sin(angle) * island.rz * radius;
    return { x, z, y: (data.surfaceHeight ?? data.terrainHeight)(x, z) };
  };
  const vertices = [point(11, 5), point(11, 6), point(12, 5)];
  const mean = key => vertices.reduce((sum, vertex) => sum + vertex[key], 0) / 3;
  const visibleHeight = mean('y');
  const collisionHeight = data.terrainHeight(mean('x'), mean('z'));
  assert.ok(Math.abs(collisionHeight - visibleHeight) < 1,
    `Collision ${collisionHeight.toFixed(2)} m differs from visible terrain ${visibleHeight.toFixed(2)} m`);
});
