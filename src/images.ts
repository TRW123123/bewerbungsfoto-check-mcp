import { nativePng } from "./native-png";
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
  contentLength?: number,
): Promise<Uint8Array> {
  if (!body) throw new Error("The response body is empty.");
  const reader = body.getReader(),
    chunks: Uint8Array[] = [];
  let buffer = contentLength !== undefined && Number.isSafeInteger(contentLength) && contentLength >= 0 && contentLength <= limit
    ? new Uint8Array(contentLength) : undefined;
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
      if (buffer && total <= buffer.length) buffer.set(value, total - value.length);
      else {
        // A dishonest short Content-Length must never truncate the actual body.
        if (buffer) { chunks.push(buffer.subarray(0, total - value.length)); buffer = undefined; }
        chunks.push(value);
      }
    }
    if (buffer) return buffer.subarray(0, total);
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
async function withImageStream<T>(
  input: string,
  consume: (body: ReadableStream<Uint8Array>, signal: AbortSignal, contentLength?: number) => Promise<T>,
  fetcher: typeof fetch = fetch,
): Promise<T> {
  const controller = new AbortController(),
    timer = setTimeout(() => controller.abort(), 8000);
  let url = safeUrl(input);
  try {
    for (let redirects = 0; redirects <= 3; redirects++) {
      const r = await fetcher(url.toString(), {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          Accept: "image/jpeg,image/png,image/webp",
          "User-Agent": "HeadshotPhotoCheck/0.1 (+https://profilfoto-ki.de; MCP photo checker)",
        },
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
          `Image host returned HTTP ${r.status}. Check that the URL is public and accessible.`,
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
      if (!r.body) throw new Error("The response body is empty.");
      let onAbort: (() => void) | undefined;
      const deadline = new Promise<never>((_, reject) => {
        onAbort = () => reject(new Error("Image fetch timed out after 8 seconds."));
        if (controller.signal.aborted) onAbort();
        else controller.signal.addEventListener("abort", onAbort, { once: true });
      });
      try { return await Promise.race([consume(r.body, controller.signal,
        /^\d+$/.test(r.headers.get("content-length") ?? "") ? Number(r.headers.get("content-length")) : undefined), deadline]); }
      finally { if (onAbort) controller.signal.removeEventListener("abort", onAbort); }
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
export function fetchImage(input: string, fetcher: typeof fetch = fetch) {
  return withImageStream(input, (body, signal, length) => readLimited(body, MAX_BYTES, signal, length), fetcher);
}

export function analyzeUrl(input: string, target: Target, mode = "auto", images?: ImageResizer, fetcher: typeof fetch = fetch) {
  return withImageStream(input, async (body, signal, length) =>
    analyzeAuto(await readLimited(body, MAX_BYTES, signal, length), target, mode, images), fetcher);
}

export function base64Image(input: string): Uint8Array {
  const raw = input.replace(/^data:image\/[a-z0-9.+-]+;base64,/i, "");
  if (raw.length > Math.ceil(MAX_BYTES / 3) * 4 || !raw || raw.length % 4 === 1)
    throw new Error("Provide valid image base64 (maximum 8,000,000 decoded bytes).");
  let bytes: Uint8Array;
  try {
    // Decoders validate the alphabet/padding. Reject whitespace separately because
    // both native decoders accept it, while this API has always rejected it.
    if (/\s/.test(raw)) throw new Error("Whitespace in base64.");
    const native = Uint8Array as typeof Uint8Array & {
      fromBase64?: (input: string) => Uint8Array;
    };
    if (native.fromBase64) bytes = native.fromBase64(raw);
    else {
      const decoded = atob(raw);
      bytes = new Uint8Array(decoded.length);
      for (let i = 0; i < decoded.length; i++) bytes[i] = decoded.charCodeAt(i);
    }
  } catch {
    throw new Error("Invalid image base64 encoding.");
  }
  if (bytes.length > MAX_BYTES)
    throw new Error("Image exceeds the 8,000,000 byte limit.");
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
export async function analyzeImage(bytes: Uint8Array, target: Target, mode = "full", metadata?: Header & { fileSize: number }) {
  if (bytes.length > MAX_BYTES)
    throw new Error("Image exceeds the 8,000,000 byte limit.");
  const h = metadata ?? imageHeader(bytes),
    criteria = headersCriteria(h.width, h.height, metadata?.fileSize ?? bytes.length, h.format),
    notes: string[] = [];
  const full =
    mode === "full" && h.format !== "webp" && h.width * h.height <= (h.format === "png" ? 1_000_000 : 4_000_000);
  if (full) {
    let rgba: Uint8Array | Uint8ClampedArray;
    try {
      rgba = h.format === "jpeg"
        ? (await import("./jpeg-decoder")).decodeJpegPixels(bytes)
        : (h.width * h.height <= 16_384 ? await nativePng(bytes, h.width, h.height) : undefined) ??
          (await import("./decoders")).decodePngPixels(bytes, h);
    } catch {
      throw new Error(
        "Image pixels could not be decoded safely. Re-export as an 8-bit JPEG/PNG, or use header-only mode.",
      );
    }
    const scale = Math.min(1, 64 / Math.max(h.width, h.height)),
      w = Math.max(1, Math.round(h.width * scale)),
      height = Math.max(1, Math.round(h.height * scale)),
      small = new Uint8Array(w * height * 4);
    for (let y = 0; y < height; y++)
      for (let x = 0; x < w; x++) {
        const from =
          (Math.min(h.height - 1, Math.floor(y / scale)) * h.width +
            Math.min(h.width - 1, Math.floor(x / scale))) *
          4;
        const to = (y * w + x) * 4;
        small[to] = rgba[from]; small[to + 1] = rgba[from + 1];
        small[to + 2] = rgba[from + 2]; small[to + 3] = rgba[from + 3];
      }
    criteria.push(...pixelCriteria(small, w, height));
    notes.push(
      "Pixel metrics use a nearest-neighbor grid with a maximum 64 px long side. Whole-image heuristics can be affected by clothing and background; inspect the original. EXIF orientation is not applied; re-export upright.",
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

function logBindingError(e: unknown, stage: string, expected_width = 0, expected_height = 0, actual_width = 0, actual_height = 0) {
  // Never serialize exception stacks, input bytes or request context.
  const message = e instanceof Error ? e.message : "Unknown binding failure";
  console.log(JSON.stringify({
    evt: "images_binding_error", stage,
    expected_width, expected_height, actual_width, actual_height,
    name: e instanceof Error ? e.name.slice(0, 80) : "Error",
    message: message.replace(/(?:https?:\/\/|data:)[^\s]+/gi, "[redacted]")
      .replace(/[A-Za-z0-9+/=]{80,}/g, "[redacted]").slice(0, 200),
  }));
}

// Structural subset makes the optional platform binding easy to test without a service.
export interface ImageResizer {
  info(stream: ReadableStream<Uint8Array>): Promise<{ format: string; fileSize?: number; width?: number; height?: number }>;
  input(stream: ReadableStream<Uint8Array>): {
    transform(options: { width: number; height: number; fit: "scale-down" }): {
      output(options: { format: "image/png" }): Promise<{ response(): Response }>;
    };
  };
}
export async function analyzeAuto(bytes: Uint8Array, target: Target, mode = "auto", images?: ImageResizer) {
  if (bytes.length > MAX_BYTES) throw new Error("Image exceeds the 8,000,000 byte limit.");
  const h = imageHeader(bytes);
  if (!Number.isInteger(h.width) || !Number.isInteger(h.height) || h.width <= 0 || h.height <= 0 ||
      h.width > 65535 || h.height > 65535 || h.width * h.height > 100_000_000)
    throw new Error("Image dimensions exceed the safety cap.");
  const size = bytes.length;
  const headerResult = () => analyzeImage(bytes, target, "header-only", { ...h, fileSize: size });
  if (mode === "header-only") return headerResult();
  if (mode === "full") return analyzeImage(bytes, target, mode);
  let failure = "Images binding is unavailable.";
  if (images) {
    let stage = "transform";
    let expected_width = 0, expected_height = 0, actual_width = 0, actual_height = 0;
    try {
      const scale = Math.min(1, 64 / Math.max(h.width, h.height));
      const width = Math.max(1, Math.round(h.width * scale));
      const height = Math.max(1, Math.round(h.height * scale));
      expected_width = width; expected_height = height;
      // Both input paths enqueue the same bounded buffer without a Response copy.
      const stream = new ReadableStream<Uint8Array>({ start(c) { c.enqueue(bytes); c.close(); } });
      const output = await images.input(stream).transform({ width: 64, height: 64, fit: "scale-down" }).output({ format: "image/png" });
      stage = "response";
      const response = output.response();
      if (!response.ok) throw new Error(`Transformation returned HTTP ${response.status}.`);
      const small = await readLimited(response.body, 150_000);
      stage = "dimensions";
      const sh = imageHeader(small);
      actual_width = sh.width; actual_height = sh.height;
      if (sh.format !== "png" || sh.width <= 0 || sh.height <= 0 || sh.width > 64 || sh.height > 64)
        throw new Error("Unexpected transformation dimensions.");
      stage = "decode";
      const result = await analyzeImage(small, target, "full");
      result.criteria.splice(0, 3, ...headersCriteria(h.width, h.height, size, h.format));
      Object.assign(result, summarize(result.criteria));
      result.analysis_mode = "images-binding";
      result.notes = ["Pixel metrics use an Images binding resize to a maximum 64 px long side. Original dimensions, format and byte size are used for header checks. Sharpness detects coarse blur only; resizing removes fine focus detail. No JPEG DC/AC coefficient analysis is performed. Re-export upright; orientation and color handling can differ between local and production resizing."];
      return result;
    } catch (e) {
      logBindingError(e, stage, expected_width, expected_height, actual_width, actual_height);
      failure = "Images transformation or small-image decode failed (including possible quota exhaustion).";
    }
  }
  // Only tiny JPEG/PNG inputs have a bounded local pixel fallback.
  if (h.format !== "webp" && h.width * h.height <= 16_384)
    return analyzeImage(bytes, target, "full");
  const result = await headerResult();
  result.notes = [failure + " No bounded pixel path is available for this input; header-only checks were used. Try a JPEG/PNG no larger than 128 × 128 pixels."];
  return result;
}
