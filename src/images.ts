import jpeg from "jpeg-js";
import { decode as decodePng, convertIndexedToRgb } from "fast-png";
import { Inflate } from "pako";
import {
  criterion,
  headersCriteria,
  pixelCriteria,
  requirements,
  summarize,
  type Target,
} from "./scoring";
export const MAX_BYTES = 8_000_000;
export const MAX_REQUEST_BYTES = 10_670_000;
export function safeUrl(input: string): URL {
  let u: URL;
  try {
    u = new URL(input);
  } catch {
    throw new Error("Provide a valid public HTTPS image URL.");
  }
  const h = u.hostname.toLowerCase().replace(/\.$/, "");
  if (
    u.protocol !== "https:" ||
    u.username ||
    u.password ||
    (u.port && u.port !== "443")
  )
    throw new Error(
      "Only HTTPS URLs without credentials on port 443 are allowed.",
    );
  // Conservative: reject all IP literals (including alternate numeric IPv4 normalized by URL),
  // single-label and reserved/internal suffixes. Every redirect is checked again.
  if (
    h.includes(":") ||
    /^\d+(\.\d+){3}$/.test(h) ||
    !h.includes(".") ||
    /(^|\.)(localhost|local|internal|lan|home|corp|intranet|localnet|svc|private|test|invalid|example|onion|arpa)$/.test(
      h,
    ) ||
    h.endsWith(".localdomain")
  )
    throw new Error(
      "Local, private, link-local, IP-literal and internal hosts are not allowed.",
    );
  return u;
}
export async function readLimited(
  body: ReadableStream<Uint8Array> | null,
  limit: number,
  signal?: AbortSignal,
): Promise<Uint8Array> {
  if (!body) throw new Error("The response body is empty.");
  const reader = body.getReader(),
    chunks: Uint8Array[] = [];
  let total = 0;
  const abort = () => {
    void reader.cancel().catch(() => {});
  };
  signal?.addEventListener("abort", abort, { once: true });
  try {
    while (true) {
      if (signal?.aborted)
        throw new Error("Image fetch timed out after 8 seconds.");
      const { value, done } = await reader.read();
      if (signal?.aborted)
        throw new Error("Image fetch timed out after 8 seconds.");
      if (done) break;
      total += value.length;
      if (total > limit)
        throw new Error(
          `Input exceeds the ${limit.toLocaleString("en-US")} byte limit.`,
        );
      chunks.push(value);
    }
    const all = new Uint8Array(total);
    let p = 0;
    for (const c of chunks) {
      all.set(c, p);
      p += c.length;
    }
    return all;
  } finally {
    signal?.removeEventListener("abort", abort);
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
export async function fetchImage(
  input: string,
  fetcher: typeof fetch = fetch,
): Promise<Uint8Array> {
  const controller = new AbortController(),
    timer = setTimeout(() => controller.abort(), 8000);
  let url = safeUrl(input);
  try {
    for (let redirects = 0; redirects <= 3; redirects++) {
      const r = await fetcher(url.toString(), {
        redirect: "manual",
        signal: controller.signal,
        headers: { Accept: "image/jpeg,image/png,image/webp" },
      });
      if ([301, 302, 303, 307, 308].includes(r.status)) {
        await r.body?.cancel();
        if (redirects === 3)
          throw new Error("Image URL exceeds the maximum of 3 redirects.");
        const location = r.headers.get("location");
        if (!location)
          throw new Error("Image redirect is missing its destination.");
        url = safeUrl(new URL(location, url).toString());
        continue;
      }
      if (!r.ok) {
        await r.body?.cancel();
        throw new Error(
          "Image host returned an unsuccessful HTTP response. Check that the URL is public and accessible.",
        );
      }
      if (!r.headers.get("content-type")?.toLowerCase().startsWith("image/")) {
        await r.body?.cancel();
        throw new Error("Image URL must return an image/* Content-Type.");
      }
      if (Number(r.headers.get("content-length")) > MAX_BYTES) {
        await r.body?.cancel();
        throw new Error("Image exceeds the 8,000,000 byte limit.");
      }
      return await readLimited(r.body, MAX_BYTES, controller.signal);
    }
    throw new Error("Unable to follow image URL.");
  } catch (e) {
    if (controller.signal.aborted)
      throw new Error("Image fetch timed out after 8 seconds.");
    if (e instanceof Error && !["TypeError", "AbortError"].includes(e.name))
      throw e;
    throw new Error(
      "Could not fetch the image. Check its public HTTPS URL and try again.",
    );
  } finally {
    clearTimeout(timer);
  }
}
export function base64Image(input: string): Uint8Array {
  const raw = input.replace(/^data:image\/[a-z0-9.+-]+;base64,/i, "");
  if (
    raw.length > Math.ceil(MAX_BYTES / 3) * 4 ||
    !raw ||
    raw.length % 4 === 1 ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(raw)
  )
    throw new Error(
      "Provide valid image base64 (maximum 8,000,000 decoded bytes).",
    );
  let s: string;
  try {
    s = atob(raw);
  } catch {
    throw new Error("Invalid image base64 encoding.");
  }
  if (s.length > MAX_BYTES)
    throw new Error("Image exceeds the 8,000,000 byte limit.");
  const bytes = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
  return bytes;
}
export interface Header {
  width: number;
  height: number;
  format: "jpeg" | "png" | "webp";
}
export function imageHeader(b: Uint8Array): Header {
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength),
    ascii = (p: number, n: number) =>
      String.fromCharCode(...b.subarray(p, p + n));
  let h: Header | undefined;
  if (
    b.length >= 33 &&
    ascii(0, 8) === "\x89PNG\r\n\x1a\n" &&
    v.getUint32(8) === 13 &&
    ascii(12, 4) === "IHDR"
  )
    h = { width: v.getUint32(16), height: v.getUint32(20), format: "png" };
  else if (b.length >= 4 && b[0] === 255 && b[1] === 216) {
    let p = 2;
    while (p + 3 < b.length) {
      if (b[p++] !== 255) break;
      while (b[p] === 255) p++;
      const marker = b[p++];
      if (marker === 217 || marker === 218) break;
      if (marker === 1 || (marker >= 208 && marker <= 215)) continue;
      if (p + 2 > b.length) break;
      const length = v.getUint16(p);
      if (length < 2 || p + length > b.length) break;
      if (
        [
          192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207,
        ].includes(marker) &&
        length >= 8
      ) {
        h = {
          height: v.getUint16(p + 3),
          width: v.getUint16(p + 5),
          format: "jpeg",
        };
        break;
      }
      p += length;
    }
  } else if (
    b.length >= 30 &&
    ascii(0, 4) === "RIFF" &&
    ascii(8, 4) === "WEBP"
  ) {
    const kind = ascii(12, 4);
    if (kind === "VP8X")
      h = {
        width: 1 + b[24] + (b[25] << 8) + (b[26] << 16),
        height: 1 + b[27] + (b[28] << 8) + (b[29] << 16),
        format: "webp",
      };
    else if (kind === "VP8 " && b[23] === 157 && b[24] === 1 && b[25] === 42)
      h = {
        width: v.getUint16(26, true) & 16383,
        height: v.getUint16(28, true) & 16383,
        format: "webp",
      };
    else if (kind === "VP8L" && b[20] === 47) {
      const bits = v.getUint32(21, true);
      h = {
        width: (bits & 16383) + 1,
        height: ((bits >>> 14) & 16383) + 1,
        format: "webp",
      };
    }
  }
  if (!h || !h.width || !h.height)
    throw new Error(
      "Unrecognized or truncated image header. Use a valid JPEG, PNG or WebP.",
    );
  if (h.width > 65535 || h.height > 65535 || h.width * h.height > 100_000_000)
    throw new Error(
      "Image dimensions exceed the safety limit (100 megapixels or 65,535 pixels per side).",
    );
  return h;
}
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
export function analyzeImage(bytes: Uint8Array, target: Target, mode = "full") {
  if (bytes.length > MAX_BYTES)
    throw new Error("Image exceeds the 8,000,000 byte limit.");
  const h = imageHeader(bytes),
    criteria = headersCriteria(h.width, h.height, bytes.length, h.format),
    notes: string[] = [];
  const full =
    mode === "full" && h.format !== "webp" && h.width * h.height <= (h.format === "png" ? 1_000_000 : 4_000_000);
  if (full) {
    let rgba: Uint8Array | Uint8ClampedArray;
    try {
      if (h.format === "jpeg") {
        rgba = jpeg.decode(bytes, {
          useTArray: true,
          maxResolutionInMP: 4,
          maxMemoryUsageInMB: 64,
        }).data;
      } else {
        const p = decodePng(safePng(bytes, h), { checkCrc: true });
        if (p.depth !== 8)
          throw new Error("Only 8-bit PNG full analysis is supported.");
        const source = p.palette ? convertIndexedToRgb(p) : p.data,
          channels = p.palette ? p.palette[0].length : p.channels;
        rgba = new Uint8Array(h.width * h.height * 4);
        for (let i = 0; i < h.width * h.height; i++) {
          const k = i * channels,
            o = i * 4;
          rgba[o] = source[k];
          rgba[o + 1] = channels <= 2 ? source[k] : source[k + 1];
          rgba[o + 2] = channels <= 2 ? source[k] : source[k + 2];
          rgba[o + 3] =
            channels === 2
              ? source[k + 1]
              : channels === 4
                ? source[k + 3]
                : 255;
          if (
            !p.palette &&
            p.transparency &&
            p.transparency.every((v, j) => v === source[k + j])
          )
            rgba[o + 3] = 0;
        }
      }
    } catch {
      throw new Error(
        "Image pixels could not be decoded safely. Re-export as an 8-bit JPEG/PNG, or use header-only mode.",
      );
    }
    const scale = Math.min(1, 256 / Math.max(h.width, h.height)),
      w = Math.max(1, Math.round(h.width * scale)),
      height = Math.max(1, Math.round(h.height * scale)),
      small = new Uint8Array(w * height * 4);
    for (let y = 0; y < height; y++)
      for (let x = 0; x < w; x++) {
        const from =
          (Math.min(h.height - 1, Math.floor(y / scale)) * h.width +
            Math.min(h.width - 1, Math.floor(x / scale))) *
          4;
        small.set(rgba.subarray(from, from + 4), (y * w + x) * 4);
      }
    criteria.push(...pixelCriteria(small, w, height));
    notes.push(
      "Pixel metrics use a nearest-neighbor grid with a maximum 256 px long side. Whole-image heuristics can be affected by clothing and background; inspect the original. EXIF orientation is not applied; re-export upright.",
    );
  } else {
    const reason =
      h.format === "webp"
        ? "Convert to JPEG/PNG for full analysis."
        : mode !== "full"
          ? "Header-only mode is enabled to reduce CPU use."
          : "Full decode exceeds the safety cap (1 MP PNG / 4 MP JPEG); header-only checks were used.";
    notes.push(reason);
    for (const [id, label] of [
      ["brightness", "Brightness"],
      ["contrast", "Contrast"],
      ["color_balance", "Color balance"],
      ["background", "Background"],
      ["sharpness", "Sharpness"],
    ])
      criteria.push(
        criterion(id, label, "not_checked", null, "Not evaluated", reason),
      );
  }
  criteria.push(
    criterion(
      "face_framing",
      "Face size and framing",
      "not_checked",
      null,
      "Manual review required",
      "No reliable face detector is used. Manually check head and shoulders, eyes near the upper third and sufficient space around the head.",
    ),
  );
  const summary = summarize(criteria);
  return {
    ...summary,
    verdict: full ? summary.verdict : `Partial check: ${summary.verdict}`,
    target,
    analysis_mode: full ? "full" : "header-only",
    score_scope:
      "Equal-weight technical heuristic over checked criteria only; not a judgment of the person or a guarantee of acceptance.",
    criteria,
    recommended_crops: requirements(target).recommendations.crops,
    notes,
  };
}

// Structural subset makes the optional platform binding easy to test without a service.
export interface ImageResizer {
  input(stream: ReadableStream<Uint8Array>): {
    transform(options: { width: number; height: number }): {
      output(options: { format: "image/png" }): Promise<{ response(): Response }>;
    };
  };
}
export async function analyzeAuto(bytes: Uint8Array, target: Target, mode = "auto", images?: ImageResizer) {
  if (bytes.length > MAX_BYTES) throw new Error("Image exceeds the 8,000,000 byte limit.");
  const h = imageHeader(bytes);
  if (mode === "header-only" || mode === "full") return analyzeImage(bytes, target, mode);
  let failure = "Images binding is unavailable.";
  // Small native inputs avoid a transformation entirely. Keep this conservative for CPU.
  if (h.format !== "webp" && h.width * h.height <= 16_384)
    return analyzeImage(bytes, target, "full");
  if (images) {
    try {
      const scale = Math.min(1, 128 / Math.max(h.width, h.height));
      const width = Math.max(1, Math.round(h.width * scale));
      const height = Math.max(1, Math.round(h.height * scale));
      const stream = new ReadableStream<Uint8Array>({ start(c) { c.enqueue(bytes); c.close(); } });
      const output = await images.input(stream).transform({ width, height }).output({ format: "image/png" });
      const response = output.response();
      if (!response.ok) throw new Error("Transformation failed.");
      const small = await readLimited(response.body, 150_000);
      const sh = imageHeader(small);
      if (sh.format !== "png" || sh.width !== width || sh.height !== height)
        throw new Error("Unexpected transformation dimensions.");
      const result = analyzeImage(small, target, "full");
      result.criteria.splice(0, 3, ...headersCriteria(h.width, h.height, bytes.length, h.format));
      Object.assign(result, summarize(result.criteria));
      result.analysis_mode = "images-binding";
      result.notes = ["Pixel metrics use an Images binding resize to a maximum 128 px long side. Original dimensions, format and byte size are used for header checks. Sharpness detects coarse blur only; resizing removes fine focus detail. No JPEG DC/AC coefficient analysis is performed. Re-export upright; orientation and color handling can differ between local and production resizing."];
      return result;
    } catch {
      failure = "Images transformation or small-image decode failed (including possible quota exhaustion).";
    }
  }
  const result = analyzeImage(bytes, target, "header-only");
  result.notes = [failure + " No bounded pixel path is available for this input; header-only checks were used. Try a JPEG/PNG no larger than 128 × 128 pixels."];
  return result;
}
