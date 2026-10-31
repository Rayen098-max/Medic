#!/usr/bin/env node
/**
 * tests/e2e/runner.cjs
 * Comprehensive Opaque-Box E2E Test Runner for Medic Production Customer Portal
 *
 * Usage:
 *   node tests/e2e/runner.cjs [options]
 *
 * Options:
 *   --tier=1|2|3|4     Run tests only for the specified Tier
 *   --feature=1..8     Run tests only for the specified Feature number
 *   --filter=<pattern> Run tests matching the regex or substring pattern
 *   --bail             Stop execution immediately upon first failure
 *   --json             Output results as formatted JSON
 *   --help             Show help documentation
 */

const path = require('path');
const { registry, colors } = require('./framework.cjs');
const { registerTier1Tests } = require('./tier1_features.cjs');
const { registerTier2Tests } = require('./tier2_boundaries.cjs');
const { registerTier3Tests } = require('./tier3_interactions.cjs');
const { registerTier4Tests } = require('./tier4_scenarios.cjs');

// Parse CLI flags
const args = process.argv.slice(2);
const options = {
  tier: null,
  feature: null,
  filter: null,
  bail: false,
  json: false,
  help: false,
};

for (const arg of args) {
  if (arg.startsWith('--tier=')) options.tier = arg.split('=')[1];
  else if (arg.startsWith('--feature=')) options.feature = arg.split('=')[1];
  else if (arg.startsWith('--filter=')) options.filter = arg.split('=')[1];
  else if (arg === '--bail') options.bail = true;
  else if (arg === '--json') options.json = true;
  else if (arg === '--help' || arg === '-h') options.help = true;
}

if (options.help) {
  console.log(`
${colors.bold}${colors.cyan}Medic Production Customer Portal - E2E Test Suite Runner${colors.reset}

${colors.bold}Usage:${colors.reset}
  node tests/e2e/runner.cjs [options]

${colors.bold}Options:${colors.reset}
  --tier=1|2|3|4     Execute specific tier (1: Features, 2: Boundaries, 3: Interactions, 4: Scenarios)
  --feature=1..8     Execute tests targeting specific feature (1 to 8)
  --filter=<regex>   Execute only tests matching regular expression or substring
  --bail             Stop execution immediately after first failure
  --json             Print output as JSON for programmatic consumption
  --help             Show this help menu
  `);
  process.exit(0);
}

// Register all test suites
registerTier1Tests();
registerTier2Tests();
registerTier3Tests();
registerTier4Tests();

// Filtering logic
function shouldRunSuite(suite) {
  if (options.tier) {
    const tierTag = `Tier ${options.tier}`;
    if (!suite.name.includes(tierTag)) return false;
  }
  return true;
}

function shouldRunTest(testObj) {
  if (options.feature) {
    const fTag = `Feature ${options.feature}`;
    const fId = `F${options.feature}`;
    if (!testObj.suite.includes(fTag) && !testObj.id.includes(fId) && !testObj.name.includes(fTag)) {
      return false;
    }
  }
  if (options.filter) {
    const regex = new RegExp(options.filter, 'i');
    if (!regex.test(testObj.id) && !regex.test(testObj.name) && !regex.test(testObj.suite)) {
      return false;
    }
  }
  return true;
}

