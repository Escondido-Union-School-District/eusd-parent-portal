const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Schools from the directory page. We need to figure out their individual site URLs.
// Apptegy/Thrillshare sites typically use: https://www.eusd.org/o/school-slug
const schools = [
  { shortName: 'Bernardo', slug: 'bernardo', type: 'elementary' },
  { shortName: 'Central', slug: 'central', type: 'elementary' },
  { shortName: 'Conway', slug: 'conway', type: 'elementary' },
  { shortName: 'Farr Avenue', slug: 'farr-avenue', type: 'elementary' },
  { shortName: 'Felicita', slug: 'felicita', type: 'elementary' },
  { shortName: 'Glen View', slug: 'glen-view', type: 'elementary' },
  { shortName: 'Juniper', slug: 'juniper', type: 'elementary' },
  { shortName: 'Lincoln', slug: 'lincoln', type: 'elementary' },
  { shortName: 'L.R. Green', slug: 'lr-green', type: 'elementary' },
  { shortName: 'Miller', slug: 'miller', type: 'elementary' },
  { shortName: 'North Broadway', slug: 'north-broadway', type: 'elementary' },
  { shortName: 'Oak Hill', slug: 'oak-hill', type: 'elementary' },
  { shortName: 'Orange Glen', slug: 'orange-glen', type: 'elementary' },
  { shortName: 'Pioneer', slug: 'pioneer', type: 'elementary' },
  { shortName: 'Reidy Creek', slug: 'reidy-creek', type: 'elementary' },
  { shortName: 'Rock Springs', slug: 'rock-springs', type: 'elementary' },
  { shortName: 'Rose', slug: 'rose', type: 'elementary' },
  { shortName: 'Quantum Academy', slug: 'quantum-academy', type: 'intermediate' },
  { shortName: 'Bear Valley', slug: 'bear-valley', type: 'middle' },
  { shortName: 'Del Dios', slug: 'del-dios', type: 'middle' },
  { shortName: 'Hidden Valley', slug: 'hidden-valley', type: 'middle' },
  { shortName: 'Mission', slug: 'mission', type: 'middle' },
  { shortName: 'Rincon', slug: 'rincon', type: 'middle' },
  { shortName: 'Limitless Learning Academy', slug: 'limitless-learning-academy', type: 'specialty' },
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const results = [];

  // First, test a known school URL pattern
  const testUrl = 'https://www.eusd.org/o/bernardo';
  console.log(`Testing URL pattern: ${testUrl}`);
  const response = await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  const status = response.status();
  console.log(`Status: ${status}`);

  if (status === 200) {
    console.log('URL pattern /o/slug works!\n');
  } else {
    // Try alternate patterns
    for (const pattern of ['bernardo-elementary', 'bernardo-elementary-school']) {
      const altUrl = `https://www.eusd.org/o/${pattern}`;
      console.log(`Trying: ${altUrl}`);
      const r = await page.goto(altUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      console.log(`Status: ${r.status()}`);
      if (r.status() === 200) break;
    }
  }

  await page.waitForTimeout(5000);

  // Extract info from the test page to understand the structure
  const testInfo = await page.evaluate(() => {
    const text = document.body.innerText;
    const footer = document.querySelector('footer');
    return {
      title: document.title,
      bodyPreview: text.substring(0, 3000),
      footerText: footer ? footer.innerText : 'no footer found'
    };
  });
  console.log('Page title:', testInfo.title);
  console.log('Footer:', testInfo.footerText.substring(0, 500));
  console.log('\nBody preview:\n', testInfo.bodyPreview.substring(0, 1500));

  // Now scrape all schools
  for (const school of schools) {
    const url = `https://www.eusd.org/o/${school.slug}`;
    console.log(`\n--- Scraping: ${school.shortName} (${url}) ---`);

    try {
      const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

      if (resp.status() !== 200) {
        console.log(`  Got status ${resp.status()}, trying alternate slugs...`);
        // Try without hyphens or other patterns
        const alts = [
          school.slug.replace(/-/g, ''),
          school.slug + '-elementary',
          school.slug + '-middle',
          school.slug + '-school',
        ];
        let found = false;
        for (const alt of alts) {
          const altUrl = `https://www.eusd.org/o/${alt}`;
          const r = await page.goto(altUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
          if (r.status() === 200) {
            console.log(`  Found at: ${altUrl}`);
            found = true;
            break;
          }
        }
        if (!found) {
          results.push({ ...school, url, error: 'Could not find school page' });
          continue;
        }
      }

      await page.waitForTimeout(4000);

      const info = await page.evaluate(() => {
        const text = document.body.innerText;
        const footer = document.querySelector('footer');
        const footerText = footer ? footer.innerText : '';

        // Phone: look for 760 numbers
        const phones = text.match(/760[.\-\s]?\d{3}[.\-\s]?\d{4}/g) || [];

        // Principal: look for pattern
        const principalPatterns = [
          /[Pp]rincipal[:\s–—-]+([A-Z][a-z]+(?:\s[A-Z]\.?)?\s[A-Z][a-zA-Z'-]+)/,
          /[Pp]rincipal[,:\s]+(?:Dr\.|Mr\.|Mrs\.|Ms\.)\s*([A-Z][a-zA-Z'-]+(?:\s[A-Z][a-zA-Z'-]+)+)/,
        ];
        let principal = null;
        for (const p of principalPatterns) {
          const m = text.match(p);
          if (m) { principal = m[1].trim(); break; }
        }

        // Also check footer for address
        const addressMatch = (footerText + '\n' + text).match(
          /(\d+\s+[A-Za-z\s.]+(?:Avenue|Ave|Street|St|Drive|Dr|Road|Rd|Boulevard|Blvd|Way|Lane|Ln)[.,\s]+Escondido[,\s]+CA\s*\d{5})/i
        );

        return {
          title: document.title,
          phones: [...new Set(phones)],
          principal,
          address: addressMatch ? addressMatch[1].trim() : null,
          footerText: footerText.substring(0, 800),
        };
      });

      const finalUrl = page.url();
      results.push({
        ...school,
        url: finalUrl,
        siteUrl: finalUrl,
        fullName: info.title.replace(/\s*[-–|].*$/, '').trim(),
        phone: info.phones[0] || null,
        allPhones: info.phones,
        principal: info.principal,
        address: info.address,
        footerText: info.footerText,
      });

      console.log(`  Name: ${info.title}`);
      console.log(`  Phone: ${info.phones[0] || 'not found'}`);
      console.log(`  Principal: ${info.principal || 'not found'}`);
      console.log(`  Address: ${info.address || 'not found'}`);
    } catch (err) {
      console.log(`  ERROR: ${err.message}`);
      results.push({ ...school, url, error: err.message });
    }
  }

  fs.writeFileSync(
    path.join(__dirname, '..', 'data', 'school-details-raw.json'),
    JSON.stringify(results, null, 2)
  );
  console.log(`\nDone! Saved ${results.length} school records to data/school-details-raw.json`);

  await browser.close();
})();
