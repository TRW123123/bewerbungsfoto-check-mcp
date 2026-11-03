import { decode as decodePng, convertIndexedToRgb } from "fast-png";
import { Inflate } from "pako";
import type { Header } from "./images";
// Strip ancillary metadata before decoding (in particular compressed ICC/text chunks).
// Bound decompressed IDAT output before handing it to the decoder to resist PNG bombs.
function safePng(bytes: Uint8Array, h: Header): Uint8Array {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength),
    parts = [bytes.subarray(0, 8)],
    inflator = new Inflate();
  let expanded = 0,
    seenHeader = false,
    seenEnd = false;
  inflator.onData = (chunk: Uint8Array) => {
    expanded += chunk.length;
    if (expanded > h.width * h.height * 8 + h.height * 8 + 1024)
      throw new Error("PNG decompression safety limit exceeded.");
  };
  for (let p = 8; p + 12 <= bytes.length; ) {
    const length = view.getUint32(p);
    if (length > bytes.length - p - 12) throw new Error("Truncated PNG chunk.");
    const type = String.fromCharCode(...bytes.subarray(p + 4, p + 8));
    if (type === "IHDR") {
      if (seenHeader || p !== 8) throw new Error("Duplicate PNG header.");
      seenHeader = true;
    }
    if (type === "IDAT") {
      inflator.push(bytes.subarray(p + 8, p + 8 + length));
      if (inflator.err) throw new Error("Invalid PNG compression.");
    }
    if (["IHDR", "PLTE", "tRNS", "IDAT", "IEND"].includes(type))
      parts.push(bytes.subarray(p, p + length + 12));
    p += length + 12;
    if (type === "IEND") {
      seenEnd = true;
      break;
    }
  }
  if (!seenEnd || !inflator.ended || inflator.err)
    throw new Error("Incomplete PNG.");
  const result = new Uint8Array(parts.reduce((sum, p) => sum + p.length, 0));
  let offset = 0;
  for (const p of parts) {
    result.set(p, offset);
    offset += p.length;
  }
  return result;
}

export function decodePngPixels(bytes: Uint8Array, h: Header): Uint8Array {
  const p = decodePng(safePng(bytes, h), { checkCrc: true });
  if (p.depth !== 8)
    throw new Error("Only 8-bit PNG full analysis is supported.");
  const source = p.palette ? convertIndexedToRgb(p) : p.data,
    channels = p.palette ? p.palette[0].length : p.channels,
    rgba = new Uint8Array(h.width * h.height * 4);
  for (let i = 0; i < h.width * h.height; i++) {
    const k = i * channels, o = i * 4;
    rgba[o] = source[k];
    rgba[o + 1] = channels <= 2 ? source[k] : source[k + 1];
    rgba[o + 2] = channels <= 2 ? source[k] : source[k + 2];
    rgba[o + 3] = channels === 2 ? source[k + 1] : channels === 4 ? source[k + 3] : 255;
    if (!p.palette && p.transparency) {
      let transparent = true;
      for (let j = 0; j < p.transparency.length; j++) {
        if (p.transparency[j] !== source[k + j]) { transparent = false; break; }
      }
      if (transparent) rgba[o + 3] = 0;
    }
  }
  return rgba;
}
