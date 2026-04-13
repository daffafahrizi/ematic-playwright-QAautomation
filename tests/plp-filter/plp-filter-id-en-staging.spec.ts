import { test, expect, Page } from '@playwright/test';

// ==========================================
// 1. MASTER DATA DICTIONARY (Lookup Table - BASE)
// ==========================================
const collectionToStyleMap: Record<string, string> = {
    // --- CONTEMPORARY GROUP ---
    "Signature": "Contemporary", "Acacia Supasleek": "Contemporary", "Acacia SupaSleek": "Contemporary",
    "Acacia Evolution": "Contemporary", "City": "Contemporary", "Loven": "Contemporary",
    "Neo Modern": "Contemporary", "Flexio": "Contemporary", "Colors": "Contemporary",
    "Cygnet": "Contemporary", "Heron": "Contemporary", "Acacia": "Contemporary",
    "Aerozen": "Contemporary", "Aerozen G2": "Contemporary", "Concept": "Contemporary",
    "Concept D-Shape": "Contemporary", "DuoSTiX": "Contemporary", "DuoSTiX‚": "Contemporary", 
    "DuoSTiX™": "Contemporary", "E-lite": "Contemporary", "EasyFlo": "Contemporary", 
    "EasyFLO": "Contemporary", "EasySET": "Contemporary", "EasySet": "Contemporary",
    "Flexbrook": "Contemporary", "Genie": "Contemporary", "Lynbrook": "Contemporary",
    "Mini Washbrook": "Contemporary", "Moonshadow": "Contemporary", "PLAT": "Contemporary",
    "RainClick": "Contemporary", "Temptacion": "Contemporary", "Washbrook": "Contemporary",
    "WizFlo": "Contemporary", "e.ssential" : "Contemporary",

    // --- TRANSITIONAL GROUP ---
    "Kastello": "Transitional", "Milano": "Transitional", "Concept Nuovo": "Transitional",
    "Compact Codie": "Transitional", "Cadet": "Transitional", "Winston": "Transitional",

    // --- CLASSIC GROUP ---
    "Studio": "Classic",

    // --- BLANK GROUP (SHOULD HAVE NO STYLE / OTHERS) ---
    "AS Basic": "", "Activa": "", "Active": "", "Americana": "", "Ceros": "",
    "Codie": "", "Fecility": "", "Halo": "", "Heritage": "", "IDS": "",
    "La Moda": "", "La Vita": "", "Luxus": "", "Mizu": "", "Moddino": "",
    "New Codie": "", "New Codie II": "", "Nobile": "", "Ova": "", "Paramount": "",
    "Pristine": "", "Saga": "", "Seva": "", "Sibia": "", "Simplica": "",
    "Smart": "", "Spectra": "", "Tonic": "", "Vallo": "", "Victoria": ""
};

// ==========================================
// 2. TRANSLATION MAP (ENG -> ID-EN)
// ==========================================
const styleTranslationMap: Record<string, string> = {
    "Contemporary": "Contemporary",
    "Transitional": "Transitional",
    "Classic": "Classic",
    "Others": "Others" 
};

// ==========================================
// 3. TARGET URL LIST (DIRECT NAVIGATION STAGING ID-EN)
// ==========================================
const targetPages = [
    { name: 'Commercial', url: 'https://id.47.130.209.149.nip.io/bathrooms/commercial/' },
    { name: 'Bathtubs', url: 'https://id.47.130.209.149.nip.io/bathrooms/bathtubs/' },
    { name: 'Bath Showers', url: 'https://id.47.130.209.149.nip.io/bathrooms/bath-showers/' },
    { name: 'Basin Faucets', url: 'https://id.47.130.209.149.nip.io/bathrooms/basin-faucets/' },
    { name: 'Spalets', url: 'https://id.47.130.209.149.nip.io/bathrooms/spalets/' },
    { name: 'Toilets', url: 'https://id.47.130.209.149.nip.io/bathrooms/toilets/' },
    { name: 'Accessories', url: 'https://id.47.130.209.149.nip.io/bathrooms/accessories/' },
    { name: 'Vanities', url: 'https://id.47.130.209.149.nip.io/bathrooms/vanities/' },
    { name: 'Wash Basins', url: 'https://id.47.130.209.149.nip.io/bathrooms/wash-basins/' }
];

// ==========================================
// 4. HELPER FUNCTION: AGGRESSIVE COOKIE DISMISSAL
// ==========================================
async function dismissCookies(page: Page) {
    // Includes Indonesian and English keywords just in case
    const cookieButton = page.getByRole('button', { name: /Accept|Got it|Agree|Allow|Setuju|Mengerti|Terima|Izinkan/i }).first();
    try {
        // Set timeout short (1s) so it doesn't waste time inside the loop if the banner isn't there
        await cookieButton.waitFor({ state: 'visible', timeout: 1000 });
        await cookieButton.click();
    } catch (e) {
        // Silently ignore if the cookie banner does not appear
    }
}

