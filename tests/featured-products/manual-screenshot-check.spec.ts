// import { test } from '@playwright/test';
// import * as fs from 'fs';
// import * as path from 'path';

// // Membaca file JSON hasil scraper
// const dataPath = path.join(process.cwd(), 'collections-with-urls.json');
// const rawData = fs.readFileSync(dataPath, 'utf-8');
// const regionsData: Record<string, { name: string, url: string }[]> = JSON.parse(rawData);

// test.describe('Manual Visual Audit - Featured Products', () => {

//     // Daftar koleksi yang ingin di-skip (opsional, kosongkan jika ingin semua)
//     const collectionsToSkip = ['wizflo', 'colors'];

//     for (const [regionCode, collections] of Object.entries(regionsData)) {
//         if (collections.length === 0) continue;

//         test(`Capture screenshots for ${regionCode}`, async ({ page }) => {
//             // Timeout lama karena akan mengambil banyak gambar
//             test.setTimeout(600000);

//             console.log(`📸 Starting manual capture for region: ${regionCode}`);

//             for (const collection of collections) {
//                 const normalizedName = collection.name.toLowerCase();

//                 if (collectionsToSkip.includes(normalizedName)) {
//                     console.log(`⏭️  Skipping '${collection.name}'`);
//                     continue;
//                 }

//                 await test.step(`Capturing: ${collection.name}`, async () => {
//                     // 1. Buka URL
//                     try {
//                         await page.goto(collection.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
//                     } catch (e) {
//                         console.log(`⚠️  Timeout loading ${collection.url}, trying to capture anyway...`);
//                     }

//                     // 2. Tangani Cookie (Biar tidak menutupi gambar)
//                     try {
//                         let cookieBtn = page.locator('#onetrust-accept-btn-handler');
//                         if (await cookieBtn.count() === 0) {
//                             cookieBtn = page.locator('button').filter({
//                                 hasText: /(Accept All|Accept Cookies|Setuju|Đồng ý|Chấp nhận|ยอมรับ)/i
//                             }).first();
//                         }
//                         if (await cookieBtn.isVisible({ timeout: 3000 })) {
//                             await cookieBtn.click();
//                             await page.waitForTimeout(500);
//                         }
//                     } catch (e) { }

//                     // 3. Cari Section Featured Products
//                     const loopContainer = page.locator('.elementor-loop-container').first();

//                     if (await loopContainer.count() > 0) {
//                         // Scroll ke tengah section agar terlihat jelas
//                         await loopContainer.scrollIntoViewIfNeeded();
//                         // Tunggu loading gambar Elementor
//                         await page.waitForTimeout(2000);

//                         // 4. Ambil Screenshot dengan nama yang rapi
//                         // Format Nama: Region_Nama-Koleksi.png (Contoh: AU_signature.png)
//                         const safeFileName = collection.name.replace(/\s+/g, '-');
//                         const screenshotPath = `test-results/manual-audit/${regionCode}_${safeFileName}.png`;

//                         await page.screenshot({
//                             path: screenshotPath,
//                             fullPage: false // Hanya ambil bagian viewport yang sedang aktif
//                         });

//                         console.log(`✅ Captured: ${screenshotPath}`);
//                     } else {
//                         console.log(`❌ No section found for: ${collection.name}`);
//                     }
//                 });
//             }
//         });
//     }
// });