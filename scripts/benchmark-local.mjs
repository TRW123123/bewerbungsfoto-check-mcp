// Run against the offline Wrangler server. Fixture generation is outside timings.
import jpeg from 'jpeg-js';
import { writeFileSync } from 'node:fs';
const rows = [];
for (const [width,height] of [[1500,2000],[3000,4000]]) {
 const data = new Uint8Array(width*height*4);
 for(let y=0;y<height;y++) for(let x=0;x<width;x++) {
 const i=(y*width+x)*4, v=x>width*.25&&x<width*.75&&y>height*.2&&y<height*.9?(Math.floor(x/5)%2?210:40):145;
 data[i]=data[i+1]=data[i+2]=v; data[i+3]=255;
 }
 const bytes=jpeg.encode({width,height,data},85).data;
 const body=JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/call',params:{name:'check_headshot_photo',arguments:{image_base64:Buffer.from(bytes).toString('base64')}}});
 const times=[];
 for(let n=0;n<4;n++) {
 const start=performance.now();
 const response=await fetch('http://127.0.0.1:8787/mcp',{method:'POST',headers:{'content-type':'application/json'},body});
 const r=await response.json(); times.push(performance.now()-start);
 if(r.result?.structuredContent?.analysis_mode!=='images-binding') throw Error(JSON.stringify(r));
 if(n===0) writeFileSync(`docs/smoke-${width}.json`,JSON.stringify(r,null,2)+'\n');
 }
 rows.push({width,height,bytes:bytes.length,cold_wall_ms:times[0],warm_wall_ms:times.slice(1),worker_cpu_ms:'unknown; HTTP wall time includes offline resize and transport'});
}
writeFileSync('docs/benchmark-local.json',JSON.stringify(rows,null,2)+'\n');
console.log(JSON.stringify(rows,null,2));
