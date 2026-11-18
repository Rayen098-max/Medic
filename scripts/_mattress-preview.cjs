const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

const OUT = path.join(process.cwd(), 'shots');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: [
      '--enable-unsafe-swiftshader',
      '--use-angle=swiftshader',
      '--ignore-gpu-blocklist',
      '--enable-webgl',
      '--no-sandbox'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

  const logs = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      logs.push(`[${msg.type()}] ${msg.text()}`);
    }
  });
  page.on('pageerror', (err) => logs.push(`[pageerror] ${err.message}`));

  const shot = async (name) => {
    await new Promise((resolve) => setTimeout(resolve, 1800));
    await page.screenshot({ path: path.join(OUT, name), type: 'png' });
    console.log('shot', name);
  };

  await page.goto('http://127.0.0.1:5173/mattress', { waitUntil: 'networkidle2', timeout: 60000 });
  await new Promise((resolve) => setTimeout(resolve, 5000));
  await shot('01-comfort-390x844.png');

  // Split layers overview
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) =>
      b.textContent.includes('SPLIT LAYERS')
    );
    btn?.click();
  });
  await shot('02-split-390x844.png');

  // Inspect SmartGrid layer
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) =>
      b.textContent.includes('SMART GRID')
    );
    btn?.click();
  });
  await shot('03-split-smartgrid-390x844.png');

  // Inspect foam layer
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) =>
      b.textContent.includes('ORTHORELIEF FOAM')
    );
    btn?.click();
  });
  await shot('04-split-foam-390x844.png');

  // Inspect base layer
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) =>
      b.textContent.includes('7 ZONE BODY SUPPORT')
    );
    btn?.click();
  });
  await shot('05-split-base-390x844.png');

  // Back to comfort, remove grid
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) =>
      b.textContent.includes('COMFORT SIMULATOR')
    );
    btn?.click();
  });
  await new Promise((resolve) => setTimeout(resolve, 1500));
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) =>
      b.textContent.includes('Remove Grid')
    );
    btn?.click();
  });
  await shot('06-comfort-no-grid-390x844.png');

  // No base
  await page.evaluate(() => {
    const reset = document.querySelector('button[aria-label="Reset simulation"]');
    reset?.click();
  });
  await new Promise((resolve) => setTimeout(resolve, 1200));
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) =>
      b.textContent.includes('Remove 7-Zone Base')
    );
    btn?.click();
  });
  await shot('07-comfort-no-base-390x844.png');

  // Zone sheet
  await page.evaluate(() => {
    const reset = document.querySelector('button[aria-label="Reset simulation"]');
    reset?.click();
  });
  await new Promise((resolve) => setTimeout(resolve, 1200));
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) =>
      b.textContent.includes('Z7')
    );
    btn?.click();
  });
  await shot('08-zone-sheet-390x844.png');

  // Model picker
  await page.evaluate(() => {
    const close = [...document.querySelectorAll('button')].find(
      (b) => b.getAttribute('aria-label') === 'Close zone details'
    );
    close?.click();
  });
  await new Promise((resolve) => setTimeout(resolve, 500));
  await page.evaluate(() => {
    const btn = document.querySelector('button[aria-label="Change mattress model"]');
    btn?.click();
  });
  await shot('09-model-picker-390x844.png');

  // Compact landscape prompt
  await page.setViewport({ width: 844, height: 390, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await shot('10-landscape-prompt-844x390.png');

  console.log('--- console ---');
  console.log(logs.slice(0, 40).join('\n'));
  await browser.close();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
