export interface DateCandidate {
  date: Date;
  raw: string;
  index: number;
  precision: 'day' | 'month';
  score: number;
}

const EXPIRY_LABEL_RE = /best\s*f[oø]r|siste\s*forbruksdag|utl[oø]ps?dato|exp|expiry|bb|bbe/i;

function normaliseOcrText(text: string): string {
  return text
    .replace(/[oO]/g, '0')
    .replace(/[lI|]/g, '1')
    .replace(/[–—]/g, '-');
}

function exactDate(year: number, month: number, day: number): Date | null {
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year
    || date.getMonth() !== month - 1
    || date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

function isAcceptableExpiryDate(date: Date): boolean {
  const now = new Date();
  const min = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
  const max = new Date(now.getFullYear() + 5, 11, 31);
  return date >= min && date <= max;
}

// Norwegian/European date patterns, most specific first.
const DATE_PATTERNS: Array<{
  re: RegExp;
  precision: 'day' | 'month';
  parse: (m: RegExpMatchArray) => Date | null;
}> = [
  // YYYY-MM-DD or YYYY/MM/DD
  {
    re: /\b(20\d{2})[-./](0?[1-9]|1[0-2])[-./](0?[1-9]|[12]\d|3[01])\b/,
    precision: 'day',
    parse: (m) => exactDate(+m[1], +m[2], +m[3]),
  },
  // DD.MM.YYYY or DD/MM/YYYY or DD-MM-YYYY
  {
    re: /\b(0?[1-9]|[12]\d|3[01])\s*[-./ ]\s*(0?[1-9]|1[0-2])\s*[-./ ]\s*(20\d{2})\b/,
    precision: 'day',
    parse: (m) => exactDate(+m[3], +m[2], +m[1]),
  },
  // DD.MM.YY (2-digit year, assume 20xx)
  {
    re: /\b(0?[1-9]|[12]\d|3[01])\s*[-./ ]\s*(0?[1-9]|1[0-2])\s*[-./ ]\s*(\d{2})\b/,
    precision: 'day',
    parse: (m) => exactDate(2000 + +m[3], +m[2], +m[1]),
  },
  // DDMMYYYY or DDMMYY, often used by dot-matrix printers
  {
    re: /\b(0[1-9]|[12]\d|3[01])(0[1-9]|1[0-2])(20\d{2})\b/,
    precision: 'day',
    parse: (m) => exactDate(+m[3], +m[2], +m[1]),
  },
  {
    re: /\b(0[1-9]|[12]\d|3[01])(0[1-9]|1[0-2])(\d{2})\b/,
    precision: 'day',
    parse: (m) => exactDate(2000 + +m[3], +m[2], +m[1]),
  },
  // MM/YYYY (month + year only — use last day of month)
  {
    re: /\b(0?[1-9]|1[0-2])[./](20\d{2})\b/,
    precision: 'month',
    parse: (m) => new Date(+m[2], +m[1], 0),
  },
];

export function extractExpiryDateCandidates(text: string): DateCandidate[] {
  const normalised = normaliseOcrText(text);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const seen = new Set<string>();
  const candidates: DateCandidate[] = [];

  for (const { re, parse, precision } of DATE_PATTERNS) {
    const global = new RegExp(re.source, 'g');
    for (const match of normalised.matchAll(global)) {
      const date = parse(match as RegExpMatchArray);
      if (!date || !isAcceptableExpiryDate(date)) continue;

      const index = match.index ?? 0;
      const key = `${date.toISOString().slice(0, 10)}:${precision}:${index}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const nearby = normalised.slice(Math.max(0, index - 36), Math.min(normalised.length, index + 24));
      let score = 0;
      if (EXPIRY_LABEL_RE.test(nearby)) score += 30;
      if (precision === 'day') score += 12;
      if (date >= today) score += 8;
      const distanceDays = Math.abs(date.getTime() - today.getTime()) / 86_400_000;
      score -= Math.min(distanceDays / 180, 8);

      candidates.push({ date, raw: match[0], index, precision, score });
    }
  }

  return candidates.sort((a, b) => b.score - a.score || a.index - b.index);
}

export function parseExpiryDate(text: string): Date | null {
  return extractExpiryDateCandidates(text)[0]?.date ?? null;
}

function imageToCanvas(image: CanvasImageSource, width: number, height: number): HTMLCanvasElement {
  // crop to centre 70% width / 35% height — where the date usually is
  const sw = Math.round(width * 0.7);
  const sh = Math.round(height * 0.35);
  const sx = Math.round((width - sw) / 2);
  const sy = Math.round((height - sh) / 2);

  const canvas = document.createElement('canvas');
  canvas.width = sw * 2;   // 2x for better OCR on small text
  canvas.height = sh * 2;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

  // Greyscale with increased contrast. A hard black/white threshold erases
  // faint dot-matrix dates commonly printed on food packaging.
  const id = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < id.data.length; i += 4) {
    const lum = 0.299 * id.data[i] + 0.587 * id.data[i + 1] + 0.114 * id.data[i + 2];
    const v = Math.max(0, Math.min(255, (lum - 128) * 1.8 + 128));
    id.data[i] = id.data[i + 1] = id.data[i + 2] = v;
  }
  ctx.putImageData(id, 0, 0);
  return canvas;
}

export interface DateOcrResult {
  rawText: string;
  date: Date | null;
  offDays: number | null;
}

async function runOcr(canvas: HTMLCanvasElement): Promise<{ rawText: string; date: Date | null }> {
  const { createWorker, PSM } = await import('tesseract.js');
  const worker = await createWorker('eng');
  try {
    await worker.setParameters({
      tessedit_char_whitelist: '0123456789./- ',
      tessedit_pageseg_mode: PSM.SPARSE_TEXT,
    });
    const { data: { text } } = await worker.recognize(canvas);
    return { rawText: text, date: parseExpiryDate(text) };
  } finally {
    await worker.terminate();
  }
}

export async function readDateFromVideo(
  video: HTMLVideoElement,
): Promise<DateOcrResult> {
  const canvas = imageToCanvas(video, video.videoWidth || 1280, video.videoHeight || 720);
  return readDateFromCanvas(canvas);
}

export async function readDateFromImage(
  source: string,
): Promise<DateOcrResult> {
  const image = new Image();
  image.src = source;
  await image.decode();
  const canvas = imageToCanvas(image, image.naturalWidth, image.naturalHeight);
  return readDateFromCanvas(canvas);
}

async function readDateFromCanvas(
  canvas: HTMLCanvasElement,
): Promise<DateOcrResult> {
  const { rawText, date } = await runOcr(canvas);
  if (!date) return { rawText, date: null, offDays: null };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const offDays = Math.round((date.getTime() - today.getTime()) / 86_400_000);
  return { rawText, date, offDays };
}

export function readDateFromText(text: string): DateOcrResult {
  const date = parseExpiryDate(text);
  if (!date) return { rawText: text, date: null, offDays: null };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return {
    rawText: text,
    date,
    offDays: Math.round((date.getTime() - today.getTime()) / 86_400_000),
  };
}
