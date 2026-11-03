// Every sample is one analysis in a fresh process. Fixture encoding is never timed.
import { build } from 'esbuild';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import jpeg from 'jpeg-js';
import { encode } from 'fast-png';
const dir = mkdtempSync(join(tmpdir(), 'photo-cold-'));
try {
 await build({entryPoints:['src/images.ts'], bundle:true, platform:'browser', format:'esm', outfile:join(dir,'images.mjs')});
 writeFileSync(join(dir,'run.mjs'), `import {readFileSync} from 'node:fs';
const cpu=()=>{const c=process.cpuUsage();return c.user+c.system};
let t=cpu();const m=await import('./images.mjs');const import_ms=(cpu()-t)/1000;
const b=new Uint8Array(readFileSync(process.argv[2]));t=cpu();
const r=await m.analyzeAuto(b,'all','auto');
console.log(JSON.stringify({import_ms,analysis_ms:(cpu()-t)/1000,mode:r.analysis_mode}));`);
 const rows=[];
 for(const [width,height] of [[102,128],[128,128],[51,64],[64,64]]) {
 const data=new Uint8Array(width*height*4);
 let seed=12345;
 for(let i=0;i<data.length;i+=4){seed=(Math.imul(seed,1664525)+1013904223)>>>0;data[i]=seed&255;data[i+1]=(seed>>>8)&255;data[i+2]=(seed>>>16)&255;data[i+3]=255;}
 for(const format of ['png','jpeg']) {
 const file=join(dir,'fixture');const fixture=format==='png'?encode({width,height,data,channels:4,depth:8}):jpeg.encode({width,height,data},85).data;writeFileSync(file,fixture);
 for(const flag of ['--jitless','--max-lazy','normal']) {
 const samples=[];
 for(let i=0;i<Number(process.env.SAMPLES??5);i++) {const p=spawnSync(process.execPath,[...(flag==='normal'?[]:[flag]),join(dir,'run.mjs'),file],{encoding:'utf8'});if(p.status)throw Error(p.stderr);samples.push(JSON.parse(p.stdout));}
 rows.push({width,height,format,bytes:fixture.length,flag,samples});
 }
 }
 }
 await build({stdin:{contents:'import jpeg from "jpeg-js"; import * as png from "fast-png"; import * as pako from "pako"; export {jpeg,png,pako};',resolveDir:process.cwd()},bundle:true,platform:'browser',format:'esm',outfile:join(dir,'codecs.mjs')});
 writeFileSync(join(dir,'import.mjs'), `const c=process.cpuUsage();await import('./codecs.mjs');const u=process.cpuUsage(c);console.log((u.user+u.system)/1000);`);
 const codec_imports=[];
 for(const flag of ['--jitless','--max-lazy','normal']) {
 const samples=[];
 for(let i=0;i<Number(process.env.SAMPLES??5);i++) {const p=spawnSync(process.execPath,[...(flag==='normal'?[]:[flag]),join(dir,'import.mjs')],{encoding:'utf8'});if(p.status)throw Error(p.stderr);samples.push(Number(p.stdout));}
 codec_imports.push({flag,import_ms:samples});
 }
 console.log(JSON.stringify({codec_imports,node:process.version,bundle_bytes:readFileSync(join(dir,'images.mjs')).length,rows},null,2));
} finally {rmSync(dir,{recursive:true,force:true});}
