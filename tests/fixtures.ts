import jpeg from "jpeg-js";
import { encode } from "fast-png";
export function pixels(w = 192, h = 256, kind = "good") {
  const data = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let v = 145;
      if (kind === "dark") v = 12;
      else if (kind === "low-contrast") v = 125 + Math.round((x / w) * 5);
      else if (kind === "blurry") v = 70 + Math.round((x / w) * 120);
      else if (kind === "busy") v = (x + y) % 2 ? 40 : 220;
      else if (x > w * 0.25 && x < w * 0.75 && y > h * 0.2 && y < h * 0.9)
        v = Math.floor(x / 5) % 2 ? 210 : 40;
      const i = (y * w + x) * 4;
      data[i] = data[i + 1] = data[i + 2] = v;
      data[i + 3] = 255;
    }
  return { width: w, height: h, data };
}
export const png = (kind = "good", w = 192, h = 256) =>
  encode({ ...pixels(w, h, kind), channels: 4, depth: 8 });
export const jpg = (kind = "good", w = 192, h = 256) =>
  jpeg.encode(pixels(w, h, kind), 85).data;
export const base64 = (data: Uint8Array) =>
  Buffer.from(data).toString("base64");
