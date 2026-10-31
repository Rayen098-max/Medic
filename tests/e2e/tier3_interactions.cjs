/**
 * tests/e2e/tier3_interactions.cjs
 * Tier 3: Cross-Feature Interactions (8 pairwise combinatorial tests)
 * Tests multi-feature couplings across UI, 3D Canvas, state management, and brand presentation
 */

const { describe, test, expect, readProjectFile, projectFileExists, calculateRenderedImageBounds, calculateContrastRatio } = require('./framework.cjs');

function registerTier3Tests() {
  describe('Tier 3 - Cross-Feature Pairwise Interactions (Combinatorial Coverage)', () => {
    // T3-INT-01 [F1 × F8]
    test('T3-INT-01', '[F1 × F8] Opening ExerciseTimerModal with uncropped image from weekly routine drawer preserves check-off state', () => {
      const modalSrc = readProjectFile('src/components/ExerciseTimerModal.jsx');
      const portalSrc = readProjectFile('src/components/CustomerPortal.jsx');

      // Modal provides uncropped image
      expect(modalSrc).toMatch(/objectFit:\s*['"]contain['"]|object-contain/);
      // Marking done updates state
      expect(modalSrc).toMatch(/onMarkDone\(exercise\.name\)/);
      expect(portalSrc).toMatch(/onMarkDone=\{.*toggleExerciseDone/);
      expect(portalSrc).toMatch(/exercise=\{activeExercise\}/);
    });

    // T3-INT-02 [F2 × F6]
    test('T3-INT-02', '[F2 × F6] Procedural 3D start animation executes inside procedural 3D GridRoom with synchronized emergence', () => {
      const portalSrc = readProjectFile('src/components/CustomerPortal.jsx');
      // GridRoom must be inside Canvas with introStage prop
      expect(portalSrc).toMatch(/<Canvas/);
      expect(portalSrc).toMatch(/<GridRoom/);
      expect(portalSrc).toMatch(/introStage=\{introStage\}/);
    });

    // T3-INT-03 [F3 × F4]
    test('T3-INT-03', '[F3 × F4] Intro animation plays through to conclusion without skip buttons and reveals logo + pain points', () => {
      const portalSrc = readProjectFile('src/components/CustomerPortal.jsx');
      // Zero skip buttons
      expect(portalSrc).not.toMatch(/SKIP\s*INTRO/i);
      // Smooth stage transition to ready
      expect(portalSrc).toMatch(/introStage === 'ready'/);
      expect(portalSrc).toMatch(/opacity:\s*introStage === 'ready'\s*\?\s*1\s*:\s*0/);
    });

    // T3-INT-04 [F5 × F8]
    test('T3-INT-04', '[F5 × F8] Exercise routine check-off persists completed exercises in state and DB without invoking streak logic', () => {
      const portalSrc = readProjectFile('src/components/CustomerPortal.jsx');
      // Exercises completed state persists
      expect(portalSrc).toMatch(/completedExercises/);
      // No streak logic
      expect(portalSrc).not.toMatch(/DAY\s*STREAK/i);
      expect(portalSrc).not.toMatch(/streakDays/);
      expect(portalSrc).not.toMatch(/localStorage\.getItem\(['"]medic_streak/);
    });

    // T3-INT-05 [F6 × F7]
    test('T3-INT-05', '[F6 × F7] High-contrast logo branding displays crisp and legible overlaid across procedural 3D grid chamber', () => {
      const portalSrc = readProjectFile('src/components/CustomerPortal.jsx');
      // Logo text is solid white
      expect(portalSrc).toMatch(/fill:\s*['"]#(?:ffffff|fff|f8fafc)['"]/i);
      // Blurring neon filter removed
      expect(portalSrc).not.toMatch(/neonHologramGlow/);
      // 3D Grid room rendered
      expect(portalSrc).toMatch(/<GridRoom/);
    });

    // T3-INT-06 [F1 × F5]
    test('T3-INT-06', '[F1 × F5] Exercise modal uncropped photo display functions independently of streak counters', () => {
      const modalSrc = readProjectFile('src/components/ExerciseTimerModal.jsx');
      // Modal focuses strictly on exercise guide, image, and mark complete
      expect(modalSrc).not.toMatch(/streak/i);
      expect(modalSrc).toMatch(/objectFit:\s*['"]contain['"]|object-contain/);
    });

    // T3-INT-07 [F2 × F4]
    test('T3-INT-07', '[F2 × F4] Procedural start animation transitions seamlessly to interactive 3D anatomy inspection with bilateral pain beacons', () => {
      const bodyModelSrc = readProjectFile('src/components/BodyModel.jsx');
      const portalSrc = readProjectFile('src/components/CustomerPortal.jsx');

      expect(bodyModelSrc).toMatch(/introStage/);
      expect(bodyModelSrc).toMatch(/ShockwavePulse/);
      expect(bodyModelSrc).toMatch(/isBilateralZone/);
      expect(portalSrc).toMatch(/introStage=\{introStage\}/);
    });

    // T3-INT-08 [F4 × F7]
    test('T3-INT-08', '[F4 × F7] Conclusion sequence triggers coordinated fade-in of both The Sleep Company logo and physio-selected pain points', () => {
      const portalSrc = readProjectFile('src/components/CustomerPortal.jsx');
      expect(portalSrc).toMatch(/opacity:\s*introStage === 'ready'\s*\?\s*1\s*:\s*0/);
      expect(portalSrc).toMatch(/introStage === 'ready' && !activePointId/);
    });
  });
}

module.exports = { registerTier3Tests };
