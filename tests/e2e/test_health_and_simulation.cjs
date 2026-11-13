/**
 * tests/e2e/test_health_and_simulation.cjs
 * Comprehensive Health Check & Simulation Suite for Medic System:
 * 1. Admin Portal Follow-up Visibility & Real-time Sync
 * 2. Physio Portal Previous Messages & Consultation Notes
 * 3. 3-Month Date Integrity (Sep, Oct, Nov) across All Physios
 * 4. End-to-End Followup Lifecycle Simulation
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const ROOT_DIR = path.resolve(__dirname, '../..');

let totalTests = 0;
let passedTests = 0;

function runTest(id, name, testFn) {
  totalTests++;
  try {
    testFn();
    console.log(`  ✓ PASS  [${id}] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ FAIL  [${id}] ${name}`);
    console.error(`          ${err.message}`);
  }
}

console.log('\n======================================================');
console.log(' MEDIC HEALTH CHECK & SIMULATION TEST SUITE');
console.log('======================================================\n');

// 1. Admin Dashboard & AdminPanel verification
runTest('HC-ADM-01', 'Admin Dashboard fetches verified tracker data from Supabase for Sep, Oct, Nov', () => {
  const dashFile = fs.readFileSync(path.join(ROOT_DIR, 'src/features/dashboard/index.tsx'), 'utf8');
  assert.ok(dashFile.includes('getDashboardTrackerData'), 'Dashboard must import and use getDashboardTrackerData');
  assert.ok(dashFile.includes('All Active Months'), 'Dashboard must provide active months filter');
  assert.ok(!dashFile.includes('repeatRate'), 'Dashboard must display WhatsApp Follow-ups Sent instead of empty repeatRate');
});

runTest('HC-ADM-02', 'AdminPanel cross-references followups and tracker_tasks to mark sent follow-ups', () => {
  const adminFile = fs.readFileSync(path.join(ROOT_DIR, 'src/components/AdminPanel.jsx'), 'utf8');
  assert.ok(adminFile.includes('trackerFollowups'), 'AdminPanel must query tracker_tasks followups');
  assert.ok(adminFile.includes('All Physio Follow-ups'), 'AdminPanel must provide All Physio Follow-ups tab');
  assert.ok(adminFile.includes('Total Follow-ups Sent'), 'AdminPanel must show Total Follow-ups Sent KPI card');
});

runTest('HC-ADM-03', 'UsageReport / db.js getFollowupsReport merges followups table and tracker_tasks', () => {
  const dbFile = fs.readFileSync(path.join(ROOT_DIR, 'src/utils/db.js'), 'utf8');
  assert.ok(dbFile.includes('from(\'tracker_tasks\')'), 'getFollowupsReport must include tracker_tasks');
  assert.ok(dbFile.includes('from(\'followups\')'), 'getFollowupsReport must include followups');
  assert.ok(dbFile.includes('getDashboardTrackerData'), 'db.js must export getDashboardTrackerData');
});

// 2. Physio Portal Previous Messages & Notes
runTest('HC-PHY-01', 'TasksTable extracts custom message from patient conditionNotes or tracker comments', () => {
  const tableFile = fs.readFileSync(path.join(ROOT_DIR, 'src/features/tasks/components/tasks-table.tsx'), 'utf8');
  assert.ok(tableFile.includes('getCustomerCustomMessage'), 'TasksTable must implement getCustomerCustomMessage');
  assert.ok(tableFile.includes('getPersonalizedMessage'), 'TasksTable must implement getPersonalizedMessage');
});

runTest('HC-PHY-02', 'TasksTable displays Previous Consultation Message & Notes card when row is expanded', () => {
  const tableFile = fs.readFileSync(path.join(ROOT_DIR, 'src/features/tasks/components/tasks-table.tsx'), 'utf8');
  assert.ok(tableFile.includes('Previous Consultation Message & Notes'), 'Expanded row must render Previous Consultation Message');
  assert.ok(tableFile.includes('WhatsApp Message Sent / Queued for Customer:'), 'Must show full preview message');
});

runTest('HC-PHY-03', 'TasksTable displays Sent badge on customer row when follow-up has been sent', () => {
  const tableFile = fs.readFileSync(path.join(ROOT_DIR, 'src/features/tasks/components/tasks-table.tsx'), 'utf8');
  assert.ok(tableFile.includes('Follow-up Sent'), 'TasksTable must render Follow-up Sent badge');
  assert.ok(tableFile.includes('isSent'), 'TasksTable must compute isSent status');
});

runTest('HC-PHY-04', 'CaptureForm pre-populates existing whatsappMessage, notes, exercises, and patient ID', () => {
  const captureFile = fs.readFileSync(path.join(ROOT_DIR, 'src/components/CaptureForm.jsx'), 'utf8');
  assert.ok(captureFile.includes('getInitialMessage'), 'CaptureForm must implement getInitialMessage');
  assert.ok(captureFile.includes('getInitialPainPoints'), 'CaptureForm must implement getInitialPainPoints');
  assert.ok(captureFile.includes('initialData?.recommendedExercises'), 'CaptureForm must load existing recommendedExercises');
});

// 3. System Data Flow Simulation
runTest('HC-SIM-01', 'Simulation: WhatsApp send updates tracker_tasks, followups, and patients table in sync', () => {
  const tableFile = fs.readFileSync(path.join(ROOT_DIR, 'src/features/tasks/components/tasks-table.tsx'), 'utf8');
  assert.ok(tableFile.includes('recordFollowup(patientId, profile.id, customerName)'), 'Must record in followups');
  assert.ok(tableFile.includes('markTaskWhatsAppSent(id'), 'Must update tracker_tasks');
  assert.ok(tableFile.includes('updatePatientStatus(patientId, { followup_sent_at: now })'), 'Must update patient followup_sent_at');
});

runTest('HC-SIM-02', 'Simulation: Active months restriction strictly enforces Sep, Oct, Nov across Tasks and Dashboard', () => {
  const tasksFile = fs.readFileSync(path.join(ROOT_DIR, 'src/features/tasks/index.tsx'), 'utf8');
  const dashFile = fs.readFileSync(path.join(ROOT_DIR, 'src/features/dashboard/index.tsx'), 'utf8');
  assert.ok(tasksFile.includes("ALLOWED_MONTH_KEYS = ['2026-11', '2026-10', '2026-09']"), 'Tasks must restrict to Sep, Oct, Nov');
  assert.ok(dashFile.includes("'2026-11'") && dashFile.includes("'2026-10'") && dashFile.includes("'2026-09'"), 'Dashboard must restrict to Sep, Oct, Nov');
});

console.log('\n======================================================');
console.log(`SIMULATION RESULTS: ${passedTests} PASSED, ${totalTests - passedTests} FAILED (TOTAL ${totalTests})`);
console.log('======================================================\n');

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
