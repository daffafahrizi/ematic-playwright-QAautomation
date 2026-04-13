import { Page, expect, test } from '@playwright/test';

export async function validateFeaturedProducts(page: Page, regionCode: string, landingUrl: string) {
    // --- PHASE 1: DISCOVERY ---
    console.log(`[${regionCode}] Navigating to Landing Page: ${landingUrl}`);
    await page.goto(landingUrl, { waitUntil: 'domcontentloaded' });

    // Handle Cookie Pop-up
    const cookieAcceptButton = page.locator('#onetrust-accept-btn-handler');
    try {
        await cookieAcceptButton.waitFor({ state: 'visible', timeout: 5000 });
        await cookieAcceptButton.click();
        console.log(`[${regionCode}] Cookies accepted/dismissed.`);
    } catch (error) {
        console.log(`[${regionCode}] No cookie banner appeared or it was already accepted.`);
    }

    // Find all collection links in the navbar / page
    const allLinks = await page.locator('a[href*="-collection"]').elementHandles();
    const urlsToTest: string[] = [];
    const baseUrl = new URL(landingUrl).origin;

    for (const link of allLinks) {
        const href = await link.getAttribute('href');
        if (href && href.includes('/bathroom-collections/') && !urlsToTest.includes(href)) {
            const absoluteUrl = href.startsWith('http') ? href : `${baseUrl}${href}`;

            // Filter out the main landing page itself to prevent a recursive loop
            if (absoluteUrl !== landingUrl && absoluteUrl !== `${landingUrl}/`) {
                urlsToTest.push(absoluteUrl);
            }
        }
    }

    console.log(`[${regionCode}] Discovered ${urlsToTest.length} active collections.`);

    // --- PHASE 2: VALIDATION ---
    for (const url of urlsToTest) {
        await test.step(`Checking Collection: ${url}`, async () => {
            await page.goto(url, { waitUntil: 'domcontentloaded' });

            // Extract expected collection name from H1 or URL slug
            const h1Element = page.locator('h1').first();
            let expectedName = '';

            if (await h1Element.isVisible()) {
                const pageTitle = await h1Element.innerText();
                expectedName = pageTitle.replace(/Collection/i, '').trim().toLowerCase();
            } else {
                const urlParts = url.split('/').filter(p => p.length > 0);
                const slug = urlParts[urlParts.length - 1];
                expectedName = slug.replace('-collection', '').replace(/-/g, ' ').toLowerCase();
            }

            // Locate the specific Elementor container holding the Featured Products
            const loopContainer = page.locator('.elementor-loop-container').first();

            // Check if the container exists in the DOM first
            if (await loopContainer.count() > 0) {
                // Scroll the screen exactly to where this container is located
                await loopContainer.scrollIntoViewIfNeeded();

                // Wait 1 second to allow Elementor's lazy-load animation to render the inner items
                await page.waitForTimeout(1000);
            } else {
                console.log(`⚠️  Skipping ${expectedName} - No Featured Products section found.`);
                return; // Skip to the next URL if there's no container
            }

            // Proceed with validation now that elements are rendered in the viewport
            const productCards = loopContainer.locator('.e-loop-item');
            const count = await productCards.count();

            for (let i = 0; i < count; i++) {
                const card = productCards.nth(i);
                const categoryLocator = card.locator('.elementor-widget-post-info .elementor-icon-list-text').first();

                if (await categoryLocator.isVisible()) {
                    const actualText = await categoryLocator.innerText();
                    const originalActualText = actualText.trim();
                    const actualTextClean = originalActualText.toLowerCase();

                    // 📸 SCREENSHOT LOGIC ON FAILURE
                    if (!actualTextClean.includes(expectedName)) {
                        const timestamp = Date.now();
                        // Generate a clear filename stating what rogue product was found
                        const rogueItemName = actualTextClean.replace(/\s+/g, '-');
                        const screenshotPath = `test-results/screenshots/BUG-${regionCode}-${expectedName}-found-${rogueItemName}-${timestamp}.png`;

                        // Take a viewport screenshot to capture the bug in its scrolled position
                        await page.screenshot({ path: screenshotPath });
                        console.log(`📸 BUG DETECTED! Mismatched product found. Screenshot saved to: ${screenshotPath}`);
                    }

                    // 🚨 CUSTOM ERROR MESSAGE
                    // Run the soft assertion to log the failure in the Playwright report without stopping the test
                    expect.soft(
                        actualTextClean,
                        `❌ BUG in ${regionCode}: The page is '${expectedName}', but we found a '${originalActualText}' product at item #${i + 1}!`
                    ).toContain(expectedName);
                }
            }
        });
    }
}