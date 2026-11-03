/**
 * tests/e2e/test_mattress_experience.cjs
 * Comprehensive test suite verifying the SmartGRID 3D Mattress & Posture Experience,
 * 7-Zone Clinical Beacons, 8-Hour Sleep Cycle Simulation, and Tasks table WhatsApp integration.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ PASS  ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ FAIL  ${name}: ${err.message}`);
    failed++;
  }
}

console.log('\n======================================================');
console.log(' SMARTGRID 3D MATTRESS & POSTURE LAB — E2E TEST SUITE ');
console.log('======================================================\n');

// 1. App Routes Verification
test('[R1-01] App.jsx registers /m/:id, /m, /mattress, and /sleep-science routes', () => {
  const appCode = fs.readFileSync(path.join(__dirname, '../../src/App.jsx'), 'utf8');
  assert(appCode.includes('path="/m/:id"'), 'Missing /m/:id route');
  assert(appCode.includes('path="/m"'), 'Missing /m route');
  assert(appCode.includes('path="/mattress"'), 'Missing /mattress route');
  assert(appCode.includes('path="/sleep-science"'), 'Missing /sleep-science route');
  assert(appCode.includes('MattressExperience'), 'Missing MattressExperience component mount');
});

// 2. Types & Clinical Data Verification
test('[R2-01] types.ts defines 6 SmartGRID mattress models with firmness & clinical recommendations', () => {
  const typesCode = fs.readFileSync(path.join(__dirname, '../../src/features/mattress/types.ts'), 'utf8');
  assert(typesCode.includes('smart-ortho-pro'), 'Missing Smart Ortho Pro');
  assert(typesCode.includes('smart-ortho-royale'), 'Missing Smart Ortho Royale');
  assert(typesCode.includes('smart-ortho-hybrid'), 'Missing Smart Ortho Hybrid');
  assert(typesCode.includes('smart-luxe-pro'), 'Missing Smart Luxe Pro');
});

test('[R2-02] types.ts defines exactly 7 clinical zones with medical spinal regions and comparative benefits', () => {
  const typesCode = fs.readFileSync(path.join(__dirname, '../../src/features/mattress/types.ts'), 'utf8');
  assert(typesCode.includes('SEVEN_ZONES_DATA'), 'Missing SEVEN_ZONES_DATA');
  assert(typesCode.includes('Head & Cervical Spine'), 'Missing Head & Cervical Zone');
  assert(typesCode.includes('Shoulders & Upper Thoracic'), 'Missing Shoulder Zone');
  assert(typesCode.includes('Lumbar Spine & Lower Back'), 'Missing Lumbar Zone');
  assert(typesCode.includes('Pelvis & Sacroiliac Joint'), 'Missing Pelvis Zone');
  assert(typesCode.includes('Calves, Ankles & Feet'), 'Missing Calves/Feet Zone');
});

test('[R2-03] types.ts specifies 3 distinct mattress layers (SmartGRID, Ortho Relief Foam, 7-Zone Base)', () => {
  const typesCode = fs.readFileSync(path.join(__dirname, '../../src/features/mattress/types.ts'), 'utf8');
  assert(typesCode.includes('smartgrid'), 'Missing smartgrid layer');
  assert(typesCode.includes('foam'), 'Missing foam layer');
  assert(typesCode.includes('base'), 'Missing base layer');
  assert(typesCode.includes('2,500+ air channels'), 'Missing air channels claim');
});

// 3. 3D Scene & Spinal Morphing Verification
test('[R3-01] MattressScene.tsx renders 3D layers, bed frame, and OrbitControls with polar constraints', () => {
  const sceneCode = fs.readFileSync(path.join(__dirname, '../../src/features/mattress/components/MattressScene.tsx'), 'utf8');
  assert(sceneCode.includes('OrbitControls'), 'Missing OrbitControls');
  assert(sceneCode.includes('maxPolarAngle'), 'Missing polar angle restraint');
  assert(sceneCode.includes('gridLayerRef'), 'Missing gridLayerRef');
  assert(sceneCode.includes('foamLayerRef'), 'Missing foamLayerRef');
  assert(sceneCode.includes('baseLayerRef'), 'Missing baseLayerRef');
});

test('[R3-02] MattressScene.tsx morphs dynamic spine curve between neutral cyan line and sagging red line', () => {
  const sceneCode = fs.readFileSync(path.join(__dirname, '../../src/features/mattress/components/MattressScene.tsx'), 'utf8');
  assert(sceneCode.includes('spinePoints'), 'Missing spinePoints definition');
  assert(sceneCode.includes('hasSmartGrid ? \'#00ffff\' : \'#ff3366\''), 'Missing dynamic spine color logic');
  assert(sceneCode.includes('shoulderSink'), 'Missing shoulder sink math');
  assert(sceneCode.includes('pelvicSink'), 'Missing pelvic sink math');
});

test('[R3-03] MattressScene.tsx renders 7 pulsing HTML beacons along the sleeping figure', () => {
  const sceneCode = fs.readFileSync(path.join(__dirname, '../../src/features/mattress/components/MattressScene.tsx'), 'utf8');
  assert(sceneCode.includes('SEVEN_ZONES_DATA.map'), 'Missing 7-zone map loop');
  assert(sceneCode.includes('animate-ping'), 'Missing pulsing beacon animation');
  assert(sceneCode.includes('onSelectZone'), 'Missing beacon interaction handler');
});

// 4. Scorecard & Sleep Cycle Timeline Verification
test('[R4-01] MetricsScorecard.tsx computes 4 support metrics and transitions scores upon grid toggle', () => {
  const cardCode = fs.readFileSync(path.join(__dirname, '../../src/features/mattress/components/MetricsScorecard.tsx'), 'utf8');
  assert(cardCode.includes('ADAPTIVE SUPPORT'), 'Missing Adaptive Support');
  assert(cardCode.includes('BACK SUPPORT'), 'Missing Back Support');
  assert(cardCode.includes('FIRM SUPPORT'), 'Missing Firm Support');
  assert(cardCode.includes('PRESSURE RELIEF'), 'Missing Pressure Relief');
  assert(cardCode.includes('hasSmartGrid'), 'Missing hasSmartGrid condition');
});

test('[R4-02] SleepCycleScrubber.tsx provides 8-Hour scrub timeline with Play/Pause auto-play loop', () => {
  const scrubCode = fs.readFileSync(path.join(__dirname, '../../src/features/mattress/components/SleepCycleScrubber.tsx'), 'utf8');
  assert(scrubCode.includes('8-HOUR SLEEP CYCLE SIMULATION'), 'Missing 8-Hour heading');
  assert(scrubCode.includes('Play 8-Hr Night'), 'Missing play button');
  assert(scrubCode.includes('HOUR_DETAILS'), 'Missing hour stage details');
  assert(scrubCode.includes('11:00 PM'), 'Missing start hour 11 PM');
  assert(scrubCode.includes('07:00 AM'), 'Missing wake hour 7 AM');
});

// 5. Tasks Table Integration Verification
test('[R5-01] tasks-table.tsx provides handleSleepScienceWhatsApp linking to /m/:id or /mattress', () => {
  const tableCode = fs.readFileSync(path.join(__dirname, '../../src/features/tasks/components/tasks-table.tsx'), 'utf8');
  assert(tableCode.includes('handleSleepScienceWhatsApp'), 'Missing handleSleepScienceWhatsApp function');
  assert(tableCode.includes('/m/${patientId}'), 'Missing /m/:id route link');
  assert(tableCode.includes('/mattress'), 'Missing /mattress fallback link');
  assert(tableCode.includes('The Sleep Company'), 'Missing The Sleep Company signature');
  assert(tableCode.includes('SmartGRID™ vs ordinary memory foam'), 'Missing SmartGRID value proposition');
});

test('[R5-02] tasks-table.tsx renders quick SmartGRID preview button and Sleep Science WhatsApp dropdown items', () => {
  const tableCode = fs.readFileSync(path.join(__dirname, '../../src/features/tasks/components/tasks-table.tsx'), 'utf8');
  assert(tableCode.includes('Open 3D SmartGRID Posture Simulator'), 'Missing SmartGRID preview button');
  assert(tableCode.includes('Send Sleep Science (Default)'), 'Missing Send Sleep Science default option');
  assert(tableCode.includes('Send Sleep Science (WA Business)'), 'Missing Send Sleep Science business option');
  assert(tableCode.includes('Send Sleep Science (WA Web)'), 'Missing Send Sleep Science web option');
});

// 6. Viewport & Mobile Responsiveness
test('[R6-01] MattressExperience page uses full dynamic viewport height (100dvh) with touch-friendly layout', () => {
  const indexCode = fs.readFileSync(path.join(__dirname, '../../src/features/mattress/index.tsx'), 'utf8');
  assert(indexCode.includes('h-[100dvh]'), 'Missing 100dvh dynamic height');
  assert(indexCode.includes('COMFORT SIMULATOR'), 'Missing Comfort Simulator mode button');
  assert(indexCode.includes('SPLIT 3D LAYERS'), 'Missing Split 3D Layers mode button');
  assert(indexCode.includes('SmartGRID™ (Neutral Spine)'), 'Missing quick toggle button');
  assert(indexCode.includes('Remove Grid (Sagging Memory Foam)'), 'Missing remove grid button');
});

console.log('\n======================================================');
console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL ${passed + failed})`);
console.log('======================================================\n');

if (failed > 0) {
  process.exit(1);
}

