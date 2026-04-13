import { test, expect, Locator } from '@playwright/test';
import fs from 'fs';
import path from 'path';

// ==========================================
// 1. DATA STRUCTURE
// ==========================================
type StoreRecord = {
    title: string;
    address: string;
    city: string;
    country: string;
    postalCode: string;
    latitude: string | number;
    longitude: string | number;
    phone: string;
    url: string;
    action?: string;
};

const TARGET_URL = 'https://www.americanstandard.com.sg/where-to-buy/retailer';
const DATA_PATH = path.join(process.cwd(), 'store_locator_sg.json');

function readStoreData(): StoreRecord[] {
    const raw = fs.readFileSync(DATA_PATH, 'utf-8');
    return JSON.parse(raw) as StoreRecord[];
}

const stores = readStoreData();

// ==========================================
// 2. TEST SUITE
// ==========================================
test.describe('Store Locator SG - Data Driven Validation', () => {

    test.describe.configure({ mode: 'parallel' });

    // Bypass Geolocation to Singapore
    test.use({
        geolocation: { latitude: 1.3521, longitude: 103.8198 },
        permissions: ['geolocation'],
    });

    test.beforeEach(async ({ page }) => {
        await test.step('Pre-condition: Navigate to URL and dismiss blocking pop-ups', async () => {
            await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded' });

            // Dismiss Custom Geolocation Modal
            const geoModalBtn = page.locator('#asl-btn-geolocation');
            try {
                await geoModalBtn.waitFor({ state: 'visible', timeout: 3000 });
                await geoModalBtn.click();
            } catch (e) {
                // Ignore if not present
            }

            // Dismiss Cookies Pop-up
            const cookieButton = page.getByRole('button', { name: /Accept|Got it|Agree/i }).first();
            try {
                await cookieButton.waitFor({ state: 'visible', timeout: 3000 });
                await cookieButton.click();
            } catch (e) {
                // Ignore if not present
            }

            await page.waitForTimeout(1000);
        });
    });

    // ==========================================
    // 3. STORE ITERATION
    // ==========================================
    for (const [index, store] of stores.entries()) {
        if (!store.title) continue;

        const actionValue = (store.action ?? '').trim().toLowerCase();
        const testName = `[${index + 1}] Validate Store: ${store.title}`;

        test(testName, async ({ page }) => {

            let storeCard: Locator;

            // ------------------------------------------
            // STEP 1: SET DISTANCE AND SEARCH FOR STORE
            // ------------------------------------------
            await test.step(`Step 1: Set distance to 5 Km and search for "${store.title}"`, async () => {
                
                const distanceDropdown = page.locator('button.multiselect[data-toggle="adropdown"]');
                
                // 1. Open the distance dropdown
                await distanceDropdown.click();

                // 2. Select the "5 Km" option using the exact HTML structure provided
                // Targeting the specific label inside the multiselect container
                const option5Km = page.locator('ul.multiselect-container label.radio').filter({ hasText: '5 Km' });
                await option5Km.waitFor({ state: 'visible', timeout: 3000 });
                await option5Km.click();

                // 3. VERIFY AND WAIT for the dropdown button to update to "5 Km"
                // This guarantees the UI has processed the selection before we type
                await expect(
                    distanceDropdown, 
                    `[UI Bug] Distance dropdown did not update to '5 Km' after selection`
                ).toHaveAttribute('title', '5 Km');

                // 4. Fill the search box and trigger the search
                const searchInput = page.locator('#auto-complete-search');
                await searchInput.fill(store.title);

                const searchButton = page.locator('button.sl-search-btn');
                await searchButton.click();

                // Wait for search results to load
                await page.waitForTimeout(2000);

                storeCard = page.locator('.sl-addr-sec').filter({ hasText: store.title }).first();
            });

            // ------------------------------------------
            // STEP 2: NEGATIVE TEST (DELETED STORES)
            // ------------------------------------------
            if (actionValue === 'delete') {
                await test.step(`Step 2: Verify deleted store is NOT visible on the UI`, async () => {
                    await expect(
                        storeCard,
                        `[Data Mismatch] Store "${store.title}" is marked as 'Delete' in data, but it is STILL VISIBLE on the website!`
                    ).toBeHidden();
                });
                return;
            }

            // ------------------------------------------
            // STEP 3: POSITIVE TEST - STORE CARD DETAILS
            // ------------------------------------------
            await test.step(`Step 3: Validate store details inside the store card at the bottom section`, async () => {
                await expect(storeCard, `[UI Bug] Store "${store.title}" was NOT FOUND in the search results!`).toBeVisible();

                await expect(
                    storeCard.locator('.sl-items-title'),
                    `[Data Mismatch] Store title in the card does not match the source data.`
                ).toHaveText(store.title);

                if (store.address) {
                    await expect(
                        storeCard.locator('.asl-addr'),
                        `[Data Mismatch] Street address in the card does not match the source data.`
                    ).toContainText(store.address);
                }
                if (store.postalCode) {
                    await expect(
                        storeCard.locator('.asl-addr'),
                        `[Data Mismatch] Postal code in the card does not match the source data.`
                    ).toContainText(store.postalCode);
                }
                if (store.phone) {
                    await expect(
                        storeCard.locator('.asl-info-list'),
                        `[Data Mismatch] Phone number in the card does not match the source data.`
                    ).toContainText(store.phone);
                }
            });

            // ------------------------------------------
            // STEP 4: INTERACTION - GOOGLE MAPS INFO WINDOW
            // ------------------------------------------
            await test.step(`Step 4: Click the store and validate details inside the Maps Info Window`, async () => {
                const storeTitleClickable = storeCard.locator('.sl-items-title');
                await storeTitleClickable.click();

                const infoWindow = page.locator('.infoBox .infoWindow').first();
                await infoWindow.waitFor({ state: 'visible', timeout: 5000 });

                await expect(
                    infoWindow.locator('h3'),
                    `[Data Mismatch] Store title inside the Map Info Window is incorrect.`
                ).toHaveText(store.title);

                if (store.address) {
                    await expect(
                        infoWindow.locator('.sl-tag'),
                        `[Data Mismatch] Address inside the Map Info Window is incorrect.`
                    ).toContainText(store.address);
                }

                if (store.phone) {
                    await expect(
                        infoWindow,
                        `[Data Mismatch] Phone number inside the Map Info Window is missing or incorrect.`
                    ).toContainText(store.phone);
                }

                const directionsBtn = infoWindow.locator('a.action.directions');
                await expect(
                    directionsBtn,
                    `[UI Bug] 'Directions' button is missing from the Map Info Window!`
                ).toBeVisible();

                // Website Button Logic Verification
                const websiteBtn = infoWindow.locator('a.action.a-website');
                if (store.url) {
                    await expect(
                        websiteBtn,
                        `[UI Bug] URL data exists in the source, but the 'Website' button is MISSING in the Info Window.`
                    ).toBeVisible();

                    await expect(
                        websiteBtn,
                        `[Data Mismatch] The 'Website' button link does not match the source URL.`
                    ).toHaveAttribute('href', store.url);
                } else {
                    await expect(
                        websiteBtn,
                        `[UI Bug] URL data is EMPTY in the source, but the 'Website' button is STILL VISIBLE in the Info Window!`
                    ).toBeHidden();
                }
            });

        });
    }
});