# James, a voice assistant for Christopher Sagris

Visitors ask James about Christopher out loud or by typing. James answers from Christopher's CV in a natural Gemini voice, and falls back to the browser's own voice if Gemini is unavailable.

## Files
- `index.html`: the page
- `style.css`: cream background, Newsreader serif type
- `answers.js`: everything James knows and says. Update this when the CV changes.
- `script.js`: listening, matching questions to answers, playing the voice
- `api/tts.js`: Vercel function that gets James's voice from Gemini and keeps the API key secret
- `vercel.json`: gives the voice function enough time to run

## Gemini voice setup (Vercel)
1. In Vercel, open the project → Settings → Environment Variables.
2. Add `GEMINI_API_KEY` with your key from Google AI Studio. Tick Production, Preview and Development, then save.
3. Go to Deployments, open the menu (⋯) on the latest one and choose Redeploy, so the key is picked up.

Optional variables:
- `GEMINI_VOICE`: another Gemini voice name (default `Charon`)
- `GEMINI_STYLE`: how James should sound, as an instruction (set to `none` to turn it off)
- `GEMINI_TTS_MODEL`: Gemini model(s) to use, comma-separated, tried in order

Each answer is recorded by Gemini once and then cached by Vercel, so the free tier goes a long way. When you change an answer's text, only that answer is recorded again.

## Never put the API key in the code
The key belongs only in Vercel's Environment Variables. Anything in `index.html`, `script.js` or `answers.js` is public.
