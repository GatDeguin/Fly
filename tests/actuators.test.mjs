import test from 'node:test';
import assert from 'node:assert/strict';
import { createSimulation } from '../src/simulation.js';

const advance = (simulation, seconds = 5) => {
  for (let step = 0; step < seconds * 60; step++) simulation.update(1 / 60);
};

test('a gear target deploys the actual gear and adds aerodynamic drag', () => {
  const deployed = createSimulation();
  const retracted = createSimulation();
  deployed.state.gearTarget = 1;
  advance(deployed);
  advance(retracted);
  assert.ok(deployed.state.gear > .999, `Gear target did not deploy: ${deployed.state.gear}`);
  assert.ok(deployed.diagnostics.drag > retracted.diagnostics.drag * 1.15,
    'Deployed landing gear should materially increase aerodynamic drag');
});

test('a gear target retracts gear already deployed in flight', () => {
  const simulation = createSimulation();
  simulation.state.gear = simulation.state.gearTarget = 1;
  simulation.state.gearTarget = 0;
  advance(simulation);
  assert.ok(simulation.state.gear < .001, `Gear target did not retract: ${simulation.state.gear}`);
});

test('the gear actuator follows an explicit target while on the runway', () => {
  const simulation = createSimulation();
  simulation.reset('runway');
  simulation.state.gearTarget = 0;
  advance(simulation);
  assert.equal(simulation.state.onGround, true);
  assert.ok(simulation.state.gear < .001, 'An explicit gear target should still operate on the ground');
});
test('a gear-up touchdown remains a hard landing in simulation mode',()=>{
 const simulation=createSimulation();simulation.reset('approach');simulation.settings.mode='simulation';
 Object.assign(simulation.state,{position:{x:0,y:124.2,z:0},gear:0,gearTarget:0,pitch:0,throttle:.4});
 simulation.state.velocity.y=-1;advance(simulation,1);
 assert.equal(simulation.state.onGround,true);assert.equal(simulation.state.status,'hard landing');
});
