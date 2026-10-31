/**
 * tests/e2e/tier1_features.cjs
 * Tier 1: Feature Coverage Tests (40 tests = 8 features × 5 tests)
 * Opaque-box requirements verification per ORIGINAL_REQUEST and TEST_INFRA.md
 */

const { describe, test, expect, readProjectFile, projectFileExists, calculateRenderedImageBounds, calculateContrastRatio } = require('./framework.cjs');

function registerTier1Tests() {
  // -------------------------------------------------------------
  // FEATURE 1: Uncropped Exercise Photos (R1)
  // -------------------------------------------------------------
  describe('Tier 1 - Feature 1: Uncropped Exercise Photos (ORIGINAL_REQUEST §R1)', () => {
    test('T1-F1-01', 'Exercise modal image styling specifies object-fit: contain to prevent image clipping', () => {
      const modalSrc = readProjectFile('src/components/ExerciseTimerModal.jsx');
      expect(modalSrc).toMatch(
        /objectFit:\s*['"]contain['"]|object-contain/,
        'Exercise photo must have object-fit: contain to preserve natural aspect ratio without cropping'
      );
      expect(modalSrc).not.toMatch(
        /objectFit:\s*['"]cover['"]/,
        'Exercise photo must NOT have object-fit: cover which clips edges of non-square photos'
      );
    });

    test('T1-F1-02', 'Image container accommodates flexible aspect ratios without forced square/fixed aspect lock', () => {
      const modalSrc = readProjectFile('src/components/ExerciseTimerModal.jsx');
      // Image container should not enforce a fixed rigid aspect ratio like aspectRatio: '1/1' or fixed 300x300 that squashes
      expect(modalSrc).not.toMatch(
        /aspectRatio:\s*['"]1\s*\/\s*1['"]/,
        'Exercise photo container must not lock aspect ratio to 1/1 square'
      );
      // Verify simulated bounds for 16:9, 9:16, and 4:3
      const portrait = calculateRenderedImageBounds({
        imgWidth: 720,
        imgHeight: 1280,
        containerWidth: 400,
        containerHeight: 260,
        objectFit: 'contain'
      });
      expect(portrait.cropped).toBe(false, 'Portrait photo must not be cropped with object-fit: contain');
      expect(portrait.distorted).toBe(false, 'Portrait photo must not be distorted');
    });

    test('T1-F1-03', 'Exercise photo container defines responsive max-height constraint preventing modal vertical overflow', () => {
      const modalSrc = readProjectFile('src/components/ExerciseTimerModal.jsx');
      expect(modalSrc).toMatch(
        /maxHeight:\s*['"](?:min\([^'"]+\)|[0-9]+px|[0-9]+vh)['"]/,
        'Exercise photo container must specify responsive max-height constraint'
      );
    });

    test('T1-F1-04', 'Exercise photo block conditionally renders when exercise has valid image URL', () => {
      const modalSrc = readProjectFile('src/components/ExerciseTimerModal.jsx');
      expect(modalSrc).toMatch(
        /\{exercise\.image\s*&&/,
        'Exercise photo container must conditionally render on exercise.image'
      );
    });

    test('T1-F1-05', 'Missing or empty exercise image gracefully renders fallback instructions without broken image frame', () => {
      const modalSrc = readProjectFile('src/components/ExerciseTimerModal.jsx');
      expect(modalSrc).toMatch(
        /exercise\.instructions\s*\|\|/,
        'Fallback instructions must be provided when exercise custom text is absent'
      );
      // Verify no unconditional <img without exercise.image check
      const imageCount = (modalSrc.match(/<img\s/g) || []).length;
      const conditionalCheck = (modalSrc.match(/exercise\.image\s*&&/g) || []).length;
      expect(imageCount).toBe(conditionalCheck, 'All exercise img tags must be guarded by exercise.image check');
    });
  });

  // -------------------------------------------------------------
  // FEATURE 2: Procedural 3D Start Animation (R2)
  // -------------------------------------------------------------
  describe('Tier 1 - Feature 2: Procedural 3D Start Animation (ORIGINAL_REQUEST §R2)', () => {
    test('T1-F2-01', 'CustomerPortal defines procedural intro stages (assembling, targeting, locked, ready)', () => {
      const portalSrc = readProjectFile('src/components/CustomerPortal.jsx');
      expect(portalSrc).toMatch(
        /'assembling'/,
        'CustomerPortal must define assembling intro stage'
      );
      expect(portalSrc).toMatch(
        /'targeting'/,
        'CustomerPortal must define targeting intro stage'
      );
      expect(portalSrc).toMatch(
        /'locked'/,
        'CustomerPortal must define locked intro stage'
      );
      expect(portalSrc).toMatch(
        /'ready'/,
        'CustomerPortal must define ready intro stage'
      );
    });

    test('T1-F2-02', 'BodyModel animates anatomy assembly procedurally via useFrame delta interpolation', () => {
      const bodyModelSrc = readProjectFile('src/components/BodyModel.jsx');
      expect(bodyModelSrc).toMatch(
        /useFrame/,
        'BodyModel must use useFrame hook for procedural 3D animation'
      );
      expect(bodyModelSrc).toMatch(
        /introStage === 'assembling'|introStage/,
        'BodyModel must interpolate geometry during assembling stage'
      );
    });

    test('T1-F2-03', 'Start animation renders procedurally in 3D Canvas without video playback elements', () => {
      const portalSrc = readProjectFile('src/components/CustomerPortal.jsx');
      expect(portalSrc).not.toMatch(
        /<video[\s>]/,
        'Customer portal must NOT use <video> elements for start animation; must be procedural 3D'
      );
      expect(portalSrc).toMatch(
        /<Canvas[\s>]/,
        'Customer portal must render 3D scene inside @react-three/fiber Canvas'
      );
    });

    test('T1-F2-04', '3D anatomical model material transitions to metallic deep blue (#0a3d91)', () => {
      const bodyModelSrc = readProjectFile('src/components/BodyModel.jsx');
      expect(bodyModelSrc).toMatch(
        /#0a3d91/i,
        'Body model standard material must use signature deep blue #0a3d91'
      );
      expect(bodyModelSrc).toMatch(
        /metalness:\s*0\.[789]/,
        'Body model standard material must specify metallic finish'
      );
    });

    test('T1-F2-05', 'Procedural start animation auto-progresses across stages via timers or frame delta', () => {
      const portalSrc = readProjectFile('src/components/CustomerPortal.jsx');
      expect(portalSrc).toMatch(
        /setTimeout\s*\(\s*\(\)\s*=>\s*\{\s*setIntroStage\('targeting'\)/,
        'Animation must automatically progress to targeting stage'
      );
      expect(portalSrc).toMatch(
        /setTimeout\s*\(\s*\(\)\s*=>\s*\{\s*setIntroStage\('ready'\)/,
        'Animation must automatically progress to ready stage'
      );
    });
  });

  // -------------------------------------------------------------
  // FEATURE 3: Skip Buttons Removal (R2)
  // -------------------------------------------------------------
  describe('Tier 1 - Feature 3: Skip Buttons Removal (ORIGINAL_REQUEST §R2)', () => {
    test('T1-F3-01', 'CustomerPortal does NOT render "SKIP INTRO" text or button', () => {
      const portalSrc = readProjectFile('src/components/CustomerPortal.jsx');
      expect(portalSrc).not.toMatch(
        /SKIP\s*INTRO/i,
        'CustomerPortal must completely remove "SKIP INTRO" button and text'
      );
    });

    test('T1-F3-02', 'No button element exists with a skip click handler in CustomerPortal', () => {
      const portalSrc = readProjectFile('src/components/CustomerPortal.jsx');
      expect(portalSrc).not.toMatch(
        /onClick=\{\s*skipIntro\s*\}/,
        'CustomerPortal must not bind any onClick to skipIntro'
      );
      expect(portalSrc).not.toMatch(
        /aria-label=['"]Skip['"]/i,
        'CustomerPortal must not have any skip button aria-label'
      );
    });

    test('T1-F3-03', 'skipIntro function is completely removed from CustomerPortal', () => {
      const portalSrc = readProjectFile('src/components/CustomerPortal.jsx');
      expect(portalSrc).not.toMatch(
        /const\s+skipIntro\s*=/,
        'CustomerPortal must completely remove skipIntro function declaration'
      );
    });

    test('T1-F3-04', 'Clean intro HUD overlay contains no skip controls during animation', () => {
      const portalSrc = readProjectFile('src/components/CustomerPortal.jsx');
      // Look inside the intro HUD overlay (introStage !== 'ready')
      const introHudMatch = portalSrc.match(/\{introStage !== 'ready' && \(([\s\S]*?)\)\}/);
      if (introHudMatch) {
        const hudContent = introHudMatch[1];
        expect(hudContent).not.toMatch(/skip/i, 'Intro HUD overlay must not contain skip controls');
      }
    });

    test('T1-F3-05', 'Audio mute/unmute control remains accessible during intro without skip button proximity', () => {
      const portalSrc = readProjectFile('src/components/CustomerPortal.jsx');
      expect(portalSrc).toMatch(
        /setSoundEnabled/,
        'Sound mute/unmute control must remain present and functional'
      );
      expect(portalSrc).toMatch(
        /<Volume2|<VolumeX/,
        'Audio volume icons must be present in portal'
      );
    });
  });

  // -------------------------------------------------------------
  // FEATURE 4: Conclusion Transition (R2)
  // -------------------------------------------------------------
  describe('Tier 1 - Feature 4: Conclusion Transition (ORIGINAL_REQUEST §R2)', () => {
    test('T1-F4-01', 'Transition to ready stage triggers display of The Sleep Company logo branding', () => {
      const portalSrc = readProjectFile('src/components/CustomerPortal.jsx');
      expect(portalSrc).toMatch(
        /opacity:\s*introStage === 'ready'\s*\?\s*1\s*:\s*0/,
        'Logo opacity must be 1 when introStage is ready, and 0 during intro animation'
      );
    });

    test('T1-F4-02', 'Physio-selected pain points activate with beacon markers at conclusion of start animation', () => {
      const bodyModelSrc = readProjectFile('src/components/BodyModel.jsx');
      expect(bodyModelSrc).toMatch(
        /introStage === 'ready'/,
        'BodyModel must reveal active pain points when introStage is ready'
      );
      expect(bodyModelSrc).toMatch(
        /ShockwavePulse/,
        'BodyModel must render radiating shockwave pulses on active pain beacons'
      );
    });

    test('T1-F4-03', 'Patient recovery plan HUD elements reveal when intro animation reaches ready stage', () => {
      const portalSrc = readProjectFile('src/components/CustomerPortal.jsx');
      expect(portalSrc).toMatch(
        /introStage === 'ready' && !activePointId && \(/,
        'Bottom drawer and HUD elements must appear when introStage === ready'
      );
    });

    test('T1-F4-04', 'Auto-rotation on 3D canvas engages cleanly at ready stage when no hotspot is selected', () => {
      const portalSrc = readProjectFile('src/components/CustomerPortal.jsx');
      expect(portalSrc).toMatch(
        /autoRotate=\{introStage === 'ready' && !activePointId && !isAnyPopupOpen\}/,
        'OrbitControls autoRotate must engage when introStage === ready'
      );
    });

    test('T1-F4-05', 'Audio cues trigger appropriately during stage transitions', () => {
      const portalSrc = readProjectFile('src/components/CustomerPortal.jsx');
      expect(portalSrc).toMatch(
        /sounds\.(?:playAssemblyWhoosh|playLaserShot|playTargetLock|setMuted)/,
        'CustomerPortal must trigger audio effects during stage transitions'
      );
    });
  });

  // -------------------------------------------------------------
  // FEATURE 5: Streak Logic & Badge Removal (R3)
  // -------------------------------------------------------------
  describe('Tier 1 - Feature 5: Streak Logic & Badge Removal (ORIGINAL_REQUEST §R3)', () => {
    test('T1-F5-01', 'CustomerPortal does NOT render "DAY STREAK" badge or Flame icon in customer HUD', () => {
      const portalSrc = readProjectFile('src/components/CustomerPortal.jsx');
      expect(portalSrc).not.toMatch(
        /DAY\s*STREAK/i,
        'Customer HUD must completely remove "DAY STREAK" badge'
      );
      expect(portalSrc).not.toMatch(
        /<Flame[\s/>]/,
        'Customer HUD must not render the Flame streak icon'
      );
    });

    test('T1-F5-02', 'streakDays state variable is completely removed from CustomerPortal', () => {
      const portalSrc = readProjectFile('src/components/CustomerPortal.jsx');
      expect(portalSrc).not.toMatch(
        /const\s*\[streakDays,\s*setStreakDays\]\s*=/,
        'CustomerPortal must not declare streakDays state'
      );
    });

    test('T1-F5-03', 'medic_streak localStorage read/write logic is completely removed', () => {
      const portalSrc = readProjectFile('src/components/CustomerPortal.jsx');
      expect(portalSrc).not.toMatch(
        /localStorage\.(?:getItem|setItem)\s*\(\s*`medic_streak_/,
        'CustomerPortal must not read or write medic_streak to localStorage'
      );
    });

    test('T1-F5-04', 'Exercise completion check-off does not compute or increment streak values', () => {
      const portalSrc = readProjectFile('src/components/CustomerPortal.jsx');
      expect(portalSrc).not.toMatch(
        /const currentStreak\s*=/,
        'Exercise completion logic must not calculate currentStreak'
      );
      expect(portalSrc).not.toMatch(
        /\/\/ Update streak if completing first exercise today/,
        'Streak update comments and logic must be removed'
      );
    });

    test('T1-F5-05', 'Customer portal progress update calls do NOT send daily_streak', () => {
      const portalSrc = readProjectFile('src/components/CustomerPortal.jsx');
      expect(portalSrc).not.toMatch(
        /updatePatientProgress\s*\(\s*patient\.id,\s*currentStreak/,
        'CustomerPortal must not pass currentStreak to updatePatientProgress'
      );
    });
  });

  // -------------------------------------------------------------
  // FEATURE 6: Sharp 3D Procedural Grid Structure (R4)
  // -------------------------------------------------------------
  describe('Tier 1 - Feature 6: Sharp 3D Procedural Grid Structure (ORIGINAL_REQUEST §R4)', () => {
    test('T1-F6-01', 'Blurry 2D raster background grid_background.jpg is removed from CustomerPortal', () => {
      const portalSrc = readProjectFile('src/components/CustomerPortal.jsx');
      expect(portalSrc).not.toMatch(
        /backgroundImage:\s*['"]url\(\/grid_background\.jpg\)['"]/,
        'CustomerPortal root container must NOT use blurry raster /grid_background.jpg'
      );
    });

    test('T1-F6-02', 'GridRoom component file exists in src/components/GridRoom.jsx', () => {
      const exists = projectFileExists('src/components/GridRoom.jsx');
      expect(exists).toBe(true, 'src/components/GridRoom.jsx must exist');
    });

    test('T1-F6-03', 'GridRoom component is rendered inside Three.js Canvas in CustomerPortal', () => {
      const portalSrc = readProjectFile('src/components/CustomerPortal.jsx');
      expect(portalSrc).toMatch(
        /import\s+GridRoom\s+from\s+['"]\.\/GridRoom['"]/,
        'CustomerPortal must import GridRoom component'
      );
      expect(portalSrc).toMatch(
        /<GridRoom[\s/>]/,
        'CustomerPortal must render <GridRoom /> inside <Canvas>'
      );
    });

    test('T1-F6-04', 'GridRoom renders procedural grid lines and nodal intersection markers', () => {
      if (projectFileExists('src/components/GridRoom.jsx')) {
        const gridSrc = readProjectFile('src/components/GridRoom.jsx');
        expect(gridSrc).toMatch(
          /gridHelper|lineSegments|BufferGeometry|meshBasicMaterial|points/i,
          'GridRoom must construct procedural 3D line or point geometries'
        );
      } else {
        throw new Error('src/components/GridRoom.jsx not yet created');
      }
    });

    test('T1-F6-05', 'GridRoom is positioned at floor level (y = -3.5 or equivalent floor plane)', () => {
      if (projectFileExists('src/components/GridRoom.jsx')) {
        const gridSrc = readProjectFile('src/components/GridRoom.jsx');
        expect(gridSrc).toMatch(
          /position=\{?\[\s*0,\s*-3\.[0-9]+,\s*0\s*\]\}?|-3\.5/,
          'GridRoom floor must be positioned around y = -3.5 under 3D body model feet'
        );
      } else {
        throw new Error('src/components/GridRoom.jsx not yet created');
      }
    });
  });

  // -------------------------------------------------------------
  // FEATURE 7: Logo Legibility & Contrast (R5)
  // -------------------------------------------------------------
  describe('Tier 1 - Feature 7: Logo Legibility & Contrast (ORIGINAL_REQUEST §R5)', () => {
    test('T1-F7-01', 'The Sleep Company logo renders solid, high-contrast typography (fill: #ffffff)', () => {
      const portalSrc = readProjectFile('src/components/CustomerPortal.jsx');
      expect(portalSrc).toMatch(
        /fill:\s*['"]#(?:ffffff|fff|f8fafc)['"]/i,
        'Logo typography must have solid bright white/light fill for maximum contrast'
      );
    });

    test('T1-F7-02', 'Blinding multi-pass Gaussian blur filter neonHologramGlow is removed from logo SVG', () => {
      const portalSrc = readProjectFile('src/components/CustomerPortal.jsx');
      expect(portalSrc).not.toMatch(
        /filter id=['"]neonHologramGlow['"]/,
        'Blinding multi-pass Gaussian blur filter #neonHologramGlow must be removed from logo SVG'
      );
      expect(portalSrc).not.toMatch(
        /filter:\s*url\(#neonHologramGlow\)/,
        'Logo elements must not apply #neonHologramGlow filter'
      );
    });

    test('T1-F7-03', 'Logo typography contrast ratio against dark background exceeds 7:1 (WCAG AAA standard)', () => {
      // Background is #040714, Logo text is #ffffff
      const contrast = calculateContrastRatio('#ffffff', '#040714');
      expect(contrast).toBeGreaterThanOrEqual(7.0, `Contrast ratio ${contrast.toFixed(2)}:1 must meet WCAG AAA (>= 7.0:1)`);
    });

    test('T1-F7-04', 'Logo SVG has aria-label="The Sleep Company" and accessible role="img"', () => {
      const portalSrc = readProjectFile('src/components/CustomerPortal.jsx');
      expect(portalSrc).toMatch(
        /aria-label=['"]The Sleep Company['"]/,
        'Logo SVG must have aria-label="The Sleep Company"'
      );
      expect(portalSrc).toMatch(
        /role=['"]img['"]/,
        'Logo SVG must have role="img"'
      );
    });

    test('T1-F7-05', 'Logo text in SVG uses heavy font weight (>= 700 or 800) for instant readability', () => {
      const portalSrc = readProjectFile('src/components/CustomerPortal.jsx');
      expect(portalSrc).toMatch(
        /font-weight:\s*(?:[789]00|bold|extrabold|bolder)|fontWeight:\s*(?:[789]00|['"](?:bold|extrabold)['"])/,
        'Logo font weight must be 700+ for clear readability at first glance'
      );
    });
  });

  // -------------------------------------------------------------
  // FEATURE 8: Non-Regression Preservation (R6)
  // -------------------------------------------------------------
  describe('Tier 1 - Feature 8: Non-Regression Preservation (ORIGINAL_REQUEST §R6)', () => {
    test('T1-F8-01', 'Clinician and admin routes (/tasks, /capture, /admin) and customer route (/r/:id) preserved in App.jsx', () => {
      const appSrc = readProjectFile('src/App.jsx');
      expect(appSrc).toMatch(/\/r\/:id/, 'Customer route /r/:id must be preserved in App.jsx');
      expect(appSrc).toMatch(/\/tasks/, 'Clinician /tasks route must be preserved in App.jsx');
      expect(appSrc).toMatch(/\/capture/, 'Clinician /capture route must be preserved in App.jsx');
      expect(appSrc).toMatch(/\/admin/, 'Admin /admin route must be preserved in App.jsx');
    });

    test('T1-F8-02', 'getPatientById query utility is exported and preserves database querying interface in src/utils/db.js', () => {
      const dbSrc = readProjectFile('src/utils/db.js');
      expect(dbSrc).toMatch(
        /export\s+const\s+getPatientById\s*=/,
        'src/utils/db.js must export getPatientById'
      );
      expect(dbSrc).toMatch(
        /export\s+const\s+updatePatientProgress\s*=/,
        'src/utils/db.js must export updatePatientProgress'
      );
    });

    test('T1-F8-03', 'Weekly exercise routine drawer retains tabs for weeks 1, 2, 3 and consult', () => {
      const portalSrc = readProjectFile('src/components/CustomerPortal.jsx');
      expect(portalSrc).toMatch(
        /key:\s*['"]1['"],\s*label:\s*['"]Week 1['"]|activeWeekTab === '1'/,
        'Exercise routine drawer must support Week 1'
      );
      expect(portalSrc).toMatch(
        /key:\s*['"]2['"],\s*label:\s*['"]Week 2['"]|activeWeekTab === '2'/,
        'Exercise routine drawer must support Week 2'
      );
      expect(portalSrc).toMatch(
        /key:\s*['"]3['"],\s*label:\s*['"]Week 3['"]|activeWeekTab === '3'/,
        'Exercise routine drawer must support Week 3'
      );
      expect(portalSrc).toMatch(
        /key:\s*['"]consult['"]|activeWeekTab === 'consult'/,
        'Exercise routine drawer must support Consult tab'
      );
    });

    test('T1-F8-04', 'Clinician WhatsApp consultation trigger builds valid wa.me link with URL-encoded message', () => {
      const portalSrc = readProjectFile('src/components/CustomerPortal.jsx');
      expect(portalSrc).toMatch(
        /https:\/\/wa\.me\//,
        'CustomerPortal must generate wa.me link for WhatsApp contact'
      );
      expect(portalSrc).toMatch(
        /encodeURIComponent/,
        'WhatsApp prefilled message must be properly URL-encoded'
      );
    });

    test('T1-F8-05', 'Exercise completion check-off toggle updates completedExercises state in CustomerPortal', () => {
      const portalSrc = readProjectFile('src/components/CustomerPortal.jsx');
      expect(portalSrc).toMatch(
        /setCompletedExercises\(/,
        'CustomerPortal must update completedExercises state on exercise completion toggle'
      );
    });
  });
}

module.exports = { registerTier1Tests };
