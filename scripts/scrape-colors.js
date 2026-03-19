const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const schools = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'schools.json'), 'utf8'));

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const results = {};

  for (const school of schools) {
    if (!school.siteUrl) continue;
    console.log(`Scraping color: ${school.shortName} (${school.siteUrl})`);

    try {
      await page.goto(school.siteUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(3000);

      const color = await page.evaluate(() => {
        // Thrillshare/Apptegy sites typically set a primary color on:
        // - the header/nav background
        // - CSS custom properties
        // - meta theme-color
        // - various branded elements

        // Check meta theme-color
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta && meta.content) return meta.content;

        // Check CSS custom properties on root
        const root = getComputedStyle(document.documentElement);
        const cssVars = ['--school-color', '--primary-color', '--brand-color', '--header-bg'];
        for (const v of cssVars) {
          const val = root.getPropertyValue(v).trim();
          if (val) return val;
        }

        // Check header/nav background color
        const headerSelectors = [
          '.school-header', 'header', 'nav', '.navbar',
          '[class*="header"]', '[class*="nav"]',
          '.hero', '[class*="hero"]', '[class*="banner"]'
        ];
        for (const sel of headerSelectors) {
          const el = document.querySelector(sel);
          if (el) {
            const bg = getComputedStyle(el).backgroundColor;
            // Skip white, transparent, very light colors
            if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'rgb(255, 255, 255)' && bg !== 'transparent') {
              // Parse rgb values to check it's not too light
              const match = bg.match(/\d+/g);
              if (match) {
                const [r, g, b] = match.map(Number);
                const luminance = (r * 299 + g * 587 + b * 114) / 1000;
                if (luminance < 200) return bg;
              }
            }
          }
        }

        // Check all elements for the most prominent non-white, non-black background
        const all = document.querySelectorAll('*');
        const colorCounts = {};
        for (let i = 0; i < Math.min(all.length, 200); i++) {
          const bg = getComputedStyle(all[i]).backgroundColor;
          if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'rgb(255, 255, 255)' &&
              bg !== 'rgb(0, 0, 0)' && bg !== 'transparent') {
            const match = bg.match(/\d+/g);
            if (match) {
              const [r, g, b] = match.map(Number);
              const luminance = (r * 299 + g * 587 + b * 114) / 1000;
              if (luminance > 30 && luminance < 200) {
                colorCounts[bg] = (colorCounts[bg] || 0) + 1;
              }
            }
          }
        }

        // Return the most common colored background
        const sorted = Object.entries(colorCounts).sort((a, b) => b[1] - a[1]);
        if (sorted.length > 0) return sorted[0][0];

        return null;
      });

      console.log(`  Color: ${color || 'not found'}`);
      results[school.id] = color;
    } catch (err) {
      console.log(`  ERROR: ${err.message}`);
      results[school.id] = null;
    }
  }

  // Convert rgb() to hex
  const hexResults = {};
  Object.entries(results).forEach(([id, color]) => {
    if (!color) { hexResults[id] = null; return; }
    const match = color.match(/\d+/g);
    if (match && match.length >= 3) {
      const hex = '#' + match.slice(0, 3).map(n => parseInt(n).toString(16).padStart(2, '0')).join('');
      hexResults[id] = hex;
    } else if (color.startsWith('#')) {
      hexResults[id] = color;
    } else {
      hexResults[id] = color;
    }
  });

  console.log('\nResults:');
  console.log(JSON.stringify(hexResults, null, 2));

  fs.writeFileSync(path.join(__dirname, '..', 'data', 'school-colors.json'), JSON.stringify(hexResults, null, 2));
  console.log('\nSaved to data/school-colors.json');

  await browser.close();
})();
