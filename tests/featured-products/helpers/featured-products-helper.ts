import { Page, expect } from '@playwright/test';

// 🌟 ALIAS MAPPING: Define allowed alternate names here
const allowedAliases: Record<string, string[]> = {
    'concept nuovo': ['concept'],
    'acacia evolution': ['acacia e'],
    'compact codie': ['codie'],
};

export async function validateCollectionFromJson(page: Page, regionCode: string, collection: { name: string, url: string }) {
    const expectedName = collection.name.toLowerCase();

    // 1. Navigate to the collection URL
    try {
        await page.goto(collection.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    } catch (error) {
        console.log(`⚠️  Warning: Page ${collection.url} took too long to load, proceeding with checks...`);
    }

    // 🍪 --- SUPERCHARGED COOKIE HANDLER --- 🍪
    try {
        let cookieBtn = page.locator('#onetrust-accept-btn-handler');

        if (await cookieBtn.count() === 0) {
            cookieBtn = page.locator('button').filter({
                hasText: /(Accept All|Accept Cookies|Setuju|Đồng ý|Chấp nhận|ยอมรับ)/i
            }).first();
        }

        if (await cookieBtn.isVisible({ timeout: 5000 })) {
            await cookieBtn.click({ timeout: 3000 });
            await page.waitForTimeout(1000);
            console.log(`🍪 [${regionCode}] Cookie banner successfully accepted/dismissed.`);
        }
    } catch (e) {
        // Silently ignore if no cookie banner interrupts the page
    }

    // 2. FEATURED PRODUCTS VALIDATION
    const loopContainer = page.locator('.elementor-loop-container').first();

    try {
        await loopContainer.waitFor({ state: 'visible', timeout: 7000 });
        await loopContainer.scrollIntoViewIfNeeded({ timeout: 5000 });
        await page.waitForTimeout(1000);
    } catch (e) {
        const missingSectionError = `❌ BUG in ${regionCode}: Featured Products section is MISSING entirely on '${collection.name}' | URL: ${collection.url}`;
        const timestamp = Date.now();
        const collectionNameSlug = collection.name.replace(/\s+/g, '-');
        await page.screenshot({ path: `test-results/screenshots/BUG-${regionCode}-${collectionNameSlug}-MISSING-${timestamp}.png` });

        expect.soft(false, missingSectionError).toBe(true);
        return; // Exit if the section is completely missing
    }

    const productCards = loopContainer.locator('.e-loop-item');
    const count = await productCards.count();
    const mismatchedProducts: string[] = [];

    for (let i = 0; i < count; i++) {
        const card = productCards.nth(i);

        // 🌟 UPDATE: Read the text content of the ENTIRE product card
        const fullCardText = await card.textContent();
        const fullCardTextClean = (fullCardText ? fullCardText.trim() : '').toLowerCase();

        // Check if the expected name exists ANYWHERE inside the product card
        let isMatch = fullCardTextClean.includes(expectedName);

        // If standard check fails, check against aliases
        if (!isMatch && allowedAliases[expectedName]) {
            isMatch = allowedAliases[expectedName].some(alias => fullCardTextClean.includes(alias));
        }

        // If it STILL doesn't match anywhere in the card, record it as a mismatch
        if (!isMatch) {
            // For the error report, we just want to extract a readable name, not the whole card text
            const titleLocator = card.locator('.elementor-heading-title').last();
            let rogueProductName = 'Unknown Product';

            if (await titleLocator.isVisible()) {
                const rawTitle = await titleLocator.textContent();
                rogueProductName = rawTitle ? rawTitle.trim() : 'Unknown Product';
            }

            mismatchedProducts.push(rogueProductName);
        }
    }

    // 📸 ONE SCREENSHOT LOGIC (If there are mismatched products)
    if (mismatchedProducts.length > 0) {
        const uniqueMismatches = [...new Set(mismatchedProducts)];
        const rogueItemsList = uniqueMismatches.join(', ');

        const timestamp = Date.now();
        const collectionNameSlug = collection.name.replace(/\s+/g, '-');
        const screenshotPath = `test-results/screenshots/BUG-${regionCode}-${collectionNameSlug}-mismatch-${timestamp}.png`;

        await loopContainer.scrollIntoViewIfNeeded();
        await page.screenshot({ path: screenshotPath });

        const errorMsg = `❌ BUG in ${regionCode}: Expected '${collection.name}', but found '${rogueItemsList}'! Screenshot saved. | URL: ${collection.url}`;
        console.log(errorMsg);

        expect.soft(mismatchedProducts.length, errorMsg).toBe(0);
    } else {
        console.log(`✅ [${regionCode}] ${collection.name} - Products match perfectly.`);
    }
}