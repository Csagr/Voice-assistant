/*
 * James, a voice assistant for Christopher Sagris.
 * Runs entirely in the browser (no server, no API keys), so it works on GitHub Pages.
 * Listening:  Web Speech API SpeechRecognition (Chrome, Edge, Safari).
 * Speaking:   speechSynthesis, preferring a male en-US voice with a lowered pitch.
 */
(() => {
  'use strict';

  /* ---------- Facts from the CV (edit here) ---------- */
  const PROFILE = {
    name: 'Christopher Sagris',
    email: 'christophersagris5@gmail.com',
    phone: '', // Optional. Fill in (e.g. '+372 5303 0080') to have James share it.
    born: '2005-06-14',
  };

  const VOICE_SETTINGS = {
    pitch: 0.78, // below 1 = deeper
    rate: 0.95,  // slightly unhurried
    lang: 'en-US',
  };

  /* ---------- Helpers ---------- */
  const ageToday = () => {
    const b = new Date(PROFILE.born + 'T00:00:00');
    const n = new Date();
    let a = n.getFullYear() - b.getFullYear();
    if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
    return a;
  };

  const spokenEmail = PROFILE.email.replace('@', ' at ').replace(/\./g, ' dot ');
  const spokenPhone = PROFILE.phone.replace(/[^\d+]/g, '').replace('+', 'plus ').split('').join(' ');

  /*
   * Each intent: keys to match, and an answer.
   * Keys ending in * match word prefixes ("stud*" matches "study", "studies", "student").
   * Multi-word keys match the phrase and count for more.
   * An answer is a string, or { text, speech } when the spoken form should differ.
   */
  const TOPICS = [
    {
      id: 'james',
      keys: ['who are you', 'your name', 'what are you', 'are you real', 'are you ai', 'are you a robot', 'are you human', 'are you christopher', 'james'],
      answer: 'I’m James, a voice assistant built to answer questions about Christopher. I know what’s in his CV, so for anything beyond that, the best thing to do is contact him directly.',
    },
    {
      id: 'education',
      keys: ['stud*', 'school*', 'universit*', 'college', 'degree*', 'bachelor*', 'educat*', 'ebs', 'estonian business school', 'business school', 'international business', 'major*', 'course*', 'class*', 'academic*', 'graduat*'],
      answer: 'Christopher is studying for a bachelor’s degree in International Business Administration at Estonian Business School in Tallinn. He started the program in 2024.',
      more: 'Alongside his degree, he works as a driver and courier, so he’s used to balancing study with a real job. If you’d like, ask me about that work or about the internship he’s looking for.',
    },
    {
      id: 'work',
      keys: ['work*', 'job*', 'employ*', 'courier*', 'driver*', 'deliver*', 'mervir', 'catering', 'experience*', 'occupation', 'do for a living', 'currently do'],
      answer: 'Since September 2024, Christopher has worked as a driver and courier for MERVIR, a catering company in Estonia. He transports meals from the kitchens to the organizations they serve, a job that runs on punctuality and reliability.',
      more: 'He does that job alongside his degree at Estonian Business School. Beyond it, he’s organized club events and sold sneakers online, which is where his entrepreneurial side shows.',
    },
    {
      id: 'ventures',
      keys: ['entrepreneur*', 'business*', 'startup*', 'start up', 'sneaker*', 'shoe*', 'ecommerce', 'e commerce', 'online', 'sell*', 'sold', 'event*', 'club*', 'party', 'parties', 'side project*', 'project*', 'built', 'build', 'own', 'idea*', 'hustle'],
      answer: 'Christopher likes to test ideas and put them into practice. He has organized club events, and he’s run his own e-commerce venture selling sneakers. For him, those projects are about trying something, seeing what works, and learning from it.',
      more: 'He’s not afraid of failure. He sees it as a chance to learn, which is why he keeps starting new things.',
    },
    {
      id: 'accounting',
      keys: ['good at accounting', 'accounting experience', 'accounting skills', 'know accounting', 'experience in accounting', 'experience in banking', 'banking experience', 'excel', 'bookkeeping'],
      answer: 'His CV doesn’t list formal accounting experience yet. That’s exactly why he’s looking for an internship as an accountant or accounting assistant: to build that experience on the job, on top of the business foundation from his studies at Estonian Business School.',
    },
    {
      id: 'strengths',
      keys: ['strength*', 'skill*', 'good at', 'why hire', 'why should', 'hire him', 'qualit*', 'stand out', 'stands out', 'offer', 'bring', 'strong', 'talent*', 'abilit*', 'competen*'],
      answer: 'Three things stand out. He’s entrepreneurial, with real projects behind him, from club events to selling sneakers online. He’s dependable, holding down a courier job alongside his studies. And he’s comfortable with risk: he sees failure as part of learning, so he takes on new challenges instead of avoiding them.',
      more: 'He also communicates well in English at an advanced level, with a Cambridge C1 certificate, and Estonian is his native language.',
    },
    {
      id: 'weakness',
      keys: ['weakness*', 'weak', 'fail*', 'mistake*', 'risk*', 'setback*', 'improve*', 'struggl*', 'challeng*'],
      answer: 'His weaknesses are a fair question to ask him directly. What I can tell you is how he handles setbacks: he’s willing to take risks, he isn’t afraid of failure, and he treats it as a chance to learn.',
    },
    {
      id: 'languages',
      keys: ['language*', 'english', 'estonian', 'speak*', 'fluent*', 'cambridge', 'c1', 'c2', 'russian', 'finnish', 'german', 'spanish', 'french'],
      answer: 'Estonian is Christopher’s native language. His English is advanced: he holds a Cambridge English C1 certificate, and he rates his spoken English and presentation skills at C2, the highest level.',
      speech: 'Estonian is Christopher’s native language. His English is advanced. He holds a Cambridge English C 1 certificate, and he rates his spoken English and presentation skills at C 2, the highest level.',
    },
    {
      id: 'driving',
      keys: ['drive', 'driving', 'licen*', 'driving license', 'driver s license', 'drivers license', 'driving licence', 'car', 'cars', 'vehicle*'],
      answer: 'Yes, he drives. Christopher has held a category B driving license since 2023, and he drives every day in his courier job.',
    },
    {
      id: 'goals',
      keys: ['looking for', 'look*', 'want*', 'seek*', 'goal*', 'intern*', 'role*', 'position*', 'opening*', 'bank*', 'account*', 'finance*', 'financial', 'future', 'plan*', 'aspir*', 'career*', 'ambition*', 'next step'],
      answer: 'Christopher is looking for an internship in banking, ideally as an accountant or accounting assistant. He’s open to full-time or part-time work in Tallinn.',
      more: 'If you have a role like that, the best next step is to email him. You’ll find his address at the bottom of this page.',
    },
    {
      id: 'availability',
      keys: ['full time', 'part time', 'availab*', 'hours', 'schedule', 'when can', 'start date', 'relocat*', 'remote', 'where', 'tallinn', 'based', 'live*', 'locat*', 'city'],
      answer: 'Christopher is based in Tallinn and open to both full-time and part-time internships there.',
    },
    {
      id: 'contact',
      keys: ['contact*', 'email*', 'e mail', 'mail', 'reach', 'phone*', 'call', 'number', 'get in touch', 'linkedin', 'message', 'connect'],
      answer: () => {
        const text = PROFILE.phone
          ? `You can email Christopher at <a href="mailto:${PROFILE.email}">${PROFILE.email}</a>, or call him at ${PROFILE.phone}.`
          : `The best way to reach Christopher is by email, at <a href="mailto:${PROFILE.email}">${PROFILE.email}</a>.`;
        const speech = PROFILE.phone
          ? `You can email Christopher at ${spokenEmail}, or call him at ${spokenPhone}.`
          : `The best way to reach Christopher is by email, at ${spokenEmail}. It’s also written at the bottom of this page.`;
        return { text, speech, html: true };
      },
    },
    {
      id: 'age',
      keys: ['old', 'age', 'born', 'birthday', 'birth*', 'young'],
      answer: () => `Christopher is ${ageToday()}. He was born in 2005.`,
    },
    {
      id: 'help',
      keys: ['help', 'what can i ask', 'what can you', 'what do you know', 'options', 'topics'],
      answer: 'You can ask me about Christopher’s education, his work, his own business projects, his languages, what kind of role he’s looking for, or how to contact him.',
    },
  ];

  // Used only when no topic above matches.
  const ABOUT = {
    id: 'about',
    keys: ['about him', 'about christopher', 'who is', 'tell me about', 'introduce', 'introduction', 'yourself', 'summary', 'background', 'describe', 'personality', 'kind of person', 'christopher', 'him'],
    answer: 'Christopher is an enterprising, curious business student. He’s driven, willing to take risks, and not afraid of failure; he sees it as a chance to learn. He has hands-on experience in delivery work, event organizing and e-commerce, and he’s always looking for new ways to use and grow his skills.',
    more: 'Right now he’s studying International Business Administration at Estonian Business School and looking for an internship in banking or accounting.',
  };

  const MORE_KEYS = ['more', 'tell me more', 'elaborate', 'go on', 'continue', 'details', 'detail', 'expand', 'and'];

  const SOCIAL = [
    { id: 'greet', keys: ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', 'greetings', 'howdy'],
      answer: 'Hello. I’m James, Christopher Sagris’s voice assistant. What would you like to know about him?' },
    { id: 'thanks', keys: ['thank*', 'thx', 'appreciat*', 'great', 'awesome', 'perfect', 'cool', 'nice'],
      answer: 'You’re welcome. If you’d like to talk with Christopher himself, his email is at the bottom of the page.' },
    { id: 'bye', keys: ['bye', 'goodbye', 'see you', 'that s all', 'thats all', 'farewell'],
      answer: 'Thanks for stopping by. Have a good day.' },
  ];

  const FALLBACK = 'I don’t have that information. I only know what’s in Christopher’s CV. Try asking about his education, his work, his languages, or the internship he’s looking for.';

  /* ---------- Matching ---------- */
  const normalize = (s) => s.toLowerCase().replace(/[’']/g, ' ').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();

  function score(intent, norm, tokens) {
    let total = 0;
    const padded = ` ${norm} `;
    for (const key of intent.keys) {
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
      const s = score(intent, norm, tokens);
      if (s > topScore) { top = intent; topScore = s; }
    }
    return top;
  }

  let lastIntent = null;

  function respond(question) {
    const norm = normalize(question);
    const tokens = norm.split(' ').filter(Boolean);

    let intent = best(TOPICS, norm, tokens);
    if (!intent) {
      const wantsMore = score({ keys: MORE_KEYS }, norm, tokens) > 0 && tokens.length <= 5;
      if (wantsMore && lastIntent) {
        const more = lastIntent.more || 'That’s everything I have on that. You could ask about his education, his work, or the role he’s looking for.';
        lastIntent = { ...lastIntent, more: null };
        return { text: more };
      }
      intent = best([ABOUT], norm, tokens) || best(SOCIAL, norm, tokens);
    }
    if (!intent) return { text: FALLBACK };

    lastIntent = intent;
    const a = typeof intent.answer === 'function' ? intent.answer() : intent.answer;
    if (typeof a === 'string') return { text: a, speech: intent.speech };
    return a;
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

  $('email-link').href = `mailto:${PROFILE.email}`;
  $('email-link').textContent = PROFILE.email;

  const STATUS = {
    idle: 'Tap the button and ask a question',
    listening: 'Listening…',
    speaking: 'James is speaking. Tap to stop.',
  };

  const LABEL = {
    idle: 'Start talking to James',
    listening: 'Stop listening',
    speaking: 'Stop James speaking',
  };

  let state = 'idle';
  function setState(next, message) {
    state = next;
    orb.dataset.state = next;
    orb.setAttribute('aria-label', LABEL[next]);
    statusEl.textContent = message || STATUS[next];
  }

  /* ---------- Speaking ---------- */
  const synth = window.speechSynthesis;
  const MALE = /\b(guy|david|mark|alex|fred|aaron|eric|roger|andrew|brian|davis|tony|jason|christopher|steffan|evan|nathan|tom|ralph|daniel|male|man)\b/i;
  const FEMALE = /\b(zira|aria|jenny|samantha|victoria|karen|moira|tessa|susan|ava|allison|female|woman|nicky|serena|kate|fiona|emma|michelle|ana|jane|sara|nancy|amber|ashley|cora|elizabeth|monica|libby|sonia|joanna|salli|kimberly|ivy|kendra|catherine)\b/i;
  const STORE_KEY = 'james-voice';

  let voices = [];
  let chosenVoice = null;

  function rateVoice(v) {
    let s = 0;
    const lang = (v.lang || '').replace('_', '-').toLowerCase();
    if (lang === 'en-us') s += 30;
    else if (lang.startsWith('en')) s += 8;
    else return -999;
    if (MALE.test(v.name)) s += 25;
    if (FEMALE.test(v.name)) s -= 40;
    if (/natural|neural|online|premium|enhanced/i.test(v.name)) s += 10;
    if (/google us english/i.test(v.name)) s -= 15; // this one is a female voice
    if (/daniel/i.test(v.name) && lang !== 'en-us') s -= 5; // British male
    return s;
  }

  function loadVoices() {
    if (!synth) return;
    const all = synth.getVoices();
    if (!all.length) return;
    voices = all.filter((v) => rateVoice(v) > -999).sort((a, b) => rateVoice(b) - rateVoice(a));

    let saved = null;
    try { saved = localStorage.getItem(STORE_KEY); } catch (e) { /* storage unavailable */ }
    chosenVoice = voices.find((v) => v.name === saved) || voices[0] || null;

    voiceSelect.innerHTML = '';
    voices.forEach((v) => {
      const opt = document.createElement('option');
      opt.value = v.name;
      opt.textContent = `${v.name.replace(/^Microsoft |^Google /, '').replace(/ - English \(.*\)$/, '')} (${v.lang})`;
      if (chosenVoice && v.name === chosenVoice.name) opt.selected = true;
      voiceSelect.appendChild(opt);
    });
  }

  if (synth) {
    loadVoices();
    if (typeof synth.onvoiceschanged !== 'undefined') synth.onvoiceschanged = loadVoices;
  } else {
    voiceSelect.closest('.voice-pick').hidden = true;
  }

  voiceSelect.addEventListener('change', () => {
    chosenVoice = voices.find((v) => v.name === voiceSelect.value) || chosenVoice;
    try { localStorage.setItem(STORE_KEY, voiceSelect.value); } catch (e) { /* storage unavailable */ }
    speak('Hello, I’m James. This is how I sound now.');
  });

  function speak(text) {
    if (!synth) { setState('idle'); return; }
    synth.cancel();
    // Chrome cuts off long utterances, so speak sentence by sentence.
    const parts = text.replace(/<[^>]+>/g, '').match(/[^.!?:;]+[.!?:;]*/g) || [text];
    const chunks = parts.map((p) => p.trim()).filter(Boolean);
    let remaining = chunks.length;

    setState('speaking');
    chunks.forEach((chunk) => {
      const u = new SpeechSynthesisUtterance(chunk);
      if (chosenVoice) u.voice = chosenVoice;
      u.lang = VOICE_SETTINGS.lang;
      u.pitch = VOICE_SETTINGS.pitch;
      u.rate = VOICE_SETTINGS.rate;
      const done = () => { remaining -= 1; if (remaining <= 0 && state === 'speaking') setState('idle'); };
      u.onend = done;
      u.onerror = done;
      synth.speak(u);
    });
  }

  function stopSpeaking() {
    if (synth) synth.cancel();
    setState('idle');
  }

  /* ---------- Conversation ---------- */
  function addToLog(who, text, html) {
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

    const r = respond(q);
    if (r.html) replyEl.innerHTML = r.text; else replyEl.textContent = r.text;

    addToLog('You', q);
    addToLog('James', r.text, r.html);
    speak(r.speech || r.text);
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    ask(input.value);
    input.value = '';
  });

  document.querySelectorAll('.prompt').forEach((btn) => {
    btn.addEventListener('click', () => ask(btn.textContent));
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
    if (synth) synth.cancel();
    finalText = '';
    try {
      recognizer.start();
      setState('listening');
    } catch (e) {
      // start() throws if a session is already running
      recognizer.abort();
      setState('idle');
    }
  }

  orb.addEventListener('click', () => {
    if (state === 'speaking') stopSpeaking();
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
  const clearEmpty = new MutationObserver(() => {
    const empty = log.querySelector('.empty');
    if (empty && log.children.length > 1) { empty.remove(); clearEmpty.disconnect(); }
  });
  clearEmpty.observe(log, { childList: true });
})();
