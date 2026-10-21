/*
 * Vercel function: turns one of James's answers into natural speech with Gemini.
 * GET /api/tts?id=education&v=<fingerprint>
 *
 * Only lines from answers.js can be spoken, so nobody can use your key for other text.
 * Each recording is cached by Vercel, so Gemini is asked for a line only once
 * (and again only when you change that line's text).
 *
 * Settings in Vercel → Project → Settings → Environment Variables:
 *   GEMINI_API_KEY    required, your key from Google AI Studio
 *   GEMINI_VOICE      optional, voice name (default Charon)
 *   GEMINI_TTS_MODEL  optional, model name(s), comma-separated, tried in order
 *   GEMINI_STYLE      optional, how James should sound; set to "none" to send the plain text
 */
const J = require('../answers.js');

const MODELS = (process.env.GEMINI_TTS_MODEL || 'gemini-3.8-flash-tts,gemini-3.1-flash-tts-preview,gemini-2.5-flash-preview-tts')
  .split(',').map((m) => m.trim()).filter(Boolean);
const VOICE = process.env.GEMINI_VOICE || 'Charon';
const STYLE = process.env.GEMINI_STYLE || 'Say this in a deep, calm, warm voice with an American accent, like a friendly, professional assistant:';

function pcmToWav(pcm, sampleRate) {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);          // fmt chunk size
  header.writeUInt16LE(1, 20);           // PCM
  header.writeUInt16LE(1, 22);           // mono
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);           // block align
  header.writeUInt16LE(16, 34);          // bits per sample
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

function fail(res, status, error, detail) {
  res.setHeader('Cache-Control', 'no-store');
  res.status(status).json(detail ? { error, detail } : { error });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') return fail(res, 405, 'Use GET.');

  const id = String(req.query.id || '');
  const text = J.speechById(id);
  if (!text) return fail(res, 404, 'No line with that id.');
  if (String(req.query.v || '') !== J.hash(text)) return fail(res, 409, 'The site was updated. Reload the page.');

  const key = process.env.GEMINI_API_KEY;
  if (!key) return fail(res, 500, 'GEMINI_API_KEY is not set in Vercel.');

  const prompt = STYLE.toLowerCase() === 'none' ? text : `${STYLE}\n\n${text}`;
  let lastError = 'No model returned audio.';

  for (const model of MODELS) {
    let r;
    try {
      r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } },
          },
        }),
      });
    } catch (e) {
      lastError = `${model}: network error`;
      continue;
    }

    if (!r.ok) {
      const body = (await r.text()).slice(0, 300);
      lastError = `${model}: ${r.status} ${body}`;
      if (r.status === 429) return fail(res, 429, 'Gemini rate limit reached. Try again shortly.', lastError);
      continue; // e.g. model name not available: try the next one
    }

    const data = await r.json();
    const parts = (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) || [];
    const audioPart = parts.find((p) => p.inlineData && p.inlineData.data);
    if (!audioPart) { lastError = `${model}: no audio in response`; continue; }

    const mime = (audioPart.inlineData.mimeType || '').toLowerCase();
    const bytes = Buffer.from(audioPart.inlineData.data, 'base64');
    let body = bytes;
    let type = mime;
    if (!/wav|mpeg|mp3|ogg|webm|aac|mp4/.test(mime)) {
      const rate = Number((mime.match(/rate=(\d+)/) || [])[1]) || 24000;
      body = pcmToWav(bytes, rate);
      type = 'audio/wav';
    }

    res.setHeader('Content-Type', type);
    res.setHeader('Content-Length', body.length);
    // The fingerprint in the URL changes whenever the text does, so the recording can be cached for good.
    res.setHeader('Cache-Control', 'public, max-age=31536000, s-maxage=31536000, immutable');
    res.setHeader('X-James-Model', model);
    return res.status(200).send(body);
  }

  return fail(res, 502, 'Gemini could not produce audio.', lastError);
};
