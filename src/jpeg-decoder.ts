import jpeg from "jpeg-js";
export function decodeJpegPixels(bytes: Uint8Array) {
  return jpeg.decode(bytes, {
    useTArray: true,
    maxResolutionInMP: 4,
    maxMemoryUsageInMB: 64,
  }).data;
}
