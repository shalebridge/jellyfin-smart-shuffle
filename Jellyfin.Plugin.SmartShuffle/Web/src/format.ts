export function formatDate(value: string): string {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

export function formatProgress(played: number, total: number): string {
  if (total <= 0) {
    return '0%';
  }

  return Math.round((played / total) * 100) + '%';
}