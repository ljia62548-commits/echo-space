export function formatDate(input: Date | string, separator = '.'): string {
  const date = input instanceof Date ? input : new Date(input);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return [year, month, day].join(separator);
}

export function formatMonth(input: Date | string): string {
  const date = input instanceof Date ? input : new Date(input);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function isoDate(input: Date | string): string {
  const date = input instanceof Date ? input : new Date(input);
  return date.toISOString().slice(0, 10);
}

export function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, '');
}
