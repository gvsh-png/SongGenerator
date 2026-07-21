export function sanitizeFilename(title: string): string {
  const cleaned = title
    .replace(/[^a-z0-9_\-\s]/gi, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase();
  return cleaned || 'lyria-song';
}

export function downloadAudio(dataUrl: string, filename: string): void {
  const safeName = sanitizeFilename(filename);
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `${safeName}.mp3`;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
