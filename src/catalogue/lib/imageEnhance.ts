/**
 * Lightweight client-side image helpers (no ML).
 *
 * **Enhance (CSS / canvas filter)** — boosts contrast/saturation slightly. Does not recover
 * blown highlights or fix motion blur.
 *
 * **Trim near-uniform borders** — samples the outer rim, then removes rows/columns whose pixels
 * are close to that rim colour. Fails on busy borders, gradients, or when the subject touches
 * the frame; always preview before committing.
 */

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith("data:")) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not decode image."));
    img.src = src;
  });
}

export async function trimNearUniformBorder(
  dataUrl: string,
  opts?: { threshold?: number; maxTrimFraction?: number },
): Promise<string> {
  const threshold = opts?.threshold ?? 28;
  const maxTrimFraction = opts?.maxTrimFraction ?? 0.35;

  const img = await loadImage(dataUrl);
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (!w || !h) throw new Error("Invalid image dimensions.");

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unsupported.");
  ctx.drawImage(img, 0, 0);

  const { data } = ctx.getImageData(0, 0, w, h);
  const maxW = Math.floor(w * maxTrimFraction);
  const maxH = Math.floor(h * maxTrimFraction);

  const rim = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    return { r: data[i]!, g: data[i + 1]!, b: data[i + 2]! };
  };

  const sampleRing: { r: number; g: number; b: number }[] = [];
  const step = Math.max(1, Math.floor(Math.min(w, h) / 64));
  for (let x = 0; x < w; x += step) {
    sampleRing.push(rim(x, 0), rim(x, h - 1));
  }
  for (let y = 0; y < h; y += step) {
    sampleRing.push(rim(0, y), rim(w - 1, y));
  }

  const avg = sampleRing.reduce(
    (acc, p) => ({ r: acc.r + p.r, g: acc.g + p.g, b: acc.b + p.b }),
    { r: 0, g: 0, b: 0 },
  );
  const n = sampleRing.length || 1;
  const br = { r: avg.r / n, g: avg.g / n, b: avg.b / n };

  const dist = (x: number, y: number) => {
    const { r, g, b } = rim(x, y);
    return Math.hypot(r - br.r, g - br.g, b - br.b);
  };

  const rowScore = (y: number) => {
    let s = 0;
    for (let x = 0; x < w; x += step) s += dist(x, y);
    return s / Math.ceil(w / step);
  };

  const colScore = (x: number) => {
    let s = 0;
    for (let y = 0; y < h; y += step) s += dist(x, y);
    return s / Math.ceil(h / step);
  };

  let top = 0;
  while (top < maxH && rowScore(top) < threshold) top++;
  let bottom = h - 1;
  while (h - 1 - bottom < maxH && bottom > top && rowScore(bottom) < threshold) bottom--;
  let left = 0;
  while (left < maxW && colScore(left) < threshold) left++;
  let right = w - 1;
  while (w - 1 - right < maxW && right > left && colScore(right) < threshold) right--;

  const cw = Math.max(1, right - left + 1);
  const ch = Math.max(1, bottom - top + 1);
  const out = document.createElement("canvas");
  out.width = cw;
  out.height = ch;
  const octx = out.getContext("2d");
  if (!octx) throw new Error("Canvas unsupported.");
  octx.drawImage(canvas, left, top, cw, ch, 0, 0, cw, ch);
  return out.toDataURL("image/png");
}
