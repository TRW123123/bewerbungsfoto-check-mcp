// Fast path for non-interlaced 8-bit RGB/RGBA PNG (Images output).
// Other PNG layouts use the existing decoder. Never interpret ancillary metadata.
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c >>> 0;
}
export async function nativePng(bytes: Uint8Array, width: number, height: number): Promise<Uint8Array | undefined> {
  if (typeof DecompressionStream === 'undefined' || bytes[24] !== 8 ||
      (bytes[25] !== 2 && bytes[25] !== 6) || bytes[26] || bytes[27] || bytes[28]) return;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const parts: Uint8Array[] = [];
  let end = false, hasData = false, afterData = false;
  for (let p = 8; p + 12 <= bytes.length;) {
    const length = view.getUint32(p), type = view.getUint32(p + 4);
    if (length > bytes.length - p - 12) throw new Error('Truncated PNG chunk.');
    let crc = 0xffffffff;
    for (let i = p + 4; i < p + 8 + length; i++) crc = crcTable[(crc ^ bytes[i]) & 255] ^ (crc >>> 8);
    if ((crc ^ 0xffffffff) >>> 0 !== view.getUint32(p + 8 + length)) throw new Error('Invalid PNG CRC.');
    if (type === 0x49484452 && (p !== 8 || length !== 13)) throw new Error('Invalid PNG header.');
    if (type === 0x74524e53) return; // tRNS semantics handled by fallback
    if (type === 0x49444154) {
      if (afterData) throw new Error('Nonconsecutive PNG data.');
      hasData = true; parts.push(bytes.subarray(p + 8, p + 8 + length));
    } else if (hasData) afterData = true;
    if (type === 0x49454e44) { if (length || !hasData) throw new Error('Invalid PNG end.'); end = true; break; }
    if (!(bytes[p + 4] & 32) && type !== 0x49484452 && type !== 0x49444154 && type !== 0x504c5445)
      throw new Error('Unknown critical PNG chunk.');
    p += length + 12;
  }
  if (!end) throw new Error('Incomplete PNG.');
  const channels = bytes[25] === 6 ? 4 : 3, stride = width * channels;
  const expected = (stride + 1) * height;
  const raw = new Uint8Array(expected);
  const stream = new ReadableStream<Uint8Array>({start(c) { for (const part of parts) c.enqueue(part); c.close(); }});
  const reader = stream.pipeThrough(new DecompressionStream('deflate')).getReader();
  let count = 0;
  try {
    while (true) {
      const {done, value} = await reader.read(); if (done) break;
      if (count + value.length > expected) throw new Error('PNG decompression safety limit exceeded.');
      raw.set(value, count); count += value.length;
    }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
  if (count !== expected) throw new Error('Incomplete PNG pixels.');
  const pixels = new Uint8Array(stride * height);
  let input = 0, out = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[input++]; if (filter > 4) throw new Error('Invalid PNG filter.');
    if (filter === 0) {
      pixels.set(raw.subarray(input, input + stride), out);
      input += stride; out += stride; continue;
    }
    for (let x = 0; x < stride; x++, out++) {
      const left = x >= channels ? pixels[out - channels] : 0;
      const up = y ? pixels[out - stride] : 0;
      const ul = y && x >= channels ? pixels[out - stride - channels] : 0;
      let predict = 0;
      if (filter === 1) predict = left;
      else if (filter === 2) predict = up;
      else if (filter === 3) predict = (left + up) >>> 1;
      else if (filter === 4) {
        const p = left + up - ul, a = Math.abs(p - left), b = Math.abs(p - up), c = Math.abs(p - ul);
        predict = a <= b && a <= c ? left : b <= c ? up : ul;
      }
      pixels[out] = raw[input++] + predict;
    }
  }
  if (channels === 4) return pixels;
  const rgba = new Uint8Array(width * height * 4);
  for (let i = 0, j = 0; i < pixels.length; i += 3, j += 4) {
    rgba[j] = pixels[i]; rgba[j + 1] = pixels[i + 1]; rgba[j + 2] = pixels[i + 2]; rgba[j + 3] = 255;
  }
  return rgba;
}
