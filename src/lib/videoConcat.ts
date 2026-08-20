import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

let ffmpegInstance: FFmpeg | null = null;
let ffmpegLoading: Promise<FFmpeg> | null = null;

async function getFfmpeg(onStatus?: (msg: string) => void): Promise<FFmpeg> {
  if (ffmpegInstance?.loaded) return ffmpegInstance;

  if (!ffmpegLoading) {
    ffmpegLoading = (async () => {
      onStatus?.('Loading video stitcher…');
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

  const exitCode = await ffmpeg.exec([
    '-f', 'concat',
    '-safe', '0',
    '-i', 'list.txt',
    '-c', 'copy',
    'output.mp4',
  ]);

  if (exitCode !== 0) {
    onStatus?.('Re-encoding merged video…');
    await ffmpeg.exec([
      '-f', 'concat',
      '-safe', '0',
      '-i', 'list.txt',
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-pix_fmt', 'yuv420p',
      'output.mp4',
    ]);
  }

  const data = await ffmpeg.readFile('output.mp4');
  const bytes = data instanceof Uint8Array ? data : new TextEncoder().encode(String(data));

  for (let i = 0; i < clips.length; i++) {
    await ffmpeg.deleteFile(`clip${i}.mp4`);
  }
  await ffmpeg.deleteFile('list.txt');
  await ffmpeg.deleteFile('output.mp4');

  return new Blob([new Uint8Array(bytes)], { type: 'video/mp4' });
}
