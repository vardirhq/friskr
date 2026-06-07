export function optionalText(value: unknown, maxLength: number): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  if (!text) return null;
  if (text.length > maxLength) throw new Error('INVALID_TEXT');
  return text;
}

export function positiveNumber(value: unknown, max = 9999): number {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0 || number > max) {
    throw new Error('INVALID_NUMBER');
  }
  return number;
}

export function positiveInteger(value: unknown, max = 9999): number {
  const number = positiveNumber(value, max);
  if (!Number.isInteger(number)) throw new Error('INVALID_INTEGER');
  return number;
}

export function optionalMoney(value: unknown): number | null {
  if (value == null || value === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > 1_000_000) {
    throw new Error('INVALID_MONEY');
  }
  return Math.round(number * 100) / 100;
}

export function optionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'boolean') throw new Error('INVALID_BOOLEAN');
  return value;
}

export function optionalIsoDate(value: unknown): string | null {
  if (value == null || value === '') return null;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error('INVALID_DATE');
  }
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year
    || date.getMonth() !== month - 1
    || date.getDate() !== day
  ) {
    throw new Error('INVALID_DATE');
  }
  return value;
}
