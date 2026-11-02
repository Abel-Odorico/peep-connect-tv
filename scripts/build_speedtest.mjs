import {build} from 'esbuild';
import {copyFile} from 'node:fs/promises';
await build({stdin:{contents:"import SpeedTest from '@cloudflare/speedtest';window.PeepSpeedEngine=SpeedTest;",resolveDir:process.cwd()},bundle:true,minify:true,format:'iife',target:'chrome100',outfile:'dist/vendor/cloudflare-speedtest-1.15.0.js'});
await copyFile('node_modules/@cloudflare/speedtest/LICENSE','dist/vendor/cloudflare-speedtest-LICENSE.txt');
