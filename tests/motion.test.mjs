import assert from 'node:assert/strict';
import {tiltAxes} from '../src/motion.js';
assert.deepEqual(tiltAxes(20,10,0),{pitch:20,roll:10});
const landscape=tiltAxes(20,10,90);assert.ok(Math.abs(landscape.pitch+10)<1e-8);assert.ok(Math.abs(landscape.roll-20)<1e-8);
console.log('Motion: portrait and landscape sensor axes pass.');
