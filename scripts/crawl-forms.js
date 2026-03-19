const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const START_URL = 'https://www.eusd.org';
const MAX_PAGES = 500;

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });
  // Set default navigation timeout
  context.setDefaultNavigationTimeout(20000);
  context.setDefaultTimeout(15000);

  const visited = new Set();
  const queue = [START_URL];
  const results = new Map(); // url -> { url, title, foundOn, category }
  let pagesVisited = 0;

  function normaliseUrl(raw, base) {
    try {
      const u = new URL(raw, base);
      if (!u.protocol.startsWith('http')) return null;
      u.hash = '';
      return u.href;
    } catch {
      return null;
    }
  }

  /** Only crawl www.eusd.org pages (not subdomains like powerschool, library) */
  function isCrawlable(url) {
    try {
      const u = new URL(url);
      return u.hostname === 'www.eusd.org' || u.hostname === 'eusd.org';
    } catch {
      return false;
    }
  }

  /** Is a link on any eusd.org subdomain? (for collecting PDFs from subdomains) */
  function isEusd(url) {
    try {
      const u = new URL(url);
      return u.hostname === 'eusd.org' || u.hostname.endsWith('.eusd.org');
    } catch {
      return false;
    }
  }

  function isPdf(url) {
    try {
      const u = new URL(url);
      return u.pathname.toLowerCase().endsWith('.pdf');
    } catch {
      return false;
    }
  }

  function isFormPage(url, title) {
    const lower = (s) => (s || '').toLowerCase();
    return lower(url).includes('form') || lower(title).includes('form');
  }

  /** Process a single page with an overall timeout */
  async function processPage(currentUrl) {
    const page = await context.newPage();
    try {
      await page.goto(currentUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 20000,
      });
      // Thrillshare renders client-side
      await page.waitForTimeout(3000);

      const pageTitle = await page.title().catch(() => '');

      // If this is a "form" page, record it
      if (isFormPage(currentUrl, pageTitle)) {
        if (!results.has(currentUrl)) {
          results.set(currentUrl, {
            url: currentUrl,
            title: pageTitle || currentUrl,
            foundOn: '',
            category: '',
          });
        }
      }

      // Extract all links on the page
      const links = await page.$$eval('a[href]', (anchors) =>
        anchors.map((a) => ({
          href: a.href,
          text: (a.textContent || '').trim().substring(0, 200),
        }))
      );

      for (const link of links) {
        const norm = normaliseUrl(link.href, currentUrl);
        if (!norm) continue;

        // Collect PDFs from ANY domain (eusd.org hosts PDFs on external CDNs)
        if (isPdf(norm)) {
          if (!results.has(norm)) {
            results.set(norm, {
              url: norm,
              title: link.text || decodeURIComponent(path.basename(new URL(norm).pathname)),
              foundOn: currentUrl,
              category: '',
            });
          }
        }

        // Only queue www.eusd.org pages for crawling
        if (isCrawlable(norm) && !visited.has(norm) && !isPdf(norm)) {
          queue.push(norm);
        }
      }
    } finally {
      await page.close().catch(() => {});
    }
  }

  while (queue.length > 0 && pagesVisited < MAX_PAGES) {
    const currentUrl = queue.shift();
    const norm = normaliseUrl(currentUrl, START_URL);
    if (!norm) continue;
    if (visited.has(norm)) continue;
    if (!isCrawlable(norm)) continue;
    if (isPdf(norm)) continue;
    visited.add(norm);

    pagesVisited++;
    const pdfCount = [...results.values()].filter((r) => isPdf(r.url)).length;
    const formCount = [...results.values()].filter((r) => !isPdf(r.url)).length;
    console.log(
      `[${pagesVisited}/${MAX_PAGES}] ${norm}  (PDFs: ${pdfCount}, forms: ${formCount})`
    );

    try {
      // Race the page processing against a 40s hard timeout
      await Promise.race([
        processPage(norm),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Hard timeout (40s)')), 40000)
        ),
      ]);
    } catch (err) {
      console.error(`  ERROR: ${err.message}`);
    }
  }

  await browser.close();

  // Build sorted output
  const output = [...results.values()].sort((a, b) =>
    (a.title || '').localeCompare(b.title || '', undefined, {
      sensitivity: 'base',
    })
  );

  const outPath = path.join(__dirname, '..', 'data', 'forms.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf-8');

  console.log(`\nDone. ${output.length} results written to ${outPath}`);
  console.log(
    `  PDFs: ${output.filter((r) => isPdf(r.url)).length}`,
    `| Form pages: ${output.filter((r) => !isPdf(r.url)).length}`
  );
  console.log(`  Pages visited: ${pagesVisited}`);
})();
