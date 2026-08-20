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

export function downloadBlob(blob: Blob, filename: string, ext: string): void {
  const safeName = sanitizeFilename(filename);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${safeName}.${ext}`;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadVideo(blob: Blob, filename: string): void {
  downloadBlob(blob, filename, 'mp4');
}
