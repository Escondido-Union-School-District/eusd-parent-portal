const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log('Navigating to EUSD bell schedules page...');
  await page.goto('https://www.eusd.org/page/eusd-bell-schedules', { waitUntil: 'domcontentloaded', timeout: 60000 });

  // Wait for Thrillshare client-side content to render
  console.log('Waiting for content to render...');
  await page.waitForTimeout(8000);

  console.log('Extracting bell schedule data...');

  const content = await page.content();
  fs.writeFileSync(path.join(__dirname, '..', 'data', 'bells-page-raw.html'), content);
  console.log('Saved raw HTML to data/bells-page-raw.html');

  const bells = await page.evaluate(() => {
    const allText = document.body.innerText;

    // Try to find tables with bell schedule data
    const tables = Array.from(document.querySelectorAll('table')).map(table => {
      const rows = Array.from(table.querySelectorAll('tr')).map(row => {
        return Array.from(row.querySelectorAll('td, th')).map(cell => cell.innerText.trim());
      });
      return rows;
    });

    // Try various content selectors
    const selectors = [
      '.content-block', '.page-content', '.rich-text',
      '[class*="bell"]', '[class*="schedule"]',
      'article', 'main', '.content'
    ];

    const results = [];
    for (const sel of selectors) {
      const els = document.querySelectorAll(sel);
      if (els.length > 0) {
        els.forEach(el => {
          const text = el.innerText.trim();
          if (text.length > 10) {
            results.push({ selector: sel, text: text.substring(0, 2000) });
          }
        });
      }
    }

    return { tables, results, bodyTextPreview: allText.substring(0, 8000) };
  });

  console.log(`Found ${bells.tables.length} tables`);
  if (bells.tables.length > 0) {
    bells.tables.forEach((table, i) => {
      console.log(`\nTable ${i + 1} (${table.length} rows):`);
      table.forEach(row => console.log('  ', row.join(' | ')));
    });
  }

  console.log('\nBody text preview:\n', bells.bodyTextPreview.substring(0, 3000));

  fs.writeFileSync(
    path.join(__dirname, '..', 'data', 'bells-raw-extract.json'),
    JSON.stringify(bells, null, 2)
  );
  console.log('\nSaved raw extraction to data/bells-raw-extract.json');

  await browser.close();
})();
