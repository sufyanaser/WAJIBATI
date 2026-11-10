import type { CapacitorConfig } from '@capacitor/cli'

const isAndroid = process.env.CAPACITOR_PLATFORM === 'android' || process.argv.includes('android')

const config: CapacitorConfig = {
  appId: isAndroid ? 'iq.wajibati.app' : 'cc.raneen.wajibati',
  appName: 'واجباتي',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'capacitor',
  },
}

export default config
