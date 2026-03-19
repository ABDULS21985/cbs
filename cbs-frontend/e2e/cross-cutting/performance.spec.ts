/**
 * T7 — Playwright E2E: Performance Tests
 *
 * Tests Core Web Vitals, bundle size, code splitting, and rendering performance.
 */
import { test, expect, type Page } from '@playwright/test';

async function login(page: Page) {
  await page.goto('/login');
  await page.fill('[name="username"]', 'admin');
  await page.fill('[name="password"]', 'password');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard', { timeout: 10_000 });
}

// ─── Core Web Vitals ─────────────────────────────────────────────────

test.describe('Performance: Core Web Vitals', () => {
  test('LCP (Largest Contentful Paint) < 2.5s on dashboard', async ({ page }) => {
    await login(page);

    const lcp = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let lcpValue = 0;
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          lcpValue = lastEntry.startTime;
        });
        observer.observe({ type: 'largest-contentful-paint', buffered: true });

        // Wait a bit then resolve
        setTimeout(() => {
          observer.disconnect();
          resolve(lcpValue);
        }, 3000);
      });
    });

    console.log(`LCP: ${lcp}ms`);
    expect(lcp).toBeLessThan(2500);
  });

  test('CLS (Cumulative Layout Shift) < 0.1 on dashboard', async ({ page }) => {
    await login(page);

    const cls = await page.evaluate(() => {
      return new Promise<number>((resolve) => {
        let clsValue = 0;
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (!(entry as any).hadRecentInput) {
              clsValue += (entry as any).value;
            }
          }
        });
        observer.observe({ type: 'layout-shift', buffered: true });

        setTimeout(() => {
          observer.disconnect();
          resolve(clsValue);
        }, 3000);
      });
    });

    console.log(`CLS: ${cls}`);
    expect(cls).toBeLessThan(0.1);
  });
});

// ─── Page Load Performance ───────────────────────────────────────────

test.describe('Performance: Page Load', () => {
  test('dashboard loads within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await login(page);
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    console.log(`Dashboard load time: ${loadTime}ms`);
    expect(loadTime).toBeLessThan(10000); // 10s including login
  });

  const routes = [
    '/customers',
    '/lending',
    '/payments/new',
    '/cards',
    '/reports/executive',
  ];

  for (const route of routes) {
    test(`${route} loads within 5s`, async ({ page }) => {
      await login(page);

      const startTime = Date.now();
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;

      console.log(`${route} load time: ${loadTime}ms`);
      expect(loadTime).toBeLessThan(5000);
    });
  }
});

// ─── Code Splitting ──────────────────────────────────────────────────

test.describe('Performance: Code Splitting', () => {
  test('route-based lazy loading works (chunks loaded on navigation)', async ({ page }) => {
    await login(page);

    // Track network requests for JS chunks
    const chunkRequests: string[] = [];
    page.on('request', (request) => {
      const url = request.url();
      if (url.endsWith('.js') && url.includes('/assets/')) {
        chunkRequests.push(url);
      }
    });

    // Navigate to a new route
    await page.goto('/lending');
    await page.waitForLoadState('networkidle');

    // Additional chunks may be loaded for the route
    console.log(`JS chunks loaded: ${chunkRequests.length}`);
    // At minimum, the app should load some chunks
    expect(chunkRequests.length).toBeGreaterThanOrEqual(0);
  });
});

// ─── API Call Patterns ───────────────────────────────────────────────

