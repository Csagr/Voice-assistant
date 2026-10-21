/*
 * James, a voice assistant for Christopher Sagris.
 * What James knows and says lives in answers.js.
 * Listening: the browser's speech recognition (Chrome, Edge, Safari).
 * Speaking:  a natural Gemini voice through /api/tts on Vercel,
 *            falling back to the browser's own voice if that's unavailable.
 */
(() => {
  'use strict';

  const J = window.JAMES;
  const NATURAL = 'natural'; // value of the voice menu option for the Gemini voice

  /* ---------- Matching ---------- */
  const normalize = (s) => s.toLowerCase().replace(/[’']/g, ' ').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

  function score(keys, norm, tokens) {
    let total = 0;
    const padded = ` ${norm} `;
    for (const key of keys) {
      if (key.includes(' ')) {
        if (padded.includes(` ${key} `)) total += 3;
      } else if (key.endsWith('*')) {
        const stem = key.slice(0, -1);
        if (tokens.some((t) => t.startsWith(stem))) total += 1;
      } else if (tokens.includes(key)) total += 1;
    }
    return total;
  }

  function best(intents, norm, tokens) {
    let top = null, topScore = 0;
    for (const intent of intents) {
      const s = score(intent.keys, norm, tokens);
      if (s > topScore) { top = intent; topScore = s; }
    }
    return top;
  }

  let lastId = null;
  let moreUsed = false;

  // Returns the id of the line James should say.
  function respond(question) {
    const norm = normalize(question);
    const tokens = norm.split(' ').filter(Boolean);

    let intent = best(J.TOPICS, norm, tokens);
    if (!intent) {
      const wantsMore = score(J.MORE_KEYS, norm, tokens) > 0 && tokens.length <= 5;
      if (wantsMore && lastId) {
        if (!moreUsed && J.lineById(`${lastId}.more`)) { moreUsed = true; return `${lastId}.more`; }
        return 'nomore';
      }
      intent = best([J.ABOUT], norm, tokens) || best(J.SOCIAL, norm, tokens);
    }
    if (!intent) return 'fallback';

    lastId = intent.id;
    moreUsed = false;
    return intent.id;
  }

  /* ---------- Elements ---------- */
  const $ = (id) => document.getElementById(id);
  const orb = $('orb');
  const statusEl = $('status');
  const heardEl = $('heard');
  const replyEl = $('reply');
  const form = $('ask');
  const input = $('question');
  const log = $('log');
  const voiceSelect = $('voice');

  $('email-link').href = `mailto:${J.PROFILE.email}`;
  $('email-link').textContent = J.PROFILE.email;

  const STATUS = {
    idle: 'Tap the button and ask a question',
    listening: 'Listening…',
    thinking: 'James is about to answer…',
    speaking: 'James is speaking. Tap to stop.',
  };

  const LABEL = {
    idle: 'Start talking to James',
    listening: 'Stop listening',
    thinking: 'Stop James speaking',
    speaking: 'Stop James speaking',
  };

  let state = 'idle';
  function setState(next, message) {
    state = next;
    orb.dataset.state = next === 'thinking' ? 'speaking' : next;
    orb.setAttribute('aria-label', LABEL[next]);
    statusEl.textContent = message || STATUS[next];
  }

  /* ---------- Voices ---------- */
  const synth = window.speechSynthesis;
  const MALE = /\b(guy|david|mark|alex|fred|aaron|eric|roger|andrew|brian|davis|tony|jason|christopher|steffan|evan|nathan|tom|ralph|daniel|male|man)\b/i;
  const FEMALE = /\b(zira|aria|jenny|samantha|victoria|karen|moira|tessa|susan|ava|allison|female|woman|nicky|serena|kate|fiona|emma|michelle|ana|jane|sara|nancy|amber|ashley|cora|elizabeth|monica|libby|sonia|joanna|salli|kimberly|ivy|kendra|catherine)\b/i;
  const STORE_KEY = 'james-voice';
  const BROWSER_VOICE = { pitch: 0.78, rate: 0.95, lang: 'en-US' };

  let browserVoices = [];
  let choice = NATURAL;     // NATURAL or a browser voice name
  let naturalWorks = true;  // set to false for this visit if the Gemini voice keeps failing

  try { choice = localStorage.getItem(STORE_KEY) || NATURAL; } catch (e) { /* storage unavailable */ }

  function rateVoice(v) {
    let s = 0;
    const lang = (v.lang || '').replace('_', '-').toLowerCase();
    if (lang === 'en-us') s += 30;
    else if (lang.startsWith('en')) s += 8;
    else return -999;
    if (MALE.test(v.name)) s += 25;
    if (FEMALE.test(v.name)) s -= 40;
    if (/natural|neural|online|premium|enhanced/i.test(v.name)) s += 10;
    if (/google us english/i.test(v.name)) s -= 15;
    if (/daniel/i.test(v.name) && lang !== 'en-us') s -= 5;
    return s;
  }

  function buildVoiceMenu() {
    if (synth) {
      browserVoices = synth.getVoices().filter((v) => rateVoice(v) > -999).sort((a, b) => rateVoice(b) - rateVoice(a));
    }
    voiceSelect.innerHTML = '';
    const natural = document.createElement('option');
    natural.value = NATURAL;
    natural.textContent = 'James (natural voice)';
    voiceSelect.appendChild(natural);

    if (browserVoices.length) {
      const group = document.createElement('optgroup');
      group.label = 'Browser voices';
      browserVoices.forEach((v) => {
        const opt = document.createElement('option');
        opt.value = v.name;
        opt.textContent = `${v.name.replace(/^Microsoft |^Google /, '').replace(/ - English \(.*\)$/, '')} (${v.lang})`;
        group.appendChild(opt);
      });
      voiceSelect.appendChild(group);
    }
    if (choice !== NATURAL && !browserVoices.some((v) => v.name === choice)) choice = NATURAL;
    voiceSelect.value = choice;
  }

  buildVoiceMenu();
  if (synth && typeof synth.onvoiceschanged !== 'undefined') synth.onvoiceschanged = buildVoiceMenu;

  voiceSelect.addEventListener('change', () => {
    choice = voiceSelect.value;
    if (choice === NATURAL) naturalWorks = true;
    try { localStorage.setItem(STORE_KEY, choice); } catch (e) { /* storage unavailable */ }
    unlockAudio();
    say('voicetest');
  });

  /* ---------- Speaking ---------- */
  const audio = new Audio();
  audio.preload = 'auto';
  let audioUnlocked = false;
  let speakToken = 0;
  let fallbackTimer = null;

  // Some mobile browsers only allow audio that starts during a tap, so prime the player on the first one.
  const SILENCE = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=';
  function unlockAudio() {
    if (audioUnlocked) return;
    audioUnlocked = true;
    audio.src = SILENCE;
    audio.play().catch(() => {});
  }

  function bestBrowserVoice() {
    if (choice !== NATURAL) return browserVoices.find((v) => v.name === choice) || browserVoices[0] || null;
    return browserVoices[0] || null;
  }

  function speakWithBrowser(text, token) {
    if (!synth) { setState('idle'); return; }
    synth.cancel();
    const chunks = (text.match(/[^.!?:;]+[.!?:;]*/g) || [text]).map((p) => p.trim()).filter(Boolean);
    let remaining = chunks.length;
    const voice = bestBrowserVoice();
    setState('speaking');
    chunks.forEach((chunk) => {
      const u = new SpeechSynthesisUtterance(chunk);
      if (voice) u.voice = voice;
      u.lang = BROWSER_VOICE.lang;
      u.pitch = BROWSER_VOICE.pitch;
      u.rate = BROWSER_VOICE.rate;
      const done = () => {
        remaining -= 1;
        if (remaining <= 0 && token === speakToken && state === 'speaking') setState('idle');
      };
      u.onend = done;
      u.onerror = done;
      synth.speak(u);
    });
  }

  function speakNatural(id, text, token) {
    clearTimeout(fallbackTimer);
    const fallBack = () => {
      if (token !== speakToken) return;
      clearTimeout(fallbackTimer);
      audio.pause();
      naturalWorks = false; // don't keep waiting on a voice that isn't answering
      speakWithBrowser(text, token);
    };

    audio.onplaying = () => { if (token === speakToken) { clearTimeout(fallbackTimer); setState('speaking'); } };
    audio.onended = () => { if (token === speakToken) setState('idle'); };
    audio.onerror = fallBack;

    setState('thinking');
    audio.src = `/api/tts?id=${encodeURIComponent(id)}&v=${J.hash(text)}`;
    audio.play().catch((err) => {
      if (err && err.name === 'NotAllowedError') fallBack();
    });
    // The first time a line is spoken, Gemini needs a few seconds to record it.
    fallbackTimer = setTimeout(fallBack, 20000);
  }

  function say(id) {
    const text = J.speechById(id);
    if (!text) return;
    stopSpeaking(true);
    const token = ++speakToken;
    if (choice === NATURAL && naturalWorks) speakNatural(id, text, token);
    else speakWithBrowser(text, token);
  }

  function stopSpeaking(silent) {
    speakToken += 1;
    clearTimeout(fallbackTimer);
    audio.pause();
    if (synth) synth.cancel();
    if (!silent) setState('idle');
  }

  /* ---------- Conversation ---------- */
  function addToLog(who, text, html) {
    const empty = log.querySelector('.empty');
    if (empty) empty.remove();
    const li = document.createElement('li');
    const name = document.createElement('span');
    name.className = 'who';
    name.textContent = who;
    const body = document.createElement('span');
    if (html) body.innerHTML = text; else body.textContent = text;
    li.append(name, body);
    log.appendChild(li);
  }

  function ask(question) {
    const q = question.trim();
    if (!q) return;
    heardEl.hidden = false;
    heardEl.textContent = `“${q}”`;

    const id = respond(q);
    const line = J.lineById(id);
    if (line.html) replyEl.innerHTML = line.text; else replyEl.textContent = line.text;

    addToLog('You', q);
    addToLog('James', line.text, line.html);
    say(id);
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    unlockAudio();
    ask(input.value);
    input.value = '';
  });

  document.querySelectorAll('.prompt').forEach((btn) => {
    btn.addEventListener('click', () => { unlockAudio(); ask(btn.textContent); });
  });

  /* ---------- Listening ---------- */
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  let recognizer = null;
  let finalText = '';

  if (Recognition) {
    recognizer = new Recognition();
    recognizer.lang = 'en-US';
    recognizer.interimResults = true;
    recognizer.continuous = false;
    recognizer.maxAlternatives = 1;

    recognizer.onresult = (event) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) finalText += res[0].transcript;
        else interim += res[0].transcript;
      }
      heardEl.hidden = false;
      heardEl.textContent = `“${(finalText + interim).trim()}”`;
    };

    recognizer.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setState('idle', 'Microphone access is blocked. Allow it in your browser’s site settings, or type your question below.');
      } else if (event.error === 'no-speech') {
        setState('idle', 'I didn’t hear anything. Tap the button to try again.');
      } else if (event.error === 'audio-capture') {
        setState('idle', 'No microphone was found. Connect one, or type your question below.');
      } else if (event.error !== 'aborted') {
        setState('idle', 'Voice input stopped unexpectedly. Tap to try again, or type your question below.');
      }
    };

    recognizer.onend = () => {
      const text = finalText.trim();
      finalText = '';
      if (state === 'listening') setState('idle');
      if (text) ask(text);
    };
  }

  function startListening() {
    if (!recognizer) {
      setState('idle', 'This browser can’t listen. Use Chrome, Edge or Safari, or type your question below.');
      input.focus();
      return;
    }
    stopSpeaking(true);
    finalText = '';
    try {
      recognizer.start();
      setState('listening');
    } catch (e) {
      recognizer.abort();
      setState('idle');
    }
  }

  orb.addEventListener('click', () => {
    unlockAudio();
    if (state === 'speaking' || state === 'thinking') stopSpeaking();
    else if (state === 'listening') recognizer && recognizer.stop();
    else startListening();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state !== 'idle') {
      if (state === 'listening' && recognizer) recognizer.abort();
      stopSpeaking();
    }
  });

  log.innerHTML = '<li class="empty">Nothing yet. Ask James a question to begin.</li>';
})();