// ==========================================
// 5. TEST SUITE (DIRECT URL UI READER)
// ==========================================
test.describe('PLP Filter Dependencies - Direct URL (Indonesia id-en Staging)', () => {

    // Extend timeout to 2 minutes to handle lengthy loops without crashing
    test.setTimeout(120000);
    // Crucial for Staging environments that might have invalid SSL certificates
    test.use({ ignoreHTTPSErrors: true });

    for (const target of targetPages) {
        
        test(`Validate dynamically available Styles for: ${target.name}`, async ({ page }, testInfo) => {
            
            // Attach target URL to the Playwright HTML Report
            testInfo.annotations.push({ type: 'Target URL', description: target.url });
            
            // ------------------------------------------
            // PRE-CONDITION: DIRECT NAVIGATION
            // ------------------------------------------
            await test.step(`Maps directly to ${target.name} and clear cookies`, async () => {
                await page.goto(target.url, { waitUntil: 'domcontentloaded' });
                await dismissCookies(page);
            });

            // ------------------------------------------
            // UI DETECTION: Check for Style & Collections filters
            // ------------------------------------------
            const styleWrapper = page.locator('.wrapper').filter({ has: page.locator('h3', { hasText: /Style/i }) });
            const collectionsWrapper = page.locator('.wrapper').filter({ has: page.locator('h3', { hasText: /Collections/i }) });

            // Skip the test gracefully if the page lacks required filter blocks
            if (await styleWrapper.count() === 0 || await collectionsWrapper.count() === 0) {
                test.skip(true, `Category "${target.name}" does not have Style/Collections filters.\nURL: ${target.url}`);
                return;
            }

            const styleLabels = styleWrapper.locator('label.level-3-option');
            const styleCount = await styleLabels.count();

            // ------------------------------------------
            // DYNAMIC UI LOOPING
            // ------------------------------------------
            for (let i = 0; i < styleCount; i++) {
                
                const currentStyleLabel = styleLabels.nth(i);

                // Bypass hidden/invisible elements in the DOM
                const isVisible = await currentStyleLabel.isVisible();
                if (!isVisible) {
                    continue; 
                }

                const styleNameRaw = await currentStyleLabel.locator('.level-3-category').textContent();
                let styleNameUI = styleNameRaw?.trim() || '';

                if (!styleNameUI) continue;

                // Normalize "Other" or "Others" variations
                const normalizedUI = styleNameUI.toLowerCase();
                if (normalizedUI === 'other' || normalizedUI === 'others') {
                    styleNameUI = 'Others';
                }

                await test.step(`Check Collections for available Style: "${styleNameUI}"`, async () => {
                    
                    // 1. CLICK STYLE
                    await dismissCookies(page); // Clear spammy staging cookies
                    await currentStyleLabel.click();
                    // Give the UI 3.5 seconds to finish its loading/filtering animation
                    await page.waitForTimeout(3500); 

                    // 2. CAPTURE ACTIVE URL (For debugging purposes)
                    const currentUrl = page.url();

                    // 3. READ RENDERED COLLECTIONS
                    const visibleCollectionElements = collectionsWrapper.locator('label.level-3-option:visible .level-3-category');
                    const actualCollectionsRaw = await visibleCollectionElements.allTextContents();
                    const actualCollections = actualCollectionsRaw.map(text => text.trim());

                    // 4. VALIDATE AGAINST DICTIONARY (Using Soft Assertions)
                    for (const visibleCollection of actualCollections) {
                        
                        let expectedStyleEn = collectionToStyleMap[visibleCollection];

                        if (expectedStyleEn === "") {
                            expectedStyleEn = "Others";
                        }

                        // Assertion 1: Ensure collection exists in QA Master Data
                        expect.soft(
                            expectedStyleEn, 
                            `[Data Missing] Collection "${visibleCollection}" is missing from the QA master dictionary! \n🔗 Error URL: ${currentUrl}`
                        ).toBeDefined();

                        const expectedStyleUI = styleTranslationMap[expectedStyleEn];

                        // Assertion 2: Ensure collection belongs to the currently clicked Style
                        expect.soft(
                            expectedStyleUI,
                            `[Bug Mismatch!] Collection "${visibleCollection}" (expected: ${expectedStyleUI}) incorrectly appeared under the "${styleNameUI}" filter! \n🔗 Error URL: ${currentUrl}`
                        ).toBe(styleNameUI);
                    }

                    // 5. UN-CLICK STYLE (Reset filter state for the next loop iteration)
                    await dismissCookies(page); // Clear spammy staging cookies again
                    await currentStyleLabel.click();
                    // Give the UI 3.5 seconds to reset before clicking the next filter
                    await page.waitForTimeout(3500); 
                });
            }
        });
    }
});