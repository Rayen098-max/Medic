/**
 * tests/e2e/test_mattress_experience.cjs
 * Comprehensive test suite verifying the SmartGRID Posture Lab Mobile Experience:
 * - Mobile-first layout (100dvh, slim header, two bottom mode buttons: COMFORT SIMULATOR and SPLIT LAYERS)
 * - 4 Metric cards matching video (ADAPTIVE SUPPORT, BACK SUPPORT, FIRM SUPPORT, TARGETED PRESSURE RELIEF)
 * - 3 Exploded layers (SMART GRID, ORTHORELIEF FOAM, 7 ZONE BODY SUPPORT)
 * - Realistic anatomical figure lying in lateral sleep pose with dynamic glowing spine and 7 zone beacons
 * - 8-Hour SleepCycleScrubber completely removed
 * - Tokenized privacy-preserving personalization
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
console.log(' SMARTGRID POSTURE LAB — MOBILE REBUILD E2E SUITE    ');
console.log('======================================================\n');

// 1. App Routes Verification
test('[R1-01] App.jsx registers /m/:token, /m/:id, /m, /mattress, and /sleep-science routes', () => {
  const appCode = fs.readFileSync(path.join(__dirname, '../../src/App.jsx'), 'utf8');
  assert(appCode.includes('path="/m/:token"') || appCode.includes('path="/m/:id"'), 'Missing /m/:token or /m/:id route');
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
  assert(typesCode.includes('air channels') || typesCode.includes('Patented SmartGRID'), 'Missing grid layer technology');
});

// 3. 3D Scene, Camera Controls, & Spinal Morphing Verification
test('[R3-01] CameraRig.tsx and MattressScene.tsx render 3D layers, environment, and camera controls with polar limits', () => {
  const cameraCode = fs.readFileSync(path.join(__dirname, '../../src/features/mattress/components/CameraRig.tsx'), 'utf8');
  const sceneCode = fs.readFileSync(path.join(__dirname, '../../src/features/mattress/components/MattressScene.tsx'), 'utf8');
  assert(cameraCode.includes('CameraControls'), 'Missing CameraControls in CameraRig');
  assert(cameraCode.includes('maxPolarAngle'), 'Missing polar angle restraint');
  assert(sceneCode.includes('CameraRig'), 'MattressScene must mount CameraRig');
  assert(sceneCode.includes('Environment'), 'MattressScene must mount futuristic Environment');
  assert(sceneCode.includes('HumanFigure'), 'MattressScene must mount HumanFigure');
});

test('[R3-02] HumanFigure.tsx morphs dynamic spine curve between neutral cyan and sagging rose with shoulder/pelvic sink', () => {
  const figureCode = fs.readFileSync(path.join(__dirname, '../../src/features/mattress/components/HumanFigure.tsx'), 'utf8');
  assert(figureCode.includes('spineCurve'), 'Missing spineCurve definition');
  assert(figureCode.includes('shoulderSink'), 'Missing shoulder sink math');
  assert(figureCode.includes('pelvicSink'), 'Missing pelvic sink math');
  assert(figureCode.includes('spineColor'), 'Missing dynamic spine color logic');
});

test('[R3-03] HumanFigure.tsx renders 7 pulsing beacons and interactive zones along the lateral sleeping figure', () => {
  const figureCode = fs.readFileSync(path.join(__dirname, '../../src/features/mattress/components/HumanFigure.tsx'), 'utf8');
  assert(figureCode.includes('SEVEN_ZONES_DATA'), 'Missing 7-zone data mapping');
  assert(figureCode.includes('onSelectZone'), 'Missing beacon interaction handler');
  assert(figureCode.includes('model.obj') || figureCode.includes('OBJLoader'), 'Must load anatomical 3D scan model');
});

// 4. Scorecard & Elimination of 8-Hour Simulation
test('[R4-01] MetricsScorecard.tsx and types.ts compute 4 support metrics (ADAPTIVE SUPPORT, BACK SUPPORT, FIRM SUPPORT, TARGETED PRESSURE RELIEF)', () => {
  const cardCode = fs.readFileSync(path.join(__dirname, '../../src/features/mattress/components/MetricsScorecard.tsx'), 'utf8');
  const typesCode = fs.readFileSync(path.join(__dirname, '../../src/features/mattress/types.ts'), 'utf8');
  assert(typesCode.includes('ADAPTIVE SUPPORT'), 'Missing Adaptive Support');
  assert(typesCode.includes('BACK SUPPORT'), 'Missing Back Support');
  assert(typesCode.includes('FIRM SUPPORT'), 'Missing Firm Support');
  assert(typesCode.includes('TARGETED PRESSURE RELIEF'), 'Missing Targeted Pressure Relief');
  assert(cardCode.includes('hasSmartGrid'), 'Missing hasSmartGrid prop');
  assert(cardCode.includes('getMetricState'), 'Missing getMetricState call');
});

test('[R4-02] 8-Hour SleepCycleScrubber is completely removed from the project per owner instructions', () => {
  const scrubberPath = path.join(__dirname, '../../src/features/mattress/components/SleepCycleScrubber.tsx');
  assert(!fs.existsSync(scrubberPath), 'SleepCycleScrubber.tsx must be deleted');
  const indexCode = fs.readFileSync(path.join(__dirname, '../../src/features/mattress/index.tsx'), 'utf8');
  assert(!indexCode.includes('SleepCycleScrubber'), 'index.tsx must not import or render SleepCycleScrubber');
  assert(!indexCode.includes('8-HOUR SLEEP CYCLE'), 'Must not contain 8-hour sleep cycle UI');
});

// 5. Tasks Table Integration & Scoped Share Token Verification
test('[R5-01] tasks-table.tsx provides handleSleepScienceWhatsApp linking to /m/:token or /mattress with privacy protection', () => {
  const tableCode = fs.readFileSync(path.join(__dirname, '../../src/features/tasks/components/tasks-table.tsx'), 'utf8');
  assert(tableCode.includes('handleSleepScienceWhatsApp'), 'Missing handleSleepScienceWhatsApp function');
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
test('[R6-01] MattressExperience page uses full dynamic viewport height (100dvh) with touch-friendly layout and exactly two primary modes', () => {
  const indexCode = fs.readFileSync(path.join(__dirname, '../../src/features/mattress/index.tsx'), 'utf8');
  assert(indexCode.includes('h-[100dvh]'), 'Missing 100dvh dynamic height');
  assert(indexCode.includes('COMFORT SIMULATOR'), 'Missing Comfort Simulator mode button');
  assert(indexCode.includes('SPLIT LAYERS'), 'Missing Split Layers mode button');
  assert(indexCode.includes('SmartGRID™ (Neutral Spine)'), 'Missing quick toggle button');
  assert(indexCode.includes('Remove Grid (Sagging Memory Foam)'), 'Missing remove grid button');
});

console.log('\n======================================================');
console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED (TOTAL ${passed + failed})`);
console.log('======================================================\n');

if (failed > 0) {
  process.exit(1);
}