// Execution Loop
async function run() {
  const startTime = Date.now();
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;
  let skippedTests = 0;

  const results = [];
  const failures = [];

  if (!options.json) {
    console.log(`\n${colors.bold}${colors.cyan}======================================================================${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan} MEDIC PRODUCTION CUSTOMER PORTAL — E2E TEST SUITE RUNNER${colors.reset}`);
    console.log(`${colors.bold}${colors.cyan}======================================================================${colors.reset}`);
    console.log(`${colors.gray}Integrity Mode: development | Framework: Zero-Dep CJS Runner | Node: ${process.version}${colors.reset}\n`);
  }

  for (const suite of registry) {
    if (!shouldRunSuite(suite)) {
      skippedTests += suite.tests.length;
      continue;
    }

    const filteredTests = suite.tests.filter(shouldRunTest);
    if (filteredTests.length === 0) continue;

    if (!options.json) {
      console.log(`${colors.bold}${colors.blue}▸ ${suite.name}${colors.reset}`);
    }

    for (const testObj of filteredTests) {
      totalTests++;
      const tStart = Date.now();
      let passed = false;
      let error = null;

      try {
        await testObj.fn();
        passed = true;
      } catch (err) {
        passed = false;
        error = err;
      }

      const durationMs = Date.now() - tStart;
      testObj.durationMs = durationMs;

      if (passed) {
        passedTests++;
        testObj.status = 'passed';
        if (!options.json) {
          console.log(`  ${colors.green}✓ PASS${colors.reset}  ${colors.gray}[${testObj.id}]${colors.reset} ${testObj.name} ${colors.gray}(${durationMs}ms)${colors.reset}`);
        }
      } else {
        failedTests++;
        testObj.status = 'failed';
        testObj.error = error ? error.message : 'Unknown assertion error';
        failures.push({
          id: testObj.id,
          name: testObj.name,
          suite: testObj.suite,
          error: testObj.error,
        });

        if (!options.json) {
          console.log(`  ${colors.red}✗ FAIL${colors.reset}  ${colors.bold}${colors.red}[${testObj.id}]${colors.reset} ${testObj.name}`);
          console.log(`         ${colors.red}Error: ${testObj.error}${colors.reset}`);
        }

        if (options.bail) {
          if (!options.json) {
            console.log(`\n${colors.yellow}[!] Execution bailed on first failure (--bail specified)${colors.reset}`);
          }
          break;
        }
      }

      results.push({
        id: testObj.id,
        name: testObj.name,
        suite: testObj.suite,
        status: testObj.status,
        durationMs,
        error: testObj.error,
      });
    }

    if (!options.json) console.log();
    if (options.bail && failedTests > 0) break;
  }

  const totalDurationMs = Date.now() - startTime;

  if (options.json) {
    const jsonOutput = {
      summary: {
        total: totalTests,
        passed: passedTests,
        failed: failedTests,
        skipped: skippedTests,
        durationMs: totalDurationMs,
        success: failedTests === 0,
      },
      failures,
      tests: results,
    };
    console.log(JSON.stringify(jsonOutput, null, 2));
    process.exit(failedTests === 0 ? 0 : 1);
  }

  // Summary Report
  console.log(`${colors.bold}${colors.cyan}======================================================================${colors.reset}`);
  console.log(`${colors.bold} TEST SUITE EXECUTION SUMMARY${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}======================================================================${colors.reset}`);
  console.log(`  ${colors.bold}Total Test Cases:${colors.reset}   ${totalTests}`);
  console.log(`  ${colors.bold}${colors.green}Passed:${colors.reset}             ${passedTests}`);
  console.log(`  ${colors.bold}${failedTests > 0 ? colors.red : colors.gray}Failed:${colors.reset}             ${failedTests}`);
  if (skippedTests > 0) {
    console.log(`  ${colors.bold}${colors.yellow}Skipped (Filtered):${colors.reset} ${skippedTests}`);
  }
  console.log(`  ${colors.bold}Duration:${colors.reset}           ${(totalDurationMs / 1000).toFixed(2)}s`);
  console.log(`${colors.bold}${colors.cyan}----------------------------------------------------------------------${colors.reset}`);

  // Tier breakdown
  const tierCounts = { 1: { p: 0, f: 0 }, 2: { p: 0, f: 0 }, 3: { p: 0, f: 0 }, 4: { p: 0, f: 0 } };
  for (const r of results) {
    for (const t of [1, 2, 3, 4]) {
      if (r.suite.includes(`Tier ${t}`)) {
        if (r.status === 'passed') tierCounts[t].p++;
        else tierCounts[t].f++;
      }
    }
  }

  console.log(`  ${colors.bold}Tier 1 (Feature Coverage):${colors.reset}       ${tierCounts[1].p} passed, ${tierCounts[1].f} failed (Total ${tierCounts[1].p + tierCounts[1].f}/40)`);
  console.log(`  ${colors.bold}Tier 2 (Boundary & Corner):${colors.reset}      ${tierCounts[2].p} passed, ${tierCounts[2].f} failed (Total ${tierCounts[2].p + tierCounts[2].f}/40)`);
  console.log(`  ${colors.bold}Tier 3 (Cross Interactions):${colors.reset}     ${tierCounts[3].p} passed, ${tierCounts[3].f} failed (Total ${tierCounts[3].p + tierCounts[3].f}/8)`);
  console.log(`  ${colors.bold}Tier 4 (Real-World Scenarios):${colors.reset}   ${tierCounts[4].p} passed, ${tierCounts[4].f} failed (Total ${tierCounts[4].p + tierCounts[4].f}/5)`);
  console.log(`${colors.bold}${colors.cyan}======================================================================${colors.reset}`);

  if (failedTests > 0) {
    console.log(`\n${colors.bold}${colors.red}FAILED TESTS BREAKDOWN (${failedTests}):${colors.reset}`);
    failures.forEach((f, idx) => {
      console.log(`  ${idx + 1}. [${f.id}] ${f.name}`);
      console.log(`     ${colors.red}Reason: ${f.error}${colors.reset}`);
    });
    console.log(`\n${colors.bgRed}${colors.white}${colors.bold} VERDICT: FAILED (${failedTests} tests requiring implementation fixes) ${colors.reset}\n`);
    process.exit(1);
  } else {
    console.log(`\n${colors.bgGreen}${colors.white}${colors.bold} VERDICT: ALL ${totalTests} TESTS PASSED SUCCESSFULLY! ${colors.reset}\n`);
    process.exit(0);
  }
}

run().catch((err) => {
  console.error('Fatal Runner Error:', err);
  process.exit(1);
});
