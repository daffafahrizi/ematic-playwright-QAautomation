import { test } from '@playwright/test';
import * as fs from 'fs';

// Complete list of 13 Regional URLs
const regions = [
    { code: 'AU', baseUrl: 'https://www.americanstandard.com.au/bathroom-collections/' },
    { code: 'ID', baseUrl: 'https://www.americanstandard.co.id/bathroom-collections/' },
    { code: 'ID-ID', baseUrl: 'https://www.americanstandard.co.id/id/bathroom-collections/' },
    { code: 'MY', baseUrl: 'https://www.americanstandard.com.my/bathroom-collections/' },
    { code: 'MM', baseUrl: 'https://www.americanstandard.com.mm/bathroom-collections/' },
    { code: 'MM-MY', baseUrl: 'https://www.americanstandard.com.mm/my/bathroom-collections/' },
    { code: 'NZ', baseUrl: 'https://www.americanstandard.co.nz/bathroom-collections/' },
    { code: 'PH', baseUrl: 'https://www.americanstandard.ph/bathroom-collections/' },
    { code: 'SG', baseUrl: 'https://www.americanstandard.com.sg/bathroom-collections/' },
    { code: 'TH', baseUrl: 'https://www.americanstandard.co.th/bathroom-collections/' },
    { code: 'TH-TH', baseUrl: 'https://www.americanstandard.co.th/th/bathroom-collections/' },
    { code: 'VN', baseUrl: 'https://www.americanstandard.com.vn/bathroom-collections/' },
    { code: 'VN-VI', baseUrl: 'https://www.americanstandard.com.vn/vi/bathroom-collections/' }
];

test('Scrape all collection names and URLs per region', async ({ page }) => {
    test.setTimeout(300000); // 5 minutes timeout for all 13 regions

    // Object to store the final mapping
    const finalResults: Record<string, { name: string, url: string }[]> = {};

    for (const region of regions) {
        console.log(`\n🔍 Scrapping collections and URLs in ${region.code}...`);

        try {
            await page.goto(region.baseUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });

            // Dismiss cookie banner if it exists
            const cookieAcceptButton = page.locator('#onetrust-accept-btn-handler');
            if (await cookieAcceptButton.count() > 0) {
                try { await cookieAcceptButton.click({ timeout: 3000 }); } catch (e) { }
            }

            // Find all links containing '-collection'
            const allLinks = await page.locator('a[href*="-collection"]').elementHandles();
            const hostOrigin = new URL(region.baseUrl).origin;

            // Temporary storage for this region to avoid duplicates
            const collectionMap = new Map<string, string>();

            for (const link of allLinks) {
                const href = await link.getAttribute('href');

                if (href && href.includes('/bathroom-collections/')) {
                    // Convert relative URLs to absolute
                    const absoluteUrl = href.startsWith('http') ? href : `${hostOrigin}${href}`;

                    // Extract name from the URL slug
                    const urlParts = href.split('/').filter(p => p.length > 0);
                    const slug = urlParts[urlParts.length - 1];

                    if (slug && slug.includes('-collection')) {
                        const cleanName = slug.replace('-collection', '').replace(/-/g, ' ');

                        // Filter out generic landing pages
                        const ignoredKeywords = ['bathroom', 'contemporary', 'classic', 'transitional', 'modern', 'colors'];
                        const isIgnored = ignoredKeywords.some(keyword => cleanName.includes(keyword));

                        if (!isIgnored) {
                            // Use Map to ensure we only have one entry per collection name
                            collectionMap.set(cleanName, absoluteUrl);
                        }
                    }
                }
            }

            // Convert Map to an array of objects and sort by name
            const collectionsArray = Array.from(collectionMap.entries())
                .map(([name, url]) => ({ name, url }))
                .sort((a, b) => a.name.localeCompare(b.name));

            finalResults[region.code] = collectionsArray;
            console.log(`✅ ${region.code}: Found ${collectionsArray.length} unique collections.`);

        } catch (error) {
            console.log(`❌ Failed to scrape ${region.code}: ${error.message}`);
            finalResults[region.code] = [];
        }
    }

    // Save the result to a JSON file
    const outputFilePath = 'collections-with-urls.json';
    fs.writeFileSync(outputFilePath, JSON.stringify(finalResults, null, 2));

    console.log(`\n🎉 DONE! Full list with URLs saved to: ${outputFilePath}`);
});