import { defineConfig } from '@playwright/test'

const CHROMIUM = '/opt/pw-browsers/chromium'

export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  retries: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'e2e-report', open: 'never' }],
    ['json', { outputFile: 'e2e-report/results.json' }],
  ],
  use: {
    baseURL: 'http://localhost:4173',
    screenshot: 'only-on-failure',
    video: 'off',
    locale: 'ar-IQ',
    browserName: 'chromium',
    launchOptions: {
      executablePath: CHROMIUM,
    },
  },
  webServer: {
    command: 'npm run preview -- --port 4173',
    port: 4173,
    reuseExistingServer: true,
    timeout: 30000,
  },
  projects: [
    {
      name: 'desktop',
      use: { viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'tablet',
      use: { viewport: { width: 768, height: 1024 } },
    },
    {
      name: 'mobile',
      use: {
        viewport: { width: 393, height: 851 },
        isMobile: true,
        userAgent: 'Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.82 Mobile Safari/537.36',
      },
    },
  ],
})
