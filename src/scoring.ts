export type Status = "pass" | "warn" | "fail" | "not_checked";
export type Target = "linkedin" | "xing" | "application" | "all";
export interface Criterion {
  id: string;
  label: string;
  status: Status;
  value: unknown;
  threshold: string;
  tip: string;
}
export const targets = ["linkedin", "xing", "application", "all"] as const;
// Source: read-only reference public/tools/bewerbungsfoto-check/app.js,
// evaluateResolution / evaluateAspectRatio. These are recommendations, not platform limits.
// Reference astro-src/data/bewerbungsfoto-check-tool.json recommends 600x800 / 1200x1600;
// evaluator instead uses short/long edges 600/750 and 1200/1500. Preserve that distinction.
export function requirements(target: Target) {
  return {
    target,
    recommendations: {
      digital:
        "600 × 800 px; evaluator warns at short edge >=600 and long edge >=750",
      print:
        "1200 × 1600 px recommended; evaluator passes at short edge >=1200 and long edge >=1500",
      crops:
        target === "all"
          ? {
              linkedin: "1:1",
              xing: "1:1",
              application: "3:4, 2:3 or 4:5; square also usable",
            }
          : {
              [target]:
                target === "application"
                  ? "3:4, 2:3 or 4:5; square also usable"
                  : "1:1",
            },
      formats: "JPEG or PNG; WebP pixel metrics require the optional Images binding, otherwise dimensions only",
      max_bytes: 8_000_000,
      brightness:
        "35–76% mean luminance; dark clipping <=16%, bright clipping <=20%",
      contrast: "Luminance standard deviation 32–84 and P95–P5 >=105",
      background: "Border unrest index <=4.5 pass; <=10.5 warn",
      sharpness:
        "Experimental recommendation: Laplacian variance >=100 pass; >=30 warn on <=64 px grid",
    },
    checklist: [
      "Use the original camera file; avoid enlarging a small image.",
      "Use soft, frontal daylight and avoid clipped highlights or shadows.",
      "Clean the camera lens and avoid backlighting.",
      "Check white balance against a neutral wall or shirt collar.",
      "Choose a plain or softly blurred background.",
      "Manually check head and shoulders, eyes near the upper third and room around the head.",
    ],
    note: "Recommendations from the reference tool, not official platform upload specifications. No face detection or biometric identification.",
  };
}
export function criterion(
  id: string,
  label: string,
  status: Status,
  value: unknown,
  threshold: string,
  tip: string,
): Criterion {
  return { id, label, status, value, threshold, tip };
}
export function headersCriteria(
  width: number,
  height: number,
  bytes: number,
  format: string,
): Criterion[] {
  const s = Math.min(width, height),
    l = Math.max(width, height),
    r = width / height;
  const resolution =
    s >= 1200 && l >= 1500 ? "pass" : s >= 600 && l >= 750 ? "warn" : "fail";
  const classic = [0.75, 2 / 3, 0.8].some((v) => Math.abs(r - v) <= 0.045);
  const ratio =
    classic || Math.abs(r - 1) <= 0.05
      ? "pass"
      : r >= 0.52 && r <= 0.94
        ? "warn"
        : "fail";
  return [
    criterion(
      "resolution",
      "Resolution and print suitability",
      resolution,
      { width, height },
      "pass: short >=1200, long >=1500; warn: short >=600, long >=750",
      resolution === "pass"
        ? "Pixel dimensions support digital applications and high-resolution printing."
        : resolution === "warn"
          ? "Suitable for online applications and standard PDFs. For larger cover-page prints, use at least 1200 × 1600 pixels."
          : "Too few pixels can look blurred or pixelated. Use the original camera file with at least 600 × 800 pixels.",
    ),
    criterion(
      "aspect_ratio",
      "Aspect ratio",
      ratio,
      r,
      "portrait 3:4, 2:3, 4:5 ±0.045; square ±0.05",
      ratio === "pass"
        ? "A classic portrait fits CV templates; a square suits professional networks and round or square frames."
        : ratio === "warn"
          ? "A small crop to 3:4 makes insertion into standard CV templates easier."
          : "Landscape or extreme crops are unusual for applications. Crop to 3:4 portrait or 1:1 square.",
    ),
    criterion(
      "file",
      "File size and format",
      format === "webp" ? "warn" : "pass",
      { bytes, format },
      "service limit 8,000,000 bytes; pixel coverage depends on decoder or Images binding; no platform upload limit claimed",
      format === "webp"
        ? "If pixel checks are unavailable, convert to JPEG/PNG or use an available Images binding."
        : "Keep an original copy and export JPEG or PNG within the destination upload limit.",
    ),
  ];
}
// Pixel formulas, border geometry and brightness/contrast/color/background thresholds
// ported from reference app.js analyzePixels and evaluate* (see docs/reference-port.md).
export function pixelCriteria(
  data: ArrayLike<number>,
  width: number,
  height: number,
): Criterion[] {
  const n = width * height,
    lum = new Float32Array(n),
    hist = new Uint32Array(256);
  let sum = 0,
    sum2 = 0,
    dark = 0,
    bright = 0,
    R = 0,
    G = 0,
    B = 0,
    valid = 0;
  for (let p = 0; p < n; p++) {
    const i = p * 4,
      a = data[i + 3] / 255;
    const r = a === 1 ? data[i] : Math.round(data[i] * a + 255 * (1 - a)),
      g = a === 1 ? data[i + 1] : Math.round(data[i + 1] * a + 255 * (1 - a)),
      b = a === 1 ? data[i + 2] : Math.round(data[i + 2] * a + 255 * (1 - a));
    const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    lum[p] = y;
    sum += y;
    sum2 += y * y;
    hist[Math.round(y)]++;
    if (y < 16) dark++;
    if (y > 242) bright++;
    if (y >= 25 && y <= 235) {
      R += r;
      G += g;
      B += b;
      valid++;
    }
  }
  const mean = sum / n,
    pct = (mean / 255) * 100,
    std = Math.sqrt(Math.max(0, sum2 / n - mean * mean));
  let c = 0,
    p5 = 0,
    p95 = 255,
    found = false;
  for (let i = 0; i < 256; i++) {
    c += hist[i];
    if (!found && c >= n * 0.05) {
      p5 = i;
      found = true;
    }
    if (c >= n * 0.95) {
      p95 = i;
      break;
    }
  }
  const spread = p95 - p5,
    dc = (dark / n) * 100,
    bc = (bright / n) * 100;
  let edge = 0,
    bs = 0,
    bs2 = 0,
    bn = 0,
    ls = 0,
    ls2 = 0,
    ln = 0,
    centerEdge = 0,
    cn = 0;
  const borderBottom = Math.min(height - 1, Math.max(1, Math.floor(height * 0.78))),
    borderTop = Math.max(1, Math.floor(height * 0.16)),
    borderLeft = Math.max(1, Math.floor(width * 0.18)),
    borderRight = Math.max(1, Math.min(width - 1, Math.floor(width * 0.82)));
  for (let y = 1; y < height - 1; y++)
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x,
        v = lum[i],
        grad =
          (Math.abs(v - lum[i - 1]) +
            Math.abs(lum[i + 1] - v) +
            Math.abs(v - lum[i - width]) +
            Math.abs(lum[i + width] - v)) *
          0.5;
      const lap =
        lum[i - 1] + lum[i + 1] + lum[i - width] + lum[i + width] - 4 * v;
      ls += lap;
      ls2 += lap * lap;
      ln++;
      if (
        y < borderBottom &&
        (y <= borderTop ||
          x <= borderLeft ||
          x >= borderRight)
      ) {
        edge += grad;
        bs += v;
        bs2 += v * v;
        bn++;
      } else {
        centerEdge += grad;
        cn++;
      }
    }
  const borderStd = bn ? Math.sqrt(Math.max(0, bs2 / bn - (bs / bn) ** 2)) : 0,
    unrest = (bn ? edge / bn : 0) * 1.2 + Math.max(0, borderStd - 8) * 0.45;
  const lapVar = ln ? Math.max(0, ls2 / ln - (ls / ln) ** 2) : 0;
  const rgb = valid ? [R / valid, G / valid, B / valid] : [128, 128, 128],
    gray = (rgb[0] + rgb[1] + rgb[2]) / 3,
    shift = Math.max(Math.abs(rgb[0] - gray), Math.abs(rgb[1] - gray), Math.abs(rgb[2] - gray)),
    warm = rgb[0] - rgb[2];
  const br: Status =
    pct < 26 || dc > 28 || pct > 84 || bc > 32
      ? "fail"
      : pct < 35 || pct > 76 || dc > 16 || bc > 20
        ? "warn"
        : "pass";
  const co: Status =
    std < 22 || spread < 70
      ? "fail"
      : std < 32 || spread < 105 || std > 84
        ? "warn"
        : "pass";
  const color: Status =
    warm > 38 || shift > 28
      ? "fail"
      : warm > 24 || warm < -16 || shift > 19
        ? "warn"
        : "pass";
  const bg: Status = unrest <= 4.5 ? "pass" : unrest <= 10.5 ? "warn" : "fail";
  return [
    criterion(
      "brightness",
      "Brightness and exposure",
      br,
      {
        mean_luminance: mean,
        percent: pct,
        dark_clip_percent: dc,
        bright_clip_percent: bc,
      },
      "fail: mean <26% or >84%, dark clip >28%, bright clip >32%; warn: mean <35% or >76%, dark >16%, bright >20%",
      br === "pass"
        ? "Balanced midtones without disruptive highlight or shadow clipping."
        : pct < 26 || dc > 28
          ? "Strong underexposure loses detail in shadows. Use frontal daylight or gently raise exposure."
          : pct > 84 || bc > 32
            ? "Large areas are overexposed. Check direct sunlight or strong flash for blown highlights."
            : "A gentle exposure correction can improve highlight and shadow detail.",
    ),
    criterion(
      "contrast",
      "Contrast and dynamic range",
      co,
      { std_dev: std, p95_minus_p5: spread },
      "fail: std <22 or spread <70; warn: std <32 or spread <105 or std >84",
      co === "pass"
        ? "Shadows, midtones and highlights give a natural sense of depth."
        : std < 22 || spread < 70
          ? "Low tonal depth can look hazy. Clean the camera lens and avoid backlighting."
          : std > 84
            ? "Very hard light-dark transitions: use soft, indirect light."
            : "Gently raise the black point and midtone contrast for clearer definition.",
    ),
    criterion(
      "color_balance",
      "Color cast and white balance",
      color,
      { rgb_mean: rgb, max_channel_deviation: shift, red_minus_blue: warm },
      "fail: red-blue >38 or max deviation >28; warn: red-blue >24 or <-16 or max deviation >19",
      color === "pass"
        ? "Color channels are balanced without a strong artificial color cast."
        : color === "warn"
          ? "Check a neutral background or shirt collar to see whether whites look neutral."
          : "Color balance deviates strongly from neutral, often under warm room lights. Adjust white balance.",
    ),
    criterion(
      "background",
      "Background calmness at border",
      bg,
      {
        unrest_index: unrest,
        border_edge_mean: bn ? edge / bn : 0,
        border_luminance_std: borderStd,
        center_edge_mean: cn ? centerEdge / cn : 0,
      },
      "pass <=4.5; warn <=10.5; otherwise fail",
      bg === "pass"
        ? "Few hard contrast edges at the border keep attention on the subject."
        : bg === "warn"
          ? "Moderate border structures or shadows: a plain or blurred background can look calmer."
          : "Strong border contrast may come from shelves, plants or frames. Use a quiet wall or a plain background.",
    ),
    criterion(
      "sharpness",
      "Sharpness (experimental)",
      lapVar >= 100 ? "pass" : lapVar >= 30 ? "warn" : "fail",
      { laplacian_variance: lapVar },
      "recommendation on sampled grid: pass >=100; warn >=30",
      "Inspect eyes and clothing edges at original size; use stable focus and avoid motion blur. Texture can inflate this heuristic; it cannot prove focus.",
    ),
  ];
}
export function summarize(criteria: Criterion[]) {
  const checked = criteria.filter((c) => c.status !== "not_checked");
  const score = Math.round(
    checked.reduce(
      (s, c) => s + (c.status === "pass" ? 100 : c.status === "warn" ? 60 : 0),
      0,
    ) / Math.max(1, checked.length),
  );
  return {
    overall_score: score,
    verdict: checked.some((c) => c.status === "fail")
      ? "Technical issues detected"
      : checked.some((c) => c.status === "warn")
        ? "Usable with room for improvement"
        : "All checked technical criteria passed",
    improvement_tips: criteria
      .filter((c) => c.status === "fail" || c.status === "warn")
      .sort(
        (a, b) => (a.status === "fail" ? 0 : 1) - (b.status === "fail" ? 0 : 1),
      )
      .map((c, i) => ({ priority: i + 1, criterion: c.id, tip: c.tip })),
  };
}
