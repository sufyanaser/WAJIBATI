import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

console.log('Building single-file bundle via Vite...')
execSync('npx vite build --config vite.config.singlefile.ts', { stdio: 'inherit' })

const singleHtmlPath = path.join(process.cwd(), 'dist-single', 'index.html')
let html = fs.readFileSync(singleHtmlPath, 'utf8')

// Read public icons
const icon192Path = path.join(process.cwd(), 'public', 'icon-192.png')
const icon512Path = path.join(process.cwd(), 'public', 'icon-512.png')

let icon192Base64 = ''
let icon512Base64 = ''

if (fs.existsSync(icon192Path)) {
  icon192Base64 = `data:image/png;base64,${fs.readFileSync(icon192Path).toString('base64')}`
}
if (fs.existsSync(icon512Path)) {
  icon512Base64 = `data:image/png;base64,${fs.readFileSync(icon512Path).toString('base64')}`
}

// Inline icons into HTML & scripts
if (icon192Base64) {
  html = html.replaceAll('./icon-192.png', icon192Base64)
  html = html.replaceAll('/icon-192.png', icon192Base64)
  html = html.replaceAll('./apple-touch-icon.png', icon192Base64)
  html = html.replaceAll('/apple-touch-icon.png', icon192Base64)
}
if (icon512Base64) {
  html = html.replaceAll('./icon-512.png', icon512Base64)
  html = html.replaceAll('/icon-512.png', icon512Base64)
}

// Destination outputs
const rootExportPath = path.join(process.cwd(), 'wajibati.html')
const distExportPath = path.join(process.cwd(), 'dist', 'wajibati-standalone.html')
const artifactDir = 'C:/Users/sufya/.gemini/antigravity/brain/d8acfcd7-ad51-439c-839a-47e07e87fcd1'
const artifactExportPath = path.join(artifactDir, 'wajibati-standalone.html')

fs.writeFileSync(rootExportPath, html, 'utf8')
fs.writeFileSync(distExportPath, html, 'utf8')
fs.writeFileSync(artifactExportPath, html, 'utf8')

const sizeKb = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(2)
console.log(`\nSUCCESS: Exported complete single-file HTML (${sizeKb} KB):`)
console.log(`  - Root: ${rootExportPath}`)
console.log(`  - Dist: ${distExportPath}`)
console.log(`  - Artifact: ${artifactExportPath}`)
