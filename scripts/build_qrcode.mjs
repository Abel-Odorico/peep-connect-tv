import {build} from 'esbuild';
import {readFile,writeFile} from 'node:fs/promises';
await build({stdin:{contents:"import QR from 'qrcode';window.PeepQR={svg:url=>QR.toString(url,{type:'svg',margin:4,errorCorrectionLevel:'M'})};",resolveDir:process.cwd()},bundle:true,minify:true,format:'iife',platform:'browser',target:'chrome100',outfile:'dist/vendor/qrcode-1.5.4.js'});
await writeFile('dist/vendor/qrcode-LICENSE.txt',(await readFile('node_modules/qrcode/license','utf8')).trimEnd()+'\n');
