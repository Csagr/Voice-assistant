/*
 * Everything James knows and says lives in this file.
 * Update it when the CV changes. The page and the Gemini voice function both read it,
 * so text and audio always stay in sync.
 *
 * Keys ending in * match word prefixes ("stud*" matches "study", "studies", "student").
 * Multi-word keys match the whole phrase and count for more.
 * An answer is a string, or a function returning { text, speech, html }.
 * "speech" is how a line should be pronounced, when that differs from the written text.
 */
(function (root) {
  'use strict';

  const PROFILE = {
    name: 'Christopher Sagris',
    email: 'christophersagris5@gmail.com',
    phone: '', // Optional. Fill in (e.g. '+372 5303 0080') to have James share it.
    born: '2005-06-14',
  };

  const ageToday = () => {
    const b = new Date(PROFILE.born + 'T00:00:00Z');
    const n = new Date();
    let a = n.getUTCFullYear() - b.getUTCFullYear();
    if (n.getUTCMonth() < b.getUTCMonth() || (n.getUTCMonth() === b.getUTCMonth() && n.getUTCDate() < b.getUTCDate())) a--;
    return a;
  };

  const spokenEmail = PROFILE.email.replace('@', ' at ').replace(/\./g, ' dot ');
  const spokenPhone = PROFILE.phone.replace(/[^\d+]/g, '').replace('+', 'plus ').split('').join(' ');

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
      moreSpeech: 'He also communicates well in English at an advanced level, with a Cambridge C 1 certificate, and Estonian is his native language.',
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
        const link = `<a href="mailto:${PROFILE.email}">${PROFILE.email}</a>`;
        return PROFILE.phone
          ? { html: true,
              text: `You can email Christopher at ${link}, or call him at ${PROFILE.phone}.`,
              speech: `You can email Christopher at ${spokenEmail}, or call him at ${spokenPhone}.` }
          : { html: true,
              text: `The best way to reach Christopher is by email, at ${link}.`,
              speech: `The best way to reach Christopher is by email, at ${spokenEmail}. It’s also written at the bottom of this page.` };
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

  const SOCIAL = [
    { id: 'greet', keys: ['hi', 'hello', 'hey', 'good morning', 'good afternoon', 'good evening', 'greetings', 'howdy'],
      answer: 'Hello. I’m James, Christopher Sagris’s voice assistant. What would you like to know about him?' },
    { id: 'thanks', keys: ['thank*', 'thx', 'appreciat*', 'great', 'awesome', 'perfect', 'cool', 'nice'],
      answer: 'You’re welcome. If you’d like to talk with Christopher himself, his email is at the bottom of the page.' },
    { id: 'bye', keys: ['bye', 'goodbye', 'see you', 'that s all', 'thats all', 'farewell'],
      answer: 'Thanks for stopping by. Have a good day.' },
  ];

  const MORE_KEYS = ['more', 'tell me more', 'elaborate', 'go on', 'continue', 'details', 'detail', 'expand', 'and'];

  // Fixed lines that aren't tied to a topic.
  const LINES = {
    fallback: 'I don’t have that information. I only know what’s in Christopher’s CV. Try asking about his education, his work, his languages, or the internship he’s looking for.',
    nomore: 'That’s everything I have on that. You could ask about his education, his work, or the role he’s looking for.',
    voicetest: 'Hello, I’m James. This is how I sound now.',
  };

  const ALL = [...TOPICS, ABOUT, ...SOCIAL];

  // Returns { text, speech, html } for an intent.
  function resolve(intent) {
    const a = typeof intent.answer === 'function' ? intent.answer() : intent.answer;
    if (typeof a === 'string') return { text: a, speech: intent.speech || a, html: false };
    return { text: a.text, speech: a.speech || a.text, html: !!a.html };
  }

  const stripTags = (s) => s.replace(/<[^>]+>/g, '');

  // Ids look like "education", "education.more", or a key of LINES.
  function lineById(id) {
    if (typeof id !== 'string') return null;
    if (Object.prototype.hasOwnProperty.call(LINES, id)) {
      return { text: LINES[id], speech: LINES[id], html: false };
    }
    const [intentId, part] = id.split('.');
    const intent = ALL.find((i) => i.id === intentId);
    if (!intent) return null;
    if (part === 'more') {
      if (!intent.more) return null;
      return { text: intent.more, speech: intent.moreSpeech || intent.more, html: false };
    }
    if (part) return null;
    return resolve(intent);
  }

  function speechById(id) {
    const line = lineById(id);
    return line ? stripTags(line.speech) : null;
  }

  // Short fingerprint of a line, so cached audio is replaced when the text changes.
  function hash(s) {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193) >>> 0;
    }
    return h.toString(36);
  }

  const JAMES = { PROFILE, TOPICS, ABOUT, SOCIAL, MORE_KEYS, LINES, lineById, speechById, hash };

  if (typeof module !== 'undefined' && module.exports) module.exports = JAMES;
  else root.JAMES = JAMES;
})(typeof window !== 'undefined' ? window : globalThis);