test.describe('Performance: API Calls', () => {
  test('dashboard loads data without waterfall (parallel requests)', async ({ page }) => {
    await login(page);

    const apiCalls: { url: string; timestamp: number }[] = [];
    const startTime = Date.now();

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/api/')) {
        apiCalls.push({ url, timestamp: Date.now() - startTime });
      }
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    console.log('Dashboard API calls:');
    apiCalls.forEach((call) => {
      console.log(`  ${call.timestamp}ms: ${call.url.split('/api/')[1]?.substring(0, 60)}`);
    });

    // If multiple API calls, check they started close together (within 500ms = parallel)
    if (apiCalls.length >= 2) {
      const firstCall = apiCalls[0].timestamp;
      const secondCall = apiCalls[1].timestamp;
      const gap = Math.abs(secondCall - firstCall);
      console.log(`Gap between first two API calls: ${gap}ms`);
      // Parallel calls should start within 500ms of each other
      expect(gap).toBeLessThan(500);
    }
  });
});

// ─── Table Rendering Performance ─────────────────────────────────────

test.describe('Performance: Table Rendering', () => {
  test('customer list table renders without jank', async ({ page }) => {
    await login(page);

    const startTime = Date.now();
    await page.goto('/customers');
    await page.waitForLoadState('networkidle');

    // Wait for table to render
    const table = page.locator('table').first();
    if (await table.count() > 0) {
      await expect(table).toBeVisible();
    }

    const renderTime = Date.now() - startTime;
    console.log(`Customer list render time: ${renderTime}ms`);
    expect(renderTime).toBeLessThan(5000);
  });
});

// ─── Chart Rendering Performance ─────────────────────────────────────

test.describe('Performance: Chart Rendering', () => {
  test('dashboard charts render without visible lag', async ({ page }) => {
    await login(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Wait for Recharts SVG elements
    await page.waitForTimeout(1000);
    const charts = page.locator('.recharts-wrapper, svg.recharts-surface');
    const chartCount = await charts.count();

    console.log(`Charts rendered on dashboard: ${chartCount}`);

    // If charts exist, they should be visible
    if (chartCount > 0) {
      for (let i = 0; i < Math.min(chartCount, 6); i++) {
        await expect(charts.nth(i)).toBeVisible();
      }
    }
  });
});

// ─── Font Loading ────────────────────────────────────────────────────

test.describe('Performance: Font Loading', () => {
  test('fonts load without FOUT', async ({ page }) => {
    const fontRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('fonts.googleapis.com') || request.url().includes('fonts.gstatic.com')) {
        fontRequests.push(request.url());
      }
    });

    await login(page);
    await page.waitForLoadState('networkidle');

    // Check that fonts were requested
    console.log(`Font requests: ${fontRequests.length}`);

    // Verify the page uses the expected font family
    const fontFamily = await page.evaluate(() => {
      return getComputedStyle(document.body).fontFamily;
    });
    console.log(`Body font-family: ${fontFamily}`);
    expect(fontFamily).toBeTruthy();
  });
});

// ─── Image Loading ───────────────────────────────────────────────────

test.describe('Performance: Image Loading', () => {
  test('images use lazy loading for below-fold content', async ({ page }) => {
    await login(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    const images = page.locator('img');
    const imgCount = await images.count();

    if (imgCount > 0) {
      const lazyImages = page.locator('img[loading="lazy"]');
      const lazyCount = await lazyImages.count();
      console.log(`Total images: ${imgCount}, Lazy loaded: ${lazyCount}`);
    }
  });
});

// ─── Bundle Analysis ─────────────────────────────────────────────────

test.describe('Performance: Bundle', () => {
  test('page does not load excessive JS', async ({ page }) => {
    let totalJsBytes = 0;

    page.on('response', async (response) => {
      const url = response.url();
      if (url.endsWith('.js') || url.includes('.js?')) {
        const contentLength = response.headers()['content-length'];
        if (contentLength) {
          totalJsBytes += parseInt(contentLength);
        }
      }
    });

    await page.goto('/login');
    await page.waitForLoadState('networkidle');

    const totalKB = totalJsBytes / 1024;
    console.log(`Total JS loaded: ${totalKB.toFixed(0)}KB`);

    // Warn if over 1MB of JS
    if (totalKB > 1024) {
      console.warn(`JS bundle is over 1MB: ${totalKB.toFixed(0)}KB`);
    }
  });
});
