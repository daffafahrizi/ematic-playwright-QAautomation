import { test } from '@playwright/test';
import { validateFeaturedProducts } from './helpers/featured-products-helper';

// Configure Playwright to run these tests in parallel (simultaneously)
test.describe.configure({ mode: 'parallel' });

// The complete list of regional URLs
const regions = [
    { code: 'AU', baseUrl: 'https://www.americanstandard.com.au/bathroom-collections/' },
    { code: 'ID', baseUrl: 'https://www.americanstandard.co.id/bathroom-collections/' },
    //{ code: 'ID-ID', baseUrl: 'https://www.americanstandard.co.id/id/bathroom-collections/' },
    { code: 'MY', baseUrl: 'https://www.americanstandard.com.my/bathroom-collections/' },
    { code: 'MM', baseUrl: 'https://www.americanstandard.com.mm/bathroom-collections/' },
    //{ code: 'MM-MY', baseUrl: 'https://www.americanstandard.com.mm/my/bathroom-collections/' },
    { code: 'NZ', baseUrl: 'https://www.americanstandard.co.nz/bathroom-collections/' },
    { code: 'PH', baseUrl: 'https://www.americanstandard.ph/bathroom-collections/' },
    { code: 'SG', baseUrl: 'https://www.americanstandard.com.sg/bathroom-collections/' },
    { code: 'TH', baseUrl: 'https://www.americanstandard.co.th/bathroom-collections/' },
    //{ code: 'TH-TH', baseUrl: 'https://www.americanstandard.co.th/th/bathroom-collections/' },
    { code: 'VN', baseUrl: 'https://www.americanstandard.com.vn/bathroom-collections/' },
    //{ code: 'VN-VI', baseUrl: 'https://www.americanstandard.com.vn/vi/bathroom-collections/' }
];

test.describe('Regional Featured Products Validation', () => {

    for (const region of regions) {

        test(`Validate collections for ${region.code}`, async ({ page }) => {
            // Set a long timeout (4 minutes) because the script will discover and validate multiple pages per region
            test.setTimeout(240000);

            console.log(`🚀 Starting validation for region: ${region.code}`);

            // Call the helper function to execute the discovery and validation logic
            await validateFeaturedProducts(page, region.code, region.baseUrl);

            console.log(`✅ Completed validation for region: ${region.code}`);
        });

    }
});