import { expect, it, vi } from 'vitest';
import { deflate } from 'pako';
import { nativePng } from '../src/native-png';
import { analyzeImage } from '../src/images';
import { pixelCriteria } from '../src/scoring';
import { png, pixels } from './fixtures';

function chunk(type: string, data: Uint8Array) {
  const bytes = new Uint8Array(data.length + 12), v = new DataView(bytes.buffer);
  v.setUint32(0, data.length); bytes.set(Buffer.from(type), 4); bytes.set(data, 8);
  let crc = 0xffffffff;
  for (let i = 4; i < bytes.length - 4; i++) {
    crc ^= bytes[i];
    for (let k = 0; k < 8; k++) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  v.setUint32(bytes.length - 4, (crc ^ 0xffffffff) >>> 0);
  return bytes;
}
function fixture(filter: number, channels = 4, extra = 0) {
  const w = 7, h = 9, source = new Uint8Array(w * h * channels);
  for (let i = 0; i < source.length; i++) source[i] = (i * 71 + (i >> 3)) & 255;
  const raw = new Uint8Array((w * channels + 1) * h + extra);
  let o = 0;
  for (let y = 0; y < h; y++) {
    raw[o++] = filter;
    for (let x = 0; x < w * channels; x++) {
      const i = y * w * channels + x;
      const a = x >= channels ? source[i - channels] : 0;
      const b = y ? source[i - w * channels] : 0;
      const c = y && x >= channels ? source[i - w * channels - channels] : 0;
      const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
      const pred = filter === 1 ? a : filter === 2 ? b : filter === 3 ? (a + b) >> 1 : filter === 4 ? pa <= pb && pa <= pc ? a : pb <= pc ? b : c : 0;
      raw[o++] = source[i] - pred;
    }
  }
  const header = new Uint8Array(13), v = new DataView(header.buffer);
  v.setUint32(0, w); v.setUint32(4, h); header[8] = 8; header[9] = channels === 4 ? 6 : 2;
  const bytes = Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflate(raw)),chunk('IEND',new Uint8Array())]);
  const rgba = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    rgba[i*4] = source[i*channels]; rgba[i*4+1] = source[i*channels+1]; rgba[i*4+2] = source[i*channels+2];
    rgba[i*4+3] = channels === 4 ? source[i*channels+3] : 255;
  }
  return { bytes, rgba, w, h };
}
it.each([0,1,2,3,4])('reconstructs PNG filter %s exactly for RGB and RGBA', async filter => {
  for (const channels of [3,4]) {
    const f = fixture(filter, channels);
    expect(await nativePng(f.bytes, f.w, f.h)).toEqual(f.rgba);
  }
});
it('rejects CRC corruption, invalid filters, truncated streams and excess inflated data', async () => {
  const f = fixture(0), corrupt = new Uint8Array(f.bytes); corrupt[45] ^= 1;
  await expect(nativePng(corrupt, f.w, f.h)).rejects.toThrow('CRC');
  await expect(nativePng(f.bytes.subarray(0, f.bytes.length - 12), f.w, f.h)).rejects.toThrow('Incomplete');
  const badFilter = fixture(5);
  await expect(nativePng(badFilter.bytes, f.w, f.h)).rejects.toThrow('filter');
  const bomb = fixture(0, 4, 100000);
  await expect(nativePng(bomb.bytes, f.w, f.h)).rejects.toThrow('safety limit');
});
it('retains PNG fallback when native streams are unavailable', async () => {
  vi.stubGlobal('DecompressionStream', undefined);
  try { expect((await analyzeImage(png('dark', 32, 32), 'all')).criteria[3].status).toBe('fail'); }
  finally { vi.unstubAllGlobals(); }
});
it.each(['good','dark','blurry','low-contrast','busy'])('preserves all metric statuses for a native 64 px %s grid', async kind => {
  const p = pixels(51, 64, kind);
  const actual = await analyzeImage(png(kind, 51, 64), 'all');
  expect(actual.criteria.slice(3,8)).toEqual(pixelCriteria(p.data, p.width, p.height));
});
