import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const here = dirname(fileURLToPath(import.meta.url));
const htmlPath = resolve(here, '../scratchpad/town-map.html');
const pngPath = resolve(here, '../scratchpad/town-map.png');

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 2 });
await page.goto('file://' + htmlPath, { waitUntil: 'load' });
// Screenshot only the map SVG, framed with the legend.
await page.screenshot({ path: pngPath, fullPage: true });
await browser.close();
console.log('Wrote', pngPath);
