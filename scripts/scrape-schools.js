const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('Navigating to EUSD schools page...');
  await page.goto('https://www.eusd.org/page/schools', { waitUntil: 'domcontentloaded', timeout: 60000 });

  // Wait for Thrillshare client-side content to render
  console.log('Waiting for content to render...');
  await page.waitForTimeout(8000);

  console.log('Extracting school data...');

  // Get the page content for debugging
  const content = await page.content();
  fs.writeFileSync(path.join(__dirname, '..', 'data', 'schools-page-raw.html'), content);
  console.log('Saved raw HTML to data/schools-page-raw.html');

  // Try to extract school information
  const schools = await page.evaluate(() => {
    const results = [];

    // Thrillshare/Apptegy pages often use specific patterns
    // Look for school cards, links, or structured content
    const allText = document.body.innerText;

    // Try various selectors that Apptegy sites commonly use
    const selectors = [
      '.school-card', '.school-item', '.school-listing',
      '[class*="school"]', '[class*="School"]',
      '.content-block', '.page-content',
      'article', '.card', '.listing-item',
      '[data-school]', '[data-type="school"]'
    ];

    for (const sel of selectors) {
      const els = document.querySelectorAll(sel);
      if (els.length > 3) {
        console.log(`Found ${els.length} elements with selector: ${sel}`);
        els.forEach(el => {
          const text = el.innerText.trim();
          const links = Array.from(el.querySelectorAll('a')).map(a => ({
            text: a.innerText.trim(),
            href: a.href
          }));
          if (text.length > 5) {
            results.push({ selector: sel, text: text.substring(0, 500), links });
          }
        });
      }
    }

    // Also grab all links that look school-related
    const allLinks = Array.from(document.querySelectorAll('a')).filter(a =>
      a.href.includes('/o/') || a.href.includes('school') || a.innerText.match(/elementary|middle|heritage/i)
    ).map(a => ({
      text: a.innerText.trim(),
      href: a.href
    }));

    return { results, allLinks, bodyTextPreview: allText.substring(0, 5000) };
  });

  console.log(`Found ${schools.allLinks.length} school-related links`);
  console.log('Links:', JSON.stringify(schools.allLinks, null, 2));
  console.log('\nBody text preview:\n', schools.bodyTextPreview.substring(0, 2000));

  if (schools.results.length > 0) {
    console.log(`\nFound ${schools.results.length} structured elements`);
  }

  fs.writeFileSync(
    path.join(__dirname, '..', 'data', 'schools-raw-extract.json'),
    JSON.stringify(schools, null, 2)
  );
  console.log('\nSaved raw extraction to data/schools-raw-extract.json');

  await browser.close();
})();
