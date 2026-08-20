#!/usr/bin/env node
/**
 * Self-hosted API stub for Song Studio Local.
 * Wire POST /api/generate to YuE, HeartMuLa, or your own inference code.
 *
 * Usage:
 *   npm run local-server          # API only — implement generation yourself
 *   npm run local-server:mock     # Returns a short silent WAV for UI testing
 */

import http from 'node:http';

const PORT = Number(process.env.PORT || 8787);
const MOCK = process.env.LOCAL_MOCK === '1';

function generateSilentWav(seconds = 2, sampleRate = 44100) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const numSamples = Math.floor(sampleRate * seconds);
  const dataSize = numSamples * blockAlign;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);

  return buffer.toString('base64');
}

function setCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function sendJson(res, status, body) {
  setCors(res);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

const server = http.createServer(async (req, res) => {
  const url = req.url?.split('?')[0] ?? '';

  if (req.method === 'OPTIONS') {
    setCors(res);
    res.writeHead(204);
    res.end();
    return;
  }

  if (url === '/health' && req.method === 'GET') {
    sendJson(res, 200, {
      status: 'ok',
      message: MOCK
        ? 'Mock server ready (LOCAL_MOCK=1)'
        : 'Server ready — implement POST /api/generate',
      mock: MOCK,
    });
    return;
  }

  if (url === '/api/generate' && req.method === 'POST') {
    try {
      const body = await readJsonBody(req);
      const prompt = String(body.prompt ?? '');
      const duration = Number(body.duration ?? 30);

      if (MOCK) {
        sendJson(res, 200, {
          audio: generateSilentWav(Math.min(Math.max(duration, 1), 10)),
          transcript: `[Mock local generation]\n${prompt.slice(0, 500)}`,
          mimeType: 'audio/wav',
          duration,
        });
        return;
      }

      sendJson(res, 501, {
        error: 'Model not configured',
        message:
          'Connect your self-hosted model here. See local-server/README.md. Set LOCAL_MOCK=1 to test the UI with sample audio.',
        received: {
          prompt: prompt.slice(0, 300),
          duration,
          model: body.model ?? 'local-default',
        },
      });
    } catch (error) {
      sendJson(res, 400, {
        error: error instanceof Error ? error.message : 'Invalid request body',
      });
    }
    return;
  }

  sendJson(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`Song Studio local server → http://localhost:${PORT}`);
  console.log(MOCK ? 'Running in MOCK mode (sample audio)' : 'Waiting for model integration');
});
