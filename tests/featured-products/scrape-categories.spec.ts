import { test, Page } from '@playwright/test';
import * as fs from 'fs';

// Complete list of 13 Regional URLs (using Homepages to access the Mega Menu)
const regions = [
    { code: 'AU', baseUrl: 'https://www.americanstandard.com.au/' },
    { code: 'ID', baseUrl: 'https://www.americanstandard.co.id/' },
    { code: 'ID-ID', baseUrl: 'https://www.americanstandard.co.id/id/' },
    { code: 'MY', baseUrl: 'https://www.americanstandard.com.my/' },
    { code: 'MM', baseUrl: 'https://www.americanstandard.com.mm/' },
    { code: 'MM-MY', baseUrl: 'https://www.americanstandard.com.mm/my/' },
    { code: 'NZ', baseUrl: 'https://www.americanstandard.co.nz/' },
    { code: 'PH', baseUrl: 'https://www.americanstandard.ph/' },
    { code: 'SG', baseUrl: 'https://www.americanstandard.com.sg/' },
    { code: 'TH', baseUrl: 'https://www.americanstandard.co.th/' },
    { code: 'TH-TH', baseUrl: 'https://www.americanstandard.co.th/th/' },
    { code: 'VN', baseUrl: 'https://www.americanstandard.com.vn/' },
    { code: 'VN-VI', baseUrl: 'https://www.americanstandard.com.vn/vi/' }
];

// Helper function to dismiss cookie banners across different languages
async function dismissCookies(page: Page) {
    // Includes Indonesian and English keywords just in case
    const cookieButton = page.getByRole('button', { name: /Accept|Got it|Agree|Allow|Setuju|Mengerti|Terima|Izinkan/i }).first();
    try {
        // Set timeout short (1s) so it doesn't waste time inside the loop if the banner isn't there
        await cookieButton.waitFor({ state: 'visible', timeout: 1000 });
        await cookieButton.click();
        console.log('🍪 Cookie banner dismissed!');
    } catch (e) {
        // Silently ignore if the cookie banner does not appear
    }
}

test('Scrape all category names and URLs per region', async ({ page }) => {
    // Set timeout to 5 minutes to accommodate loading 13 different websites
    test.setTimeout(300000); 

    // Object to store the final scraped data
    const scrapedData: { [key: string]: { category_name: string, url: string }[] } = {};

    for (const region of regions) {
        console.log(`\n🔍 Scraping category links from navbar in region: ${region.code}...`);
        
        try {
            // Navigate to the region's homepage
            await page.goto(region.baseUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

            // Call the helper function to handle cookies
            await dismissCookies(page);

            // --- BUKA MEGA MENU BATHROOMS ---
            try {
                // Mencari span dengan class e-n-menu-title-text yang mengandung kata "Bathrooms"
                // Catatan: Jika region bahasa lokal (TH, VN, ID) menggunakan bahasa mereka, 
                // kamu bisa tambahkan kata kuncinya di regex ini (misal: /Bathrooms|Kamar Mandi/i)
                const bathroomsMenu = page.locator('span.e-n-menu-title-text').filter({ hasText: /Bathrooms/i }).first();
                
                await bathroomsMenu.waitFor({ state: 'visible', timeout: 5000 });
                await bathroomsMenu.click();
                console.log('🖱️ Menu "Bathrooms" diklik!');
                
                // Tunggu 1 detik agar animasi Mega Menu selesai terbuka dan DOM ter-render
                await page.waitForTimeout(1000); 
            } catch (e) {
                console.log(`⚠️ Peringatan: Tidak bisa klik menu Bathrooms di ${region.code}. Mencoba lanjut...`);
            }
            // --- END BUKA MEGA MENU ---

            // Wait for the Elementor heading links inside the Mega Menu to appear in the DOM
            const selector = 'h2.elementor-heading-title a';
            await page.waitForSelector(selector, { timeout: 15000 });

            // Extract data from the DOM
            const categories = await page.$$eval(selector, (elements, base) => {
                return elements.map(el => {
                    const anchor = el as HTMLAnchorElement;
                    const name = anchor.innerText.trim();
                    const href = anchor.getAttribute('href') || '';
                    
                    // Convert relative URLs (e.g., /bathroom/...) to absolute URLs
                    const fullUrl = new URL(href, base).href;
                    
                    return {
                        category_name: name,
                        url: fullUrl
                    };
                })
                // CRITICAL FILTER:
                // Only keep elements with text AND URLs containing the word "category".
                // This prevents us from accidentally scraping random homepage banner links.
                .filter(cat => cat.category_name !== '' && cat.url.includes('category')); 
                
            }, region.baseUrl);

            // Remove duplicate URLs (Mega Menus often render twice in the DOM for Mobile vs Desktop views)
            const uniqueCategories = Array.from(new Map(categories.map(item => [item.url, item])).values());

            scrapedData[region.code] = uniqueCategories;
            console.log(`✅ Success: Found ${uniqueCategories.length} categories for ${region.code}`);

        } catch (error) {
            console.error(`❌ Failed for ${region.code}:`, (error as Error).message);
            scrapedData[region.code] = []; // Save an empty array to maintain the JSON structure
        }
    }

    // Save the final results to a JSON file
    const outputFilename = 'american_standard_categories.json';
    fs.writeFileSync(outputFilename, JSON.stringify(scrapedData, null, 4), 'utf-8');
    
    console.log(`\n🎉 Scraping complete! Data saved to ${outputFilename}`);
});