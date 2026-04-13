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
// 2. TRANSLATION MAP (ENG -> TH-TH)
// ==========================================
// ✅ UPDATED: Sesuai dengan kamus lokalisasi Thailand dari Dev
const styleTranslationMap: Record<string, string> = {
    "Contemporary": "คอลเล็คชั่นห้องน้ำแบบร่วมสมัย",
    "Transitional": "คอลเล็คชั่นห้องน้ำแบบผสมผสานความดั้งเดิมและร่วมสมัย",
    "Classic": "คอลเล็คชั่นห้องน้ำแบบคลาสสิก",
    "Others": "Others" // Biarkan "Others" kecuali ada terjemahan resminya (misal "อื่นๆ")
};

// ==========================================
// 3. TARGET URL LIST (DIRECT NAVIGATION STAGING TH-TH)
// ==========================================
const targetPages = [
    { name: 'Commercial', url: 'https://www.americanstandard.co.th/th/bathrooms/commercial' },
    { name: 'Bathtubs', url: 'https://www.americanstandard.co.th/th/bathrooms/bathtubs' },
    { name: 'Bath & Showers', url: 'https://www.americanstandard.co.th/th/bathrooms/bath-and-showers' },
    { name: 'Basin Faucets', url: 'https://www.americanstandard.co.th/th/bathrooms/basin-faucets' },
    { name: 'Spalets', url: 'https://www.americanstandard.co.th/th/bathrooms/spalets' },
    { name: 'Toilets', url: 'https://www.americanstandard.co.th/th/bathrooms/toilets' },
    { name: 'Accessories', url: 'https://www.americanstandard.co.th/th/bathrooms/accessories' },
    { name: 'Vanities', url: 'https://www.americanstandard.co.th/th/bathrooms/vanities' },
    { name: 'Wash Basins', url: 'https://www.americanstandard.co.th/th/bathrooms/wash-basins' }
];

// ==========================================
// 4. HELPER FUNCTION: AGGRESSIVE COOKIE DISMISSAL (STAGING)
// ==========================================
async function dismissCookies(page: Page) {
    const cookieButton = page.getByRole('button', { name: /Accept|Got it|Agree|Allow|ยอมรับ/i }).first();
    try {
        await cookieButton.waitFor({ state: 'visible', timeout: 1000 });
        await cookieButton.click();
    } catch (e) {
        // Silently ignore if the cookie banner does not appear
    }
}

// ==========================================
// 5. TEST SUITE (DIRECT URL UI READER)
// ==========================================
test.describe('PLP Filter Dependencies - Direct URL (Thailand th-th Staging)', () => {

    test.setTimeout(120000);
    // Crucial for Staging environments that might have invalid SSL certificates
    test.use({ ignoreHTTPSErrors: true });

    for (const target of targetPages) {
        
        test(`Validate dynamically available Styles for: ${target.name}`, async ({ page }, testInfo) => {
            
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
            const styleWrapper = page.locator('.wrapper').filter({ has: page.locator('h3', { hasText: /Style|สไตล์/i }) });
            const collectionsWrapper = page.locator('.wrapper').filter({ has: page.locator('h3', { hasText: /Collections|คอลเลกชัน/i }) });

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

                const isVisible = await currentStyleLabel.isVisible();
                if (!isVisible) {
                    continue; 
                }

                const styleNameRaw = await currentStyleLabel.locator('.level-3-category').textContent();
                let styleNameUI = styleNameRaw?.trim() || '';

                if (!styleNameUI) continue;

                const normalizedUI = styleNameUI.toLowerCase();
                if (normalizedUI === 'other' || normalizedUI === 'others' || normalizedUI === 'อื่นๆ') {
                    styleNameUI = 'Others';
                }

                await test.step(`Check Collections for available Style: "${styleNameUI}"`, async () => {
                    
                    // 1. CLICK STYLE
                    await dismissCookies(page);
                    await currentStyleLabel.click();
                    await page.waitForTimeout(3500); 

                    // 2. CAPTURE ACTIVE URL
                    const currentUrl = page.url();

                    // 3. READ RENDERED COLLECTIONS
                    const visibleCollectionElements = collectionsWrapper.locator('label.level-3-option:visible .level-3-category');
                    const actualCollectionsRaw = await visibleCollectionElements.allTextContents();
                    const actualCollections = actualCollectionsRaw.map(text => text.trim());

                    // 4. VALIDATE AGAINST DICTIONARY
                    for (const visibleCollection of actualCollections) {
                        
                        let expectedStyleEn = collectionToStyleMap[visibleCollection];

                        if (expectedStyleEn === "") {
                            expectedStyleEn = "Others";
                        }

                        expect.soft(
                            expectedStyleEn, 
                            `[Data Missing] Collection "${visibleCollection}" is missing from the QA master dictionary! \n🔗 Error URL: ${currentUrl}`
                        ).toBeDefined();

                        const expectedStyleUI = styleTranslationMap[expectedStyleEn];

                        expect.soft(
                            expectedStyleUI,
                            `[Bug Mismatch!] Collection "${visibleCollection}" (expected: ${expectedStyleUI}) incorrectly appeared under the "${styleNameUI}" filter! \n🔗 Error URL: ${currentUrl}`
                        ).toBe(styleNameUI);
                    }

                    // 5. UN-CLICK STYLE
                    await dismissCookies(page);
                    await currentStyleLabel.click();
                    await page.waitForTimeout(3500); 
                });
            }
        });
    }
});