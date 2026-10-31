const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Image generators as inline SVG data-URIs
function makeSvgDataUri(width, height, label, color = '#3b82f6') {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="${width}" height="${height}" fill="#1e293b"/>
    <rect x="2" y="2" width="${width - 4}" height="${height - 4}" fill="none" stroke="${color}" stroke-width="4"/>
    <line x1="0" y1="0" x2="${width}" y2="${height}" stroke="${color}" stroke-width="2" stroke-opacity="0.4"/>
    <line x1="${width}" y1="0" x2="0" y2="${height}" stroke="${color}" stroke-width="2" stroke-opacity="0.4"/>
    <circle cx="${width/2}" cy="${height/2}" r="${Math.min(width, height)/4}" fill="${color}" fill-opacity="0.2" stroke="${color}" stroke-width="2"/>
    <text x="${width/2}" y="${height/2}" font-family="sans-serif" font-size="${Math.max(14, Math.floor(Math.min(width, height)/12))}" fill="#ffffff" font-weight="bold" text-anchor="middle" dominant-baseline="middle">${label} (${width}x${height})</text>
    <rect x="0" y="0" width="${width}" height="10" fill="#ef4444"/>
    <rect x="0" y="${height - 10}" width="${width}" height="10" fill="#22c55e"/>
    <rect x="0" y="0" width="10" height="${height}" fill="#eab308"/>
    <rect x="${width - 10}" y="0" width="10" height="${height}" fill="#a855f7"/>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const TEST_IMAGES = {
  portrait_9_16: { id: 'portrait_9_16', label: 'Portrait 9:16', uri: makeSvgDataUri(1080, 1920, '9:16 Portrait') },
  ultra_tall_9_21: { id: 'ultra_tall_9_21', label: 'Ultra Tall 9:21', uri: makeSvgDataUri(1080, 2520, '9:21 Ultra-Tall') },
  landscape_16_9: { id: 'landscape_16_9', label: 'Landscape 16:9', uri: makeSvgDataUri(1920, 1080, '16:9 Landscape') },
  ultra_wide_32_9: { id: 'ultra_wide_32_9', label: 'Ultra Wide 32:9', uri: makeSvgDataUri(3840, 1080, '32:9 Panoramic') },
  square_1_1: { id: 'square_1_1', label: 'Square 1:1', uri: makeSvgDataUri(600, 600, '1:1 Square') },
  standard_4_3: { id: 'standard_4_3', label: 'Standard 4:3', uri: makeSvgDataUri(1600, 1200, '4:3 Standard') },
};

const VIEWPORTS = [
  // Narrow mobile
  { id: 'narrow_280', name: 'Narrow mobile (Fold)', width: 280, height: 653, zoom: 1 },
  { id: 'narrow_320', name: 'Narrow mobile (iPhone SE1)', width: 320, height: 568, zoom: 1 },
  // Standard mobile
  { id: 'mobile_375', name: 'Standard mobile (iPhone 8)', width: 375, height: 667, zoom: 1 },
  { id: 'mobile_390', name: 'Standard mobile (iPhone 14)', width: 390, height: 844, zoom: 1 },
  { id: 'mobile_412', name: 'Standard mobile (Pixel 7)', width: 412, height: 915, zoom: 1 },
  // Mobile landscape (low height stress!)
  { id: 'landscape_667x375', name: 'Landscape mobile (iPhone 8 Low H)', width: 667, height: 375, zoom: 1 },
  { id: 'landscape_844x390', name: 'Landscape mobile (iPhone 14 Low H)', width: 844, height: 390, zoom: 1 },
  // Tablet
  { id: 'tablet_768', name: 'Tablet (iPad Mini)', width: 768, height: 1024, zoom: 1 },
  { id: 'tablet_820', name: 'Tablet (iPad Air)', width: 820, height: 1180, zoom: 1 },
  // Desktop
  { id: 'desktop_1280', name: 'Desktop (1280x800)', width: 1280, height: 800, zoom: 1 },
  { id: 'desktop_1920', name: 'Desktop (1920x1080)', width: 1920, height: 1080, zoom: 1 },
  // Browser zoom / scaling
  { id: 'zoom150_1280', name: 'Desktop (1280x800 @ 150% Zoom)', width: 1280, height: 800, zoom: 1.5 },
  { id: 'zoom200_1280', name: 'Desktop (1280x800 @ 200% Zoom)', width: 1280, height: 800, zoom: 2.0 },
  { id: 'zoom150_1920', name: 'Desktop (1920x1080 @ 150% Zoom)', width: 1920, height: 1080, zoom: 1.5 },
  { id: 'zoom200_1920', name: 'Desktop (1920x1080 @ 200% Zoom)', width: 1920, height: 1080, zoom: 2.0 },
];

function generateHtml(imageUri, exerciseData = {}) {
  const {
    name = 'Thoracic Extension & Foam Roller Mobility',
    week = '2',
    duration = '10',
    sets = '3',
    instructions = 'Lie face up with foam roller perpendicular to spine beneath shoulder blades. Support head with hands, interlace fingers behind neck. Gently extend spine over roller, breathing out. Hold for 3 seconds, then return to start. Do 10 controlled repetitions.',
    customPlan = 'Focus on mid-back extension. Do not arch lower back. If neck feels strained, place a folded towel under occiput.',
  } = exerciseData;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ExerciseTimerModal Empirical Test</title>
  <style>
    *, ::before, ::after {
      box-sizing: border-box;
    }
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      background: #020617;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      overflow: hidden;
    }
    
    /* Styles from CustomerPortal.jsx */
    .cart-modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(3, 8, 20, 0.65);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      z-index: 50;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .cart-modal {
      background: linear-gradient(180deg, rgba(13, 18, 30, 0.98), rgba(9, 13, 24, 0.98));
      border: 1px solid rgba(0, 212, 255, 0.35);
      border-radius: 20px;
      box-shadow: 0 0 40px rgba(0, 212, 255, 0.25), 0 24px 60px rgba(0, 0, 0, 0.7);
    }
    .cart-modal-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      padding: 18px 20px;
      border-bottom: 1px solid rgba(0, 212, 255, 0.2);
    }
    .cart-modal-close {
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.15);
      color: #fff;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
      flex-shrink: 0;
    }
  </style>
</head>
<body>
  <div id="root">
    <div class="cart-modal-overlay" id="overlay" style="z-index: 50;">
      <div 
        class="cart-modal" 
        id="modalCard"
        style="
          width: min(94vw, 520px); 
          max-height: 90vh; 
          overflow: hidden; 
          display: flex; 
          flex-direction: column;
          background: linear-gradient(180deg, rgba(13, 20, 36, 0.98), rgba(9, 14, 26, 0.98));
          border: 1px solid rgba(0, 210, 255, 0.35);
          border-radius: 20px;
          box-shadow: 0 0 40px rgba(0, 210, 255, 0.2), 0 24px 60px rgba(0, 0, 0, 0.8);
        "
      >
        <!-- Header -->
        <div 
          class="cart-modal-header" 
          id="modalHeader"
          style="
            align-items: center;
            padding: 18px 20px;
            border-bottom: 1px solid rgba(0, 210, 255, 0.2);
            background: rgba(15, 23, 42, 0.95);
          "
        >
          <div style="flex: 1; min-width: 0;">
            <span style="font-size: 0.72rem; font-weight: 800; color: #00d2ff; letter-spacing: 1.5px; text-transform: uppercase; display: block;">
              Exercise Guide & Instructions
            </span>
            <h3 id="exerciseTitle" style="color: #f8fafc; margin: 4px 0 0; font-size: 1.25rem; font-weight: 800; word-break: break-word;">
              ${name}
            </h3>
          </div>
          <button 
            class="cart-modal-close" 
            id="closeBtn"
            aria-label="Close"
            onclick="this.setAttribute('data-clicked', 'true'); window.__closeClicked = true;"
            style="
              background: rgba(255, 255, 255, 0.06);
              border: 1px solid rgba(255, 255, 255, 0.15);
              color: #94a3b8;
              width: 36px;
              height: 36px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              cursor: pointer;
              transition: all 0.2s;
              flex-shrink: 0;
            "
          >
            <svg id="closeSvg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <!-- Scrollable Content Body -->
        <div 
          id="modalBody"
          style="padding: 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 16px;"
        >
          <!-- Prescription Badges -->
          <div id="badgesContainer" style="display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
            <div style="display: flex; align-items: center; gap: 6px; background: rgba(0, 210, 255, 0.1); border: 1px solid rgba(0, 210, 255, 0.3); padding: 5px 12px; border-radius: 20px; font-size: 0.78rem; color: #00d2ff; font-weight: 700;">
              Week ${week}
            </div>
            <div style="display: flex; align-items: center; gap: 6px; background: rgba(46, 204, 113, 0.1); border: 1px solid rgba(46, 204, 113, 0.3); padding: 5px 12px; border-radius: 20px; font-size: 0.78rem; color: #2ecc71; font-weight: 700;">
              ${duration} mins
            </div>
            <div style="display: flex; align-items: center; gap: 6px; background: rgba(255, 153, 0, 0.1); border: 1px solid rgba(255, 153, 0, 0.3); padding: 5px 12px; border-radius: 20px; font-size: 0.78rem; color: #ff9900; font-weight: 700;">
              ${sets} sets daily
            </div>
          </div>

          <!-- Exercise Image Container -->
          <div 
            id="photoContainer"
            style="
              width: 100%;
              flex-shrink: 0;
              max-height: min(50vh, 360px);
              overflow: hidden;
              display: flex;
              align-items: center;
              justify-content: center;
              background: #040714;
              padding: 6px;
              border: 1px solid rgba(0, 210, 255, 0.25);
              border-radius: 14px;
              box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
            "
          >
            <img 
              id="exerciseImg"
              src="${imageUri}" 
              alt="Exercise" 
              style="
                max-width: 100%;
                max-height: min(50vh, 348px);
                width: auto;
                height: auto;
                object-fit: contain;
                display: block;
                border-radius: 10px;
              " 
            />
          </div>

          <!-- Instructions Box -->
          <div 
            id="instructionsBox"
            style="
              background: rgba(255, 255, 255, 0.04);
              border: 1px solid rgba(255, 255, 255, 0.1);
              border-radius: 12px;
              padding: 16px;
              box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
            "
          >
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px; color: #00d2ff; font-weight: 800; font-size: 0.85rem; letter-spacing: 0.5px; text-transform: uppercase;">
              How to Perform
            </div>
            <p id="instructionText" style="color: #f1f5f9; line-height: 1.65; font-size: 0.94rem; margin: 0; white-space: pre-wrap;">
              ${instructions}
            </p>
          </div>

          <!-- Guidance Box -->
          <div 
            id="guidanceBox"
            style="
              background: rgba(0, 210, 255, 0.08); 
              border: 1px solid rgba(0, 210, 255, 0.3); 
              border-left: 4px solid #00d2ff; 
              border-radius: 10px; 
              padding: 14px 16px;
            "
          >
            <div style="font-size: 0.78rem; color: #00d2ff; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">
              Physio's Special Guidance
            </div>
            <div id="guidanceText" style="color: #e2e8f0; font-size: 0.9rem; line-height: 1.55; white-space: pre-wrap;">
              ${customPlan}
            </div>
          </div>

          <!-- Completion CTA -->
          <button
            id="completionBtn"
            onclick="this.setAttribute('data-clicked', 'true'); window.__doneClicked = true;"
            style="
              margin-top: 4px;
              width: 100%;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 10px;
              padding: 14px 18px;
              border-radius: 12px;
              border: 1px solid rgba(0, 210, 255, 0.35);
              background: linear-gradient(135deg, rgba(0, 210, 255, 0.2) 0%, rgba(0, 150, 255, 0.1) 100%);
              color: #f8fafc;
              font-weight: 800;
              font-size: 0.95rem;
              cursor: pointer;
              transition: all 0.2s;
              box-shadow: 0 0 20px rgba(0, 210, 255, 0.15);
            "
          >
            Mark Exercise Completed For Today
          </button>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

async function runAdversarialSuite() {
  console.log('================================================================================');
  console.log('CHALLENGER M1-2: EMPIRICAL ADVERSARIAL VIEWPORT STRESS TEST HARNESS');
  console.log('Testing ExerciseTimerModal.jsx across 15 Viewport / Zoom variations and 6 Image Aspect Ratios');
  console.log('================================================================================\n');

  const screenshotsDir = path.join(__dirname, 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage();
  const allResults = [];
  let totalChecks = 0;
  let passedChecks = 0;
  let failedChecks = 0;

  for (const vp of VIEWPORTS) {
    console.log(`▸ Viewport: ${vp.name} [${vp.width}x${vp.height}, zoom: ${vp.zoom}x]`);

    await page.setViewport({
      width: vp.width,
      height: vp.height,
      deviceScaleFactor: vp.zoom
    });

    for (const [imgKey, imgInfo] of Object.entries(TEST_IMAGES)) {
      const html = generateHtml(imgInfo.uri);
      await page.setContent(html, { waitUntil: 'load' });

      // Check initial layout metrics
      const evaluation = await page.evaluate((vpInfo, imgMeta) => {
        const winW = window.innerWidth;
        const winH = window.innerHeight;

        const overlay = document.getElementById('overlay');
        const modalCard = document.getElementById('modalCard');
        const header = document.getElementById('modalHeader');
        const closeBtn = document.getElementById('closeBtn');
        const modalBody = document.getElementById('modalBody');
        const photoContainer = document.getElementById('photoContainer');
        const img = document.getElementById('exerciseImg');
        const guidanceBox = document.getElementById('guidanceBox');
        const completionBtn = document.getElementById('completionBtn');

        const cardRect = modalCard.getBoundingClientRect();
        const headerRect = header.getBoundingClientRect();
        const closeRect = closeBtn.getBoundingClientRect();
        const bodyRect = modalBody.getBoundingClientRect();
        const containerRect = photoContainer.getBoundingClientRect();
        const imgRect = img.getBoundingClientRect();
        const guidanceRect = guidanceBox.getBoundingClientRect();
        const btnRect = completionBtn.getBoundingClientRect();

        // 1. Close Button Check
        const closeCenterX = closeRect.left + closeRect.width / 2;
        const closeCenterY = closeRect.top + closeRect.height / 2;
        const elemAtPoint = document.elementFromPoint(closeCenterX, closeCenterY);
        const closeIsTopElement = elemAtPoint === closeBtn || closeBtn.contains(elemAtPoint);
        const closeInViewport = (
          closeRect.top >= 0 &&
          closeRect.bottom <= winH &&
          closeRect.left >= 0 &&
          closeRect.right <= winW
        );

        // 2. Photo Clipping Check
        // Allow 0.75px subpixel tolerance
        const eps = 0.75;
        // In CSS overflow:hidden, clipping occurs if img bounds exceed container padding-box (border-edge)
        const clippedTop = imgRect.top < (containerRect.top - eps);
        const clippedBottom = imgRect.bottom > (containerRect.bottom + eps);
        const clippedLeft = imgRect.left < (containerRect.left - eps);
        const clippedRight = imgRect.right > (containerRect.right + eps);
        const isClipped = clippedTop || clippedBottom || clippedLeft || clippedRight;

        // Header check
        const headerInViewport = headerRect.top >= 0 && headerRect.bottom <= winH;

        // Modal body scrollability check
        const isScrollNeeded = modalBody.scrollHeight > modalBody.clientHeight;
        const scrollDelta = modalBody.scrollHeight - modalBody.clientHeight;

        // Scroll body to bottom
        modalBody.scrollTop = modalBody.scrollHeight;
        const scrolledTop = modalBody.scrollTop;
        const btnRectAfterScroll = completionBtn.getBoundingClientRect();
        const guidanceRectAfterScroll = guidanceBox.getBoundingClientRect();

        const btnInViewportAfterScroll = (
          btnRectAfterScroll.top >= 0 &&
          btnRectAfterScroll.bottom <= winH &&
          btnRectAfterScroll.left >= 0 &&
          btnRectAfterScroll.right <= winW &&
          btnRectAfterScroll.top >= cardRect.top &&
          btnRectAfterScroll.bottom <= (cardRect.bottom + eps)
        );

        const guidanceInViewportAfterScroll = (
          guidanceRectAfterScroll.top >= cardRect.top &&
          guidanceRectAfterScroll.bottom <= (cardRect.bottom + eps) &&
          guidanceRectAfterScroll.bottom <= winH
        );

        // Horizontal overflow check
        const hasCardHOverflow = modalCard.scrollWidth > (modalCard.clientWidth + 1);
        const hasDocHOverflow = document.documentElement.scrollWidth > winW;

        // Reset scroll back to top for click testing
        modalBody.scrollTop = 0;

        return {
          winW, winH,
          cardRect: { top: cardRect.top, bottom: cardRect.bottom, left: cardRect.left, right: cardRect.right, width: cardRect.width, height: cardRect.height },
          headerRect: { top: headerRect.top, bottom: headerRect.bottom, height: headerRect.height },
          headerInViewport,
          closeRect: { top: closeRect.top, left: closeRect.left, width: closeRect.width, height: closeRect.height },
          closeInViewport,
          closeIsTopElement,
          containerRect: { width: containerRect.width, height: containerRect.height },
          imgRect: { width: imgRect.width, height: imgRect.height },
          clippedTop, clippedBottom, clippedLeft, clippedRight, isClipped,
          isScrollNeeded, scrollDelta,
          btnInViewportAfterScroll,
          guidanceInViewportAfterScroll,
          hasCardHOverflow,
          hasDocHOverflow
        };
      }, vp, imgInfo);

      // Perform Click Tests
      // 1. Click close button
      await page.click('#closeBtn');
      const clickedClose = await page.evaluate(() => window.__closeClicked === true || document.getElementById('closeBtn').getAttribute('data-clicked') === 'true');

      // 2. Scroll to bottom and click completion button
      await page.evaluate(() => {
        const mb = document.getElementById('modalBody');
        mb.scrollTop = mb.scrollHeight;
      });
      await page.click('#completionBtn');
      const clickedDone = await page.evaluate(() => window.__doneClicked === true || document.getElementById('completionBtn').getAttribute('data-clicked') === 'true');

      // Representative Screenshot Capture
      if (
        (vp.id === 'narrow_280' && imgKey === 'portrait_9_16') ||
        (vp.id === 'landscape_667x375' && imgKey === 'landscape_16_9') ||
        (vp.id === 'landscape_667x375' && imgKey === 'portrait_9_16') ||
        (vp.id === 'zoom200_1920' && imgKey === 'square_1_1')
      ) {
        const shotPath = path.join(screenshotsDir, `${vp.id}_${imgKey}_top.png`);
        await page.screenshot({ path: shotPath });
        // Also capture scrolled state
        await page.evaluate(() => {
          document.getElementById('modalBody').scrollTop = document.getElementById('modalBody').scrollHeight;
        });
        const shotPathScrolled = path.join(screenshotsDir, `${vp.id}_${imgKey}_bottom.png`);
        await page.screenshot({ path: shotPathScrolled });
      }

      // Assertions
      const checks = [
        {
          name: 'Close button visible & in viewport',
          pass: evaluation.closeInViewport && evaluation.closeIsTopElement,
          details: `In VP: ${evaluation.closeInViewport}, IsTop: ${evaluation.closeIsTopElement}`
        },
        {
          name: 'Close button clickable',
          pass: clickedClose,
          details: `Clicked: ${clickedClose}`
        },
        {
          name: 'Modal header visible and in viewport',
          pass: evaluation.headerInViewport,
          details: `Header height: ${evaluation.headerRect.height}px, In VP: ${evaluation.headerInViewport}`
        },
        {
          name: 'Photo container never clips image',
          pass: !evaluation.isClipped,
          details: `Clipped: ${evaluation.isClipped} (T:${evaluation.clippedTop}, B:${evaluation.clippedBottom}, L:${evaluation.clippedLeft}, R:${evaluation.clippedRight}) | img: ${evaluation.imgRect.width}x${evaluation.imgRect.height} in box: ${evaluation.containerRect.width}x${evaluation.containerRect.height}`
        },
        {
          name: 'Guidance and completion button reachable via scrolling',
          pass: evaluation.btnInViewportAfterScroll && evaluation.guidanceInViewportAfterScroll,
          details: `Btn in VP: ${evaluation.btnInViewportAfterScroll}, Guidance in VP: ${evaluation.guidanceInViewportAfterScroll}, ScrollDelta: ${evaluation.scrollDelta}px`
        },
        {
          name: 'Completion button clickable after scroll',
          pass: clickedDone,
          details: `Clicked: ${clickedDone}`
        },
        {
          name: 'No horizontal blowout or overflow',
          pass: !evaluation.hasDocHOverflow && !evaluation.hasCardHOverflow,
          details: `Doc overflow: ${evaluation.hasDocHOverflow}, Card overflow: ${evaluation.hasCardHOverflow}`
        }
      ];

      for (const c of checks) {
        totalChecks++;
        if (c.pass) {
          passedChecks++;
        } else {
          failedChecks++;
          console.error(`    ❌ [FAIL] ${vp.name} | ${imgInfo.label} | ${c.name}: ${c.details}`);
        }
      }

      const allPassed = checks.every(c => c.pass);
      console.log(`    ${allPassed ? '✓' : '✗'} ${imgInfo.label.padEnd(16)}: clipped=${evaluation.isClipped ? 'YES' : 'NO'}, btnReachable=${evaluation.btnInViewportAfterScroll}, closeClick=${clickedClose}, doneClick=${clickedDone}`);

      allResults.push({
        viewport: vp,
        image: imgInfo.label,
        checks,
        evaluation
      });
    }
  }

  await browser.close();

  console.log(`\n================================================================================`);
  console.log(`EMPIRICAL ADVERSARIAL STRESS TEST RESULTS`);
  console.log(`Total Checks Executed : ${totalChecks}`);
  console.log(`Checks Passed         : ${passedChecks}`);
  console.log(`Checks Failed         : ${failedChecks}`);
  console.log(`Pass Rate             : ${((passedChecks / totalChecks) * 100).toFixed(2)}%`);
  console.log(`================================================================================\n`);

  const reportPath = path.join(__dirname, 'adversarial_results.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    totalChecks,
    passedChecks,
    failedChecks,
    passRate: `${((passedChecks / totalChecks) * 100).toFixed(2)}%`,
    timestamp: new Date().toISOString(),
    results: allResults
  }, null, 2));

  if (failedChecks > 0) {
    throw new Error(`${failedChecks} of ${totalChecks} empirical checks failed!`);
  }
  return { totalChecks, passedChecks, failedChecks };
}

runAdversarialSuite().catch(err => {
  console.error('Fatal execution error:', err.message);
  process.exit(1);
});
