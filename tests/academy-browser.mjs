import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const html = await fs.readFile('index.html', 'utf8');
const channel = process.env.SKYJOURNEY_BROWSER_CHANNEL;
const browser = await chromium.launch({ ...(channel ? { channel } : {}), headless: true });
const origin = 'https://academy.skyjourney.test/';
await fs.mkdir('artifacts', { recursive: true });

async function boot(page) {
  await page.route('**/*', route => route.request().url().startsWith(origin)
    ? route.fulfill({ status: 200, contentType: 'text/html', body: html }) : route.abort());
  await page.goto(origin);
  await page.waitForFunction(() => window.SkyJourney?.state?.flightTime > 0);
  await page.locator('#loader').waitFor({ state: 'detached' });
  await page.evaluate(() => SkyJourney.action('quality', 'performance'));
}

async function select(page, id) {
  await page.locator('[data-panel="flight"]').click();
  assert.equal(await page.locator('[data-academy-start]').count(), 3, 'Flight offers three playable challenges');
  await page.locator(`[data-academy-start="${id}"]`).click();
  await page.locator('#academy-hud').waitFor({ state: 'visible' });
}

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 820 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await boot(page);
  const prior = await page.evaluate(() => ({ ...SkyJourney.state.position }));
  await select(page, 'first-landing');
  assert.equal(await page.locator('#panel-flight').isVisible(), false);
  assert.equal(await page.evaluate(() => SkyJourney.diagnostics.camera), 'Pilot');
  assert.equal(await page.evaluate(() => SkyJourney.diagnostics.weather), 'Clear Skies');
  assert.equal(await page.evaluate(() => SkyJourney.autopilot.enabled), false);
  await page.screenshot({ path: 'artifacts/academy-approach.png' });
  await page.keyboard.press('Escape');
  await page.locator('.pause-screen').waitFor({ state: 'visible' });
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.pause-screen').isVisible(), false, 'Escape resumes even when the pause button has focus');

  // Place the aircraft just above the aim point; let the actual fixed-step flight code register contact.
  await page.evaluate(() => {
    const { state, airport } = SkyJourney.simulation;
    const heading = airport.heading * Math.PI / 180;
    const along = -airport.length / 2 + 300;
    Object.assign(state.position, { x: airport.x + Math.sin(heading) * along, y: airport.y + 3.7, z: airport.z - Math.cos(heading) * along });
    Object.assign(state.velocity, { x: Math.sin(heading) * 72, y: -1.5, z: -Math.cos(heading) * 72 });
    Object.assign(state, { heading, roll: 0, pitch: .05, gear: 1, gearTarget: 1 });
  });
  await page.locator('#academy-result').waitFor({ state: 'visible' });
  assert.equal(await page.evaluate(() => SkyJourney.state.onGround), true);
  const best = await page.evaluate(() => JSON.parse(localStorage.getItem('skyjourney-academy-v1'))['first-landing']);
  assert.ok(best >= 70 && best <= 100, 'a clean real contact earns a stored score');
  await page.screenshot({ path: 'artifacts/academy-debrief.png' });
  await page.locator('#academy-result [data-action="academyRetry"]').click();
  await page.locator('#academy-result').waitFor({ state: 'hidden' });
  assert.equal(await page.evaluate(() => SkyJourney.state.onGround), false);
  await page.locator('#academy-hud [data-action="academyExit"]:visible').first().click();
  await page.locator('#academy-hud').waitFor({ state: 'hidden' });
  const returned = await page.evaluate(() => SkyJourney.state.position);
  assert.ok(Math.hypot(returned.x - prior.x, returned.z - prior.z) < 600, 'exit restores the original trip');
  assert.equal(await page.evaluate(() => SkyJourney.diagnostics.weather), 'Golden Sunset');
  const clearance = await page.evaluate(async () => {
    await SkyJourney.action('reset', 'approach');
    const { state, airport, surfaceAt } = SkyJourney.simulation;
    const heading = airport.heading * Math.PI / 180;
    const forward = { x: Math.sin(heading), z: -Math.cos(heading) };
    const along = (state.position.x - airport.x) * forward.x + (state.position.z - airport.z) * forward.z;
    const speed = state.velocity.x * forward.x + state.velocity.z * forward.z;
    const untilThreshold = (-airport.length / 2 - along) / speed;
    return Math.min(...Array.from({ length: 33 }, (_, i) => {
      const t = untilThreshold * i / 32;
      return state.position.y + state.velocity.y * t - surfaceAt(state.position.x + state.velocity.x * t, state.position.z + state.velocity.z * t);
    }));
  });
  assert.ok(clearance > 10, 'ordinary approach practice starts clear of the hills before the threshold');
  assert.equal(await page.locator('#academy-hud').isVisible(), false, 'free approach practice remains unscored');

  await page.reload();
  await page.waitForFunction(() => window.SkyJourney?.state?.flightTime > 0);
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('skyjourney-academy-v1'))['first-landing']), best);
  await page.locator('#loader').waitFor({ state: 'detached' });
  await select(page, 'night-landing');
  assert.equal(await page.evaluate(() => SkyJourney.diagnostics.weather), 'Starry Night');
  assert.ok(await page.evaluate(() => SkyJourney.world.env.time >= 21));
  await page.screenshot({ path: 'artifacts/academy-night.png' });
  assert.deepEqual(errors, []);
  await page.close();

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await boot(mobile);
  await mobile.evaluate(() => SkyJourney.action('language', 'es'));
  await select(mobile, 'storm-landing');
  assert.equal(await mobile.evaluate(() => SkyJourney.diagnostics.weather), 'Thunderstorm');
  assert.ok(await mobile.evaluate(() => SkyJourney.world.env.rain > .8));
  assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth), 390);
  assert.equal(await mobile.locator('.touch-joystick').isVisible(), true);
  await mobile.screenshot({ path: 'artifacts/academy-mobile.png' });
  await mobile.setViewportSize({ width: 844, height: 390 });
  assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth), 844);
  assert.equal(await mobile.locator('#academy-hud').isVisible(), true);
  const nav = await mobile.locator('.nav-button').last().boundingBox();
  const stick = await mobile.locator('.touch-joystick').boundingBox();
  assert.ok(nav && stick && nav.y + nav.height <= stick.y, 'landscape menu stays above the joystick');
  await mobile.screenshot({ path: 'artifacts/academy-landscape.png' });
  console.log('Landing academy: real touchdown, record, retry, free flight return, night, storm and responsive HUD passed.');
} finally {
  await browser.close();
}
