/**
 * tests/e2e/framework.cjs
 * Lightweight, zero-dependency opaque-box testing framework for Medic Production Portal
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
};

// Global test registry
const registry = [];
let currentSuite = null;

function describe(name, fn) {
  const previousSuite = currentSuite;
  currentSuite = {
    name,
    tests: [],
    parent: previousSuite,
  };
  registry.push(currentSuite);
  fn();
  currentSuite = previousSuite;
}

function test(id, name, fn) {
  if (typeof id === 'string' && typeof name === 'function') {
    fn = name;
    name = id;
    id = `TEST-${registry.reduce((acc, s) => acc + s.tests.length, 1)}`;
  }
  const testObj = {
    id,
    name,
    fn,
    suite: currentSuite ? currentSuite.name : 'Default Suite',
    status: 'pending',
    error: null,
    durationMs: 0,
  };
  if (currentSuite) {
    currentSuite.tests.push(testObj);
  } else {
    registry.push({ name: 'Root', tests: [testObj] });
  }
}

// Fluent assertion library
function expect(actual) {
  return {
    toBe(expected, message) {
      if (actual !== expected) {
        throw new Error(message || `Expected ${JSON.stringify(actual)} to be ${JSON.stringify(expected)}`);
      }
    },
    toEqual(expected, message) {
      const a = JSON.stringify(actual);
      const e = JSON.stringify(expected);
      if (a !== e) {
        throw new Error(message || `Expected deep equality:\nActual:   ${a}\nExpected: ${e}`);
      }
    },
    toBeGreaterThan(expected, message) {
      if (typeof actual !== 'number' || actual <= expected) {
        throw new Error(message || `Expected ${actual} > ${expected}`);
      }
    },
    toBeGreaterThanOrEqual(expected, message) {
      if (typeof actual !== 'number' || actual < expected) {
        throw new Error(message || `Expected ${actual} >= ${expected}`);
      }
    },
    toBeLessThan(expected, message) {
      if (typeof actual !== 'number' || actual >= expected) {
        throw new Error(message || `Expected ${actual} < ${expected}`);
      }
    },
    toBeLessThanOrEqual(expected, message) {
      if (typeof actual !== 'number' || actual > expected) {
        throw new Error(message || `Expected ${actual} <= ${expected}`);
      }
    },
    toBeTruthy(message) {
      if (!actual) {
        throw new Error(message || `Expected truthy value, received: ${actual}`);
      }
    },
    toBeFalsy(message) {
      if (actual) {
        throw new Error(message || `Expected falsy value, received: ${actual}`);
      }
    },
    toBeNull(message) {
      if (actual !== null) {
        throw new Error(message || `Expected null, received: ${actual}`);
      }
    },
    toBeDefined(message) {
      if (actual === undefined) {
        throw new Error(message || `Expected defined value, received undefined`);
      }
    },
    toContain(expectedSub, message) {
      if (typeof actual === 'string') {
        if (!actual.includes(expectedSub)) {
          throw new Error(message || `Expected string to contain "${expectedSub}"`);
        }
      } else if (Array.isArray(actual)) {
        if (!actual.includes(expectedSub)) {
          throw new Error(message || `Expected array to contain item: ${JSON.stringify(expectedSub)}`);
        }
      } else {
        throw new Error(message || `toContain target is neither string nor array`);
      }
    },
    toMatch(regex, message) {
      if (typeof actual !== 'string' || !regex.test(actual)) {
        throw new Error(message || `Expected string to match pattern ${regex}`);
      }
    },
    not: {
      toBe(expected, message) {
        if (actual === expected) {
          throw new Error(message || `Expected value NOT to be ${JSON.stringify(expected)}`);
        }
      },
      toContain(expectedSub, message) {
        if (typeof actual === 'string' && actual.includes(expectedSub)) {
          throw new Error(message || `Expected string NOT to contain "${expectedSub}"`);
        }
        if (Array.isArray(actual) && actual.includes(expectedSub)) {
          throw new Error(message || `Expected array NOT to contain: ${JSON.stringify(expectedSub)}`);
        }
      },
      toMatch(regex, message) {
        if (typeof actual === 'string' && regex.test(actual)) {
          throw new Error(message || `Expected string NOT to match pattern ${regex}`);
        }
      },
    },
  };
}

// Workspace & File Helpers
const projectRoot = path.resolve(__dirname, '..', '..');

function readProjectFile(relPath) {
  const fullPath = path.resolve(projectRoot, relPath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`File does not exist: ${relPath} (resolved: ${fullPath})`);
  }
  return fs.readFileSync(fullPath, 'utf8');
}

function projectFileExists(relPath) {
  const fullPath = path.resolve(projectRoot, relPath);
  return fs.existsSync(fullPath);
}

// Color and WCAG Contrast Utilities
function hexToRgb(hex) {
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c.split('').map(x => x + x).join('');
  }
  const num = parseInt(c, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function relativeLuminance(r, g, b) {
  const a = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function calculateContrastRatio(hex1, hex2) {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  const l1 = relativeLuminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = relativeLuminance(rgb2.r, rgb2.g, rgb2.b);
  const brightest = Math.max(l1, l2);
  const darkest = Math.min(l1, l2);
  return (brightest + 0.05) / (darkest + 0.05);
}

// Aspect ratio and uncropped bounds calculator
function calculateRenderedImageBounds({ imgWidth, imgHeight, containerWidth, containerHeight, objectFit }) {
  const imgRatio = imgWidth / imgHeight;
  const containerRatio = containerWidth / containerHeight;
  let renderWidth, renderHeight, cropped;

  if (objectFit === 'contain') {
    if (imgRatio > containerRatio) {
      renderWidth = containerWidth;
      renderHeight = containerWidth / imgRatio;
    } else {
      renderHeight = containerHeight;
      renderWidth = containerHeight * imgRatio;
    }
    cropped = false;
  } else if (objectFit === 'cover') {
    if (imgRatio > containerRatio) {
      renderHeight = containerHeight;
      renderWidth = containerHeight * imgRatio;
    } else {
      renderWidth = containerWidth;
      renderHeight = containerWidth / imgRatio;
    }
    cropped = renderWidth > containerWidth || renderHeight > containerHeight;
  } else {
    // default fill / stretch
    renderWidth = containerWidth;
    renderHeight = containerHeight;
    cropped = false;
  }

  const naturalRatio = imgWidth / imgHeight;
  const actualRatio = renderWidth / renderHeight;
  const distorted = Math.abs(naturalRatio - actualRatio) > 0.01;

  return {
    renderWidth,
    renderHeight,
    cropped,
    distorted,
    overflowsX: renderWidth > containerWidth,
    overflowsY: renderHeight > containerHeight,
  };
}

module.exports = {
  describe,
  test,
  expect,
  colors,
  registry,
  readProjectFile,
  projectFileExists,
  calculateContrastRatio,
  calculateRenderedImageBounds,
  projectRoot,
};
