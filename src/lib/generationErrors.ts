const CONTENT_POLICY_HINT =
  'Google\'s safety filter blocked this request. Try softer, original lyrics without violence, hate, drugs, or explicit content. Avoid naming real artists or copying existing songs. Instrumental tracks are often easier to approve.';

const COPYRIGHT_HINT =
  'Google blocked this request, likely due to a copyright or artist-name match. Use original lyrics and describe the style without naming specific artists or songs.';

export function humanizeGenerationError(message: string): string {
  const text = message.trim();
  const upper = text.toUpperCase();

  if (
    upper.includes('PROHIBITED_CONTENT') ||
    upper.includes('INPUT_BLOCKED') ||
    upper.includes('BLOCKED_OUTPUT:SAFETY') ||
    upper.includes('SAFETY FILTER')
  ) {
    return CONTENT_POLICY_HINT;
  }

  if (
    upper.includes('COPYRIGHT') ||
    upper.includes('BLOCKED_OUTPUT:OTHER') ||
    upper.includes('RECITATION')
  ) {
    return COPYRIGHT_HINT;
  }

  if (upper.includes('GEMINI BLOCKED')) {
    if (upper.includes('PROHIBITED')) return CONTENT_POLICY_HINT;
    return `Generation was blocked by Google: ${text.replace(/^Gemini blocked the request:\s*/i, '')}. ${CONTENT_POLICY_HINT}`;
  }

  return text;
}

export function throwIfStreamBlocked(errors: string[]): void {
  if (errors.length === 0) return;
  throw new Error(humanizeGenerationError(errors[errors.length - 1]));
}
