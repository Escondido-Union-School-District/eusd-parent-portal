const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const schools = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'schools.json'), 'utf8'));

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const allStaff = {};

  for (const school of schools) {
    const slug = school.siteUrl.replace('https://www.eusd.org/o/', '');
    const staffUrl = 'https://www.eusd.org/o/' + slug + '/staff';
    console.log(`\nScraping: ${school.shortName} (${staffUrl})`);

    try {
      await page.goto(staffUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(5000);

      // Extract staff from the rendered page
      const staff = await page.evaluate(() => {
        const results = [];
        // Thrillshare staff pages use staff card elements
        // Look for elements that contain staff info
        const cards = document.querySelectorAll('[class*="staff"], [class*="Staff"], [data-staff]');

        if (cards.length > 3) {
          cards.forEach(card => {
            const text = card.innerText.trim();
            if (text.length > 3 && text.length < 200) {
              const lines = text.split('\n').map(l => l.trim()).filter(l => l);
              if (lines.length >= 2) {
                results.push({
                  name: lines[0],
                  role: lines[1] || '',
                  department: lines[2] || ''
                });
              }
            }
          });
        }

        // Fallback: parse from body text
        if (results.length === 0) {
          const bodyText = document.body.innerText;
          const lines = bodyText.split('\n').map(l => l.trim()).filter(l => l);

          const skipWords = ['Skip', 'MENU', 'SCHOOLS', 'TRANSLATE', 'SEARCH', 'SIGN IN',
            'Find Us', 'Say Something', 'Submit', 'Report', 'EUSD', 'Website', 'Copyright',
            'Powered', 'Stay Connected', 'Policies', 'Local Control', 'Uniform', 'Anonymous',
            'committed', 'handbook', 'STAFF', 'Search', 'Use the', 'Select', 'Jump to',
            'Fax:', 'Office:', 'Main:'];

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            // Staff names are ALL CAPS, 2+ words, 4+ chars
            if (/^[A-Z][A-Z\s.'\-]{3,}$/.test(line) && line.split(/\s+/).length >= 2) {
              if (skipWords.some(w => line.startsWith(w.toUpperCase()))) continue;
              if (/^\d/.test(line)) continue;

              // Title-case the name
              const name = line.split(' ').map(w => {
                if (w.length <= 2) return w;
                return w.charAt(0) + w.slice(1).toLowerCase();
              }).join(' ');

              const role = (i + 1 < lines.length && !/^[A-Z]{4,}/.test(lines[i + 1])) ? lines[i + 1] : '';
              const dept = (i + 2 < lines.length && !/^[A-Z]{4,}/.test(lines[i + 2]) && role) ? lines[i + 2] : '';

              if (role && !skipWords.some(w => role.startsWith(w))) {
                results.push({ name, role, department: dept });
              }
            }
          }
        }

        return results;
      });

      // Dedupe by name
      const seen = new Set();
      const unique = staff.filter(s => {
        const key = s.name.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      allStaff[school.id] = unique;
      console.log(`  Found ${unique.length} staff`);

    } catch (err) {
      console.log(`  ERROR: ${err.message}`);
      allStaff[school.id] = [];
    }
  }

  const outputPath = path.join(__dirname, '..', 'data', 'staff.json');
  fs.writeFileSync(outputPath, JSON.stringify(allStaff, null, 2));

  const total = Object.values(allStaff).reduce((s, a) => s + a.length, 0);
  console.log(`\nDone! ${total} staff across ${Object.keys(allStaff).length} schools`);

  await browser.close();
})();
