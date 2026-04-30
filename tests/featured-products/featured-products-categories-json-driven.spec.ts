import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

// 1. Load the JSON data scraped previously
const jsonPath = path.resolve(__dirname, '../../american_standard_categories.json');
const rawData = fs.readFileSync(jsonPath, 'utf-8');
const scrapedData: { [key: string]: { category_name: string, url: string }[] } = JSON.parse(rawData);

// =====================================================================
// SELECTOR CONFIGURATION
// Adjust this based on the parent class wrapping the product grid
const FEATURED_SECTION_SELECTOR = '.elementor-widget-loop-grid'; 
// =====================================================================

for (const [region, categories] of Object.entries(scrapedData)) {
    
    test.describe(`Featured Product Validation (By URL/Href) - Region: ${region}`, () => {
        
        // Skip the test block if the region has no categories scraped
        if (categories.length === 0) return;

        for (const category of categories) {
            
            test(`Verify all Featured Product URLs match category: ${category.category_name}`, async ({ page }) => {
                test.setTimeout(60000); // 60 seconds timeout per page

                console.log(`Navigating to: ${category.url}`);
                await page.goto(category.url, { waitUntil: 'domcontentloaded' });

                // Ensure the featured product section is visible on the page
                const featuredSection = page.locator(FEATURED_SECTION_SELECTOR).first();
                await expect(
                    featuredSection, 
                    `Featured Section not found at ${category.url}`
                ).toBeVisible({ timeout: 15000 });

                // Find all <a> tags (product links) inside the featured grid
                const productLinks = featuredSection.locator('a[href]');
                
                // Assert that at least one product is displayed
                const productCount = await productLinks.count();
                expect(
                    productCount, 
                    `No products displayed on category page: ${category.url}`
                ).toBeGreaterThan(0);

                // --- ADVANCED SLUG NORMALIZATION (MULTI-TOLERANCE) ---
                // Base 1: Replacing '&' with 'and' (e.g., bath-and-showers)
                const baseSlugWithAnd = category.category_name
                    .toLowerCase()
                    .replace(/&/g, 'and')          
                    .replace(/[^a-z0-9]+/g, '-')   
                    .replace(/^-+|-+$/g, '');      

                // Base 2: Removing '&' entirely (e.g., bath-showers)
                const baseSlugWithoutAnd = category.category_name
                    .toLowerCase()
                    .replace(/&/g, '')          
                    .replace(/[^a-z0-9]+/g, '-')   
                    .replace(/^-+|-+$/g, '');      

                // Create an array of possible valid slugs, including singular versions if they end with 's'
                const possibleSlugs = [
                    baseSlugWithAnd,
                    baseSlugWithoutAnd,
                    baseSlugWithAnd.endsWith('s') ? baseSlugWithAnd.slice(0, -1) : baseSlugWithAnd,
                    baseSlugWithoutAnd.endsWith('s') ? baseSlugWithoutAnd.slice(0, -1) : baseSlugWithoutAnd
                ];

                // Remove duplicates using a Set
                const uniqueSlugs = [...new Set(possibleSlugs)];

                console.log(`Expected Slugs : [${uniqueSlugs.join(' OR ')}]`);
                console.log(`Checking ${productCount} Products...`);

                // Get an array of all product link locators
                const allProductLinks = await productLinks.all();

                // Loop through EVERY product found in the grid
                for (let i = 0; i < allProductLinks.length; i++) {
                    const productHref = await allProductLinks[i].getAttribute('href') || '';
                    
                    // Check if the product URL contains AT LEAST ONE of our accepted slugs
                    const isMatch = uniqueSlugs.some(slug => productHref.includes(slug));
                    
                    // Using expect.soft so the test doesn't stop if just one product fails
                    // UPDATE: Added the category.url to the error message for easier debugging
                    expect.soft(
                        isMatch, 
                        `[ON PAGE: ${category.url}]\nProduct [${i + 1}] URL (${productHref}) does not match any of the accepted category slugs: [${uniqueSlugs.join(', ')}]`
                    ).toBeTruthy();
                }
            });
        }
    });
}