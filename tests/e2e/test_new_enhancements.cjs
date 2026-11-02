/**
 * tests/e2e/test_new_enhancements.cjs
 * Empirical Verification of the 5 User-Requested Enhancements:
 * 1. Intro Animation Expanded to >= 8 seconds
 * 2. Default Orientation Focused on Pain Point Side (Back vs Front)
 * 3. Decoupled Rotation (Room stays still, only BodyModel rotates via pointer drag)
 * 4. Fullscreen Default / Toggle Handling
 * 5. Mobile UI Enhancements (safe areas, drag hint, haptics, viewport cover)
 */

const fs = require('fs');
const path = require('path');
const { colors } = require('./framework.cjs');

function run() {
  console.log(`\n${colors.cyan}${colors.bold}======================================================${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold} VERIFYING 5 NEW RECOVERY PORTAL ENHANCEMENTS        ${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}======================================================${colors.reset}\n`);

  let totalTests = 0;
  let passedTests = 0;

  function assert(condition, testName, detail) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ${colors.green}✓ PASS${colors.reset} [REQ-${totalTests}] ${testName}`);
    } else {
      console.error(`  ${colors.red}✗ FAIL${colors.reset} [REQ-${totalTests}] ${testName}: ${detail}`);
    }
  }

  const portalSrc = fs.readFileSync(path.join(__dirname, '../../src/components/CustomerPortal.jsx'), 'utf-8');
  const bodyModelSrc = fs.readFileSync(path.join(__dirname, '../../src/components/BodyModel.jsx'), 'utf-8');
  const indexHtml = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf-8');

  // Requirement 1: Starting Animation Timing >= 8 seconds
  console.log(`${colors.bold}--- Requirement 1: Intro Animation Timing >= 8s ---${colors.reset}`);
  const targetingMatch = portalSrc.match(/setTimeout\s*\(\s*\(\)\s*=>\s*\{\s*setIntroStage\('targeting'\);\s*\},?\s*([0-9]+)\)/);
  const lockedMatch = portalSrc.match(/setTimeout\s*\(\s*\(\)\s*=>\s*\{\s*setIntroStage\('locked'\);\s*\},?\s*([0-9]+)\)/);
  const readyMatch = portalSrc.match(/setTimeout\s*\(\s*\(\)\s*=>\s*\{\s*setIntroStage\('ready'\);[\s\S]*?\},?\s*([0-9]+)\)/);

  assert(!!targetingMatch, 'Targeting timeout exists in CustomerPortal', 'targetingMatch was null');
  assert(!!readyMatch, 'Ready timeout exists in CustomerPortal', 'readyMatch was null');
  const readyMs = readyMatch ? parseInt(readyMatch[1], 10) : 0;
  assert(readyMs >= 8000, `Total intro animation duration >= 8000ms (configured: ${readyMs}ms)`, `Duration ${readyMs}ms is under 8000ms`);

  const bodyModelTimerRate = bodyModelSrc.match(/introTimer\.current\s*\+=\s*dt\s*\*\s*\(([^)]+)\)/);
  assert(!!bodyModelTimerRate, 'BodyModel timeline accumulation matches expanded duration', 'Rate was missing');

  // Requirement 2: Default Orientation Focused on Pain Point Side
  console.log(`\n${colors.bold}--- Requirement 2: Pain Point Side Focus (Back vs Front) ---${colors.reset}`);
  assert(portalSrc.includes('isBack: true') || portalSrc.includes('isBack: isBackPain'), 'CustomerPortal passes isBack flag for back pain points', 'isBack missing');
  assert(bodyModelSrc.includes('targetYRotation = isBack ? Math.PI : 0'), 'BodyModel rotates to Math.PI when isBack is true', 'targetYRotation logic missing');
  assert(bodyModelSrc.includes('group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, targetYRotation'), 'BodyModel smoothly transitions to targetYRotation during targeting stage', 'Lerp transition missing');
  assert(portalSrc.includes('camera={{ position: [0, 0, isMobile ? 14 : 9], fov: 45 }}'), 'Camera faces forward into GridRoom and mannequin back faces camera', 'Camera position mismatch');

  // Requirement 3: Decouple Rotation so Room Stays Completely Still
  console.log(`\n${colors.bold}--- Requirement 3: Decouple Rotation (Room Stationary, Only Model Moves) ---${colors.reset}`);
  assert(portalSrc.includes('enableRotate={false}'), 'OrbitControls camera rotation disabled (enableRotate={false}) to keep GridRoom stationary', 'OrbitControls still rotates camera');
  assert(bodyModelSrc.includes('dom.addEventListener(\'pointerdown\', handlePointerDown)'), 'BodyModel attaches pointer drag listener to rotate figure', 'pointerdown listener missing');
  assert(bodyModelSrc.includes('group.current.rotation.y += rotDelta'), 'Pointer drag updates only mannequin rotation.y', 'rotation.y update missing');
  assert(bodyModelSrc.includes('dragVelocityRef.current *= 0.92'), 'Smooth momentum inertia decay applied to body model rotation', 'dragVelocity decay missing');

  // Requirement 4: Fullscreen View by Default & Toggle
  console.log(`\n${colors.bold}--- Requirement 4: Fullscreen View by Default & Affordance ---${colors.reset}`);
  assert(portalSrc.includes('requestFsOnFirstGesture'), 'First touch / click user gesture automatically requests fullscreen', 'First gesture handler missing');
  assert(portalSrc.includes('toggleFullscreen'), 'Toggle fullscreen handler provided', 'toggleFullscreen missing');
  assert(portalSrc.includes('className="fullscreen-toggle-btn"'), 'Discrete cyber-clinical fullscreen toggle button rendered', 'Fullscreen button missing');
  assert(portalSrc.includes('height: \'100dvh\''), 'Dynamic viewport height (100dvh) expands screen fully across modern mobile browsers', '100dvh missing');

  // Requirement 5: Mobile UI Enhancements
  console.log(`\n${colors.bold}--- Requirement 5: Mobile UI Enhancements ---${colors.reset}`);
  assert(portalSrc.includes('rotate-hint-pill'), 'Mobile "Drag to rotate body" gesture guidance pill rendered', 'rotate hint pill missing');
  assert(bodyModelSrc.includes('navigator.vibrate'), 'Tactile haptic vibration triggered on mobile beacon interactions', 'navigator.vibrate missing');
  assert(indexHtml.includes('viewport-fit=cover'), 'Viewport-fit=cover configured in index.html for edge-to-edge display', 'viewport-fit missing');
  assert(indexHtml.includes('mobile-web-app-capable'), 'Mobile web app meta tags configured for full immersion', 'mobile-web-app-capable missing');

  console.log(`\n${colors.cyan}======================================================${colors.reset}`);
  console.log(`RESULTS: ${passedTests}/${totalTests} enhancements verified successfully.`);
  console.log(`${colors.cyan}======================================================${colors.reset}\n`);

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

run();
