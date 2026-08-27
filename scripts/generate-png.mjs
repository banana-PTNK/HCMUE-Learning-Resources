import fs from 'fs';
import path from 'path';
import { Resvg } from '@resvg/resvg-js';

const svgPath = path.join(process.cwd(), 'public', 'logo-hcmue.svg');
const pngPath = path.join(process.cwd(), 'public', 'logo-hcmue.png');

const svg = fs.readFileSync(svgPath, 'utf8');

const resvg = new Resvg(svg, {
  fitTo: {
    mode: 'width',
    value: 1200,
  },
  font: {
    loadSystemFonts: true,
  },
});

const pngData = resvg.render();
const pngBuffer = pngData.asPng();

fs.writeFileSync(pngPath, pngBuffer);
console.log('Successfully generated public/logo-hcmue.png (1200x600 px)!');
