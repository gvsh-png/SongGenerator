import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import { buildLyricCues, buildSrtContent, getLyricsForSong } from './lyrics';
import type { SavedSong } from '../types';

let ffmpegInstance: FFmpeg | null = null;
let ffmpegLoading: Promise<FFmpeg> | null = null;

async function getFfmpeg(onStatus?: (msg: string) => void): Promise<FFmpeg> {
  if (ffmpegInstance?.loaded) return ffmpegInstance;

  if (!ffmpegLoading) {
    ffmpegLoading = (async () => {
      onStatus?.('Loading video editor…');
      const ffmpeg = new FFmpeg();
      const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm';
      await ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      ffmpegInstance = ffmpeg;
      return ffmpeg;
    })();
  }

  return ffmpegLoading;
}

async function readOutputBlob(ffmpeg: FFmpeg, filename: string): Promise<Blob> {
  const data = await ffmpeg.readFile(filename);
  const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(String(data));
  return new Blob([new Uint8Array(bytes)], { type: 'video/mp4' });
}

export async function concatVideoClips(
  clips: Blob[],
  onStatus?: (msg: string) => void,
): Promise<Blob> {
  if (clips.length === 0) {
    throw new Error('No video clips to concatenate.');
  }
  if (clips.length === 1) {
    return clips[0];
  }

  const ffmpeg = await getFfmpeg(onStatus);

  for (let i = 0; i < clips.length; i++) {
    await ffmpeg.writeFile(`clip${i}.mp4`, await fetchFile(clips[i]));
  }

  const listContent = clips.map((_, i) => `file clip${i}.mp4`).join('\n');
  await ffmpeg.writeFile('list.txt', listContent);

  onStatus?.('Stitching clips together…');

  let exitCode = await ffmpeg.exec([
    '-f', 'concat',
    '-safe', '0',
    '-i', 'list.txt',
    '-c', 'copy',
    'merged.mp4',
  ]);

  if (exitCode !== 0) {
    onStatus?.('Re-encoding merged video…');
    exitCode = await ffmpeg.exec([
      '-f', 'concat',
      '-safe', '0',
      '-i', 'list.txt',
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-pix_fmt', 'yuv420p',
      'merged.mp4',
    ]);
  }

  const merged = await readOutputBlob(ffmpeg, 'merged.mp4');

  for (let i = 0; i < clips.length; i++) {
    await ffmpeg.deleteFile(`clip${i}.mp4`);
  }
  await ffmpeg.deleteFile('list.txt');
  await ffmpeg.deleteFile('merged.mp4');

  return merged;
}

function audioExtension(dataUrl: string): string {
  if (dataUrl.includes('audio/wav')) return 'wav';
  if (dataUrl.includes('audio/mp4') || dataUrl.includes('audio/aac')) return 'm4a';
  return 'mp3';
}

/** Mux song audio + burned-in lyrics with the visual video into one MP4. */
export async function assembleMusicVideo(
  videoBlob: Blob,
  song: Omit<SavedSong, 'audioDataUrl'> & { audioDataUrl: string },
  totalDurationSec: number,
  onStatus?: (msg: string) => void,
): Promise<Blob> {
  const ffmpeg = await getFfmpeg(onStatus);

  onStatus?.('Adding song audio and lyrics…');

  await ffmpeg.writeFile('video.mp4', await fetchFile(videoBlob));

  const ext = audioExtension(song.audioDataUrl);
  await ffmpeg.writeFile(`audio.${ext}`, await fetchFile(song.audioDataUrl));

  const { text, hasLyrics } = getLyricsForSong(song);
  const cues = buildLyricCues(text, totalDurationSec, song.title);
  const srt = buildSrtContent(cues);
  const hasSubs = srt.length > 0;

  if (hasSubs) {
    await ffmpeg.writeFile('subs.srt', srt);
  }

  onStatus?.('Combining audio, visuals, and lyrics…');

  const subtitleStyle = [
    'FontName=Arial',
    'FontSize=26',
    'PrimaryColour=&H00FFFFFF',
    'OutlineColour=&H00000000',
    'Outline=2',
    'Shadow=1',
    'Alignment=2',
    'MarginV=48',
  ].join(',');

  const baseArgs = ['-i', 'video.mp4', '-i', `audio.${ext}`];

  let exitCode: number;

  if (hasSubs) {
    exitCode = await ffmpeg.exec([
      ...baseArgs,
      '-vf', `subtitles=subs.srt:force_style='${subtitleStyle}'`,
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-map', '0:v:0',
      '-map', '1:a:0',
      '-shortest',
      'final.mp4',
    ]);
  } else {
    exitCode = await ffmpeg.exec([
      ...baseArgs,
      '-c:v', 'copy',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-map', '0:v:0',
      '-map', '1:a:0',
      '-shortest',
      'final.mp4',
    ]);
  }

  if (exitCode !== 0) {
    onStatus?.('Retrying audio merge…');
    await ffmpeg.exec([
      ...baseArgs,
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-map', '0:v:0',
      '-map', '1:a:0',
      '-shortest',
      'final.mp4',
    ]);
  }

  const final = await readOutputBlob(ffmpeg, 'final.mp4');

  await ffmpeg.deleteFile('video.mp4');
  await ffmpeg.deleteFile(`audio.${ext}`);
  if (hasSubs) await ffmpeg.deleteFile('subs.srt');
  await ffmpeg.deleteFile('final.mp4');

  onStatus?.(hasLyrics ? 'Music video with lyrics ready!' : 'Music video with audio ready!');

  return final;
}
