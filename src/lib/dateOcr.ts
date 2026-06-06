// Norwegian/European date patterns, most specific first
const DATE_PATTERNS: Array<{ re: RegExp; parse: (m: RegExpMatchArray) => Date | null }> = [
  // YYYY-MM-DD or YYYY/MM/DD
  {
    re: /\b(20\d{2})[-./](0?[1-9]|1[0-2])[-./](0?[1-9]|[12]\d|3[01])\b/,
    parse: (m) => new Date(+m[1], +m[2] - 1, +m[3]),
  },
  // DD.MM.YYYY or DD/MM/YYYY or DD-MM-YYYY
  {
    re: /\b(0?[1-9]|[12]\d|3[01])[-./](0?[1-9]|1[0-2])[-./](20\d{2})\b/,
    parse: (m) => new Date(+m[3], +m[2] - 1, +m[1]),
  },
  // DD.MM.YY (2-digit year, assume 20xx)
  {
    re: /\b(0?[1-9]|[12]\d|3[01])[-./](0?[1-9]|1[0-2])[-./](\d{2})\b/,
    parse: (m) => new Date(2000 + +m[3], +m[2] - 1, +m[1]),
  },
  // MM/YYYY (month + year only — use last day of month)
  {
    re: /\b(0?[1-9]|1[0-2])[./](20\d{2})\b/,
    parse: (m) => new Date(+m[2], +m[1], 0),
  },
];

function parseDate(text: string): Date | null {
  const normalised = text.replace(/[oO]/g, '0').replace(/[lI]/g, '1');
  for (const { re, parse } of DATE_PATTERNS) {
    const m = normalised.match(re);
    if (m) {
      const d = parse(m);
      if (d && !isNaN(d.getTime())) {
        const now = new Date();
        const min = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
        const max = new Date(now.getFullYear() + 5, 11, 31);
        if (d >= min && d <= max) return d;
      }
    }
  }
  return null;
}

function videoFrameToCanvas(video: HTMLVideoElement): HTMLCanvasElement {
  const vw = video.videoWidth || 1280;
  const vh = video.videoHeight || 720;

  // crop to centre 70% width / 35% height — where the date usually is
  const sw = Math.round(vw * 0.7);
  const sh = Math.round(vh * 0.35);
  const sx = Math.round((vw - sw) / 2);
  const sy = Math.round((vh - sh) / 2);

  const canvas = document.createElement('canvas');
  canvas.width = sw * 2;   // 2x for better OCR on small text
  canvas.height = sh * 2;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

  // high-contrast greyscale
  const id = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < id.data.length; i += 4) {
    const lum = 0.299 * id.data[i] + 0.587 * id.data[i + 1] + 0.114 * id.data[i + 2];
    const v = lum > 140 ? 255 : 0;
    id.data[i] = id.data[i + 1] = id.data[i + 2] = v;
  }
  ctx.putImageData(id, 0, 0);
  return canvas;
}

async function runOcr(canvas: HTMLCanvasElement): Promise<Date | null> {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng', 1, {
    workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js',
    langPath: 'https://tessdata.projectnaptha.com/4.0.0',
    corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5/tesseract-core.wasm.js',
  });
  try {
    await worker.setParameters({ tessedit_char_whitelist: '0123456789./- ' });
    const { data: { text } } = await worker.recognize(canvas);
    return parseDate(text);
  } finally {
    await worker.terminate();
  }
}

export async function readDateFromVideo(
  video: HTMLVideoElement,
): Promise<{ date: Date; offDays: number } | null> {
  const canvas = videoFrameToCanvas(video);
  const date = await runOcr(canvas);
  if (!date) return null;
  const offDays = Math.round((date.getTime() - Date.now()) / 86_400_000);
  return { date, offDays };
}
