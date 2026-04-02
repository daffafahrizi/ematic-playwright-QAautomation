import { defineConfig } from '@playwright/test';

export default defineConfig({
  // Otomatis bikin report HTML setiap selesai jalan
  reporter: 'html',

  use: {
    // 🎥 SETTINGAN VIDEO: 'on' (selalu rekam), 'off' (mati), 'retain-on-failure' (rekam saat error aja)
    //video: 'on', 

    // 📸 SETTINGAN SCREENSHOT: Otomatis jepret layar kalau ada yang fail
    screenshot: 'only-on-failure',

    // 🕵️ SETTINGAN TRACE: Merekam log network, klik, dan DOM buat bahan debugging
    trace: 'retain-on-failure',
  },
});