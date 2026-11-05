# Polylog — System Design

A personal, phone-first language-learning web app. Primary goal: take a total beginner to **CEFR B1 in German**. Secondary goal: the architecture must support adding other languages later without changing the core.

> **Name.** "Polylog" (Greek: *many-voiced conversation*) is a working name. Renaming it means editing the visible labels (page title, PWA manifest, Settings footer, backup file name, log prefix). The IndexedDB name `polylog` in `src/services/storage/db.ts` should stay as it is, because changing it would orphan progress already saved on the phone.

---

## 1. Goals and non-goals

### Goals

1. Get the learner from zero to **B1** across all four skills: reading, listening, writing, and **speaking/pronunciation**.
2. Run as a **static site on GitHub Pages**, installable on an **iPhone 14 Pro Max** as a home-screen app (PWA) that works offline.
3. Make **pronunciation first-class**. Every target-language word and sentence can be heard, slowed down, shadowed, and (later) spoken and checked.
4. Use **spaced repetition (FSRS)** so vocabulary actually sticks.
5. Add optional **AI features** (writing feedback, conversation practice, speech-to-text) served by a **companion service on the user's Intel MacBook** (Ollama + Whisper). The app must stay fully usable when the Mac is off.
6. Be **language-agnostic in the core**. A new language is a *language pack* plus a *course folder*, with no edits to the lesson player, grading, SRS, or storage.

### Non-goals (for now)

- Multiple users, accounts, or cloud sync. Progress lives on the device, with JSON export/import as backup.
- A translated UI. The interface is English. Course content carries its own base-language translations, so the UI can be localised later without touching course data.
- Phoneme-level pronunciation scoring. Free tools cannot do this reliably. We check *intelligibility* (did a recogniser hear the right words?) and rely on shadowing for accent.
- Server-side anything on GitHub Pages.

---

## 2. Constraints and their consequences

| Constraint | Consequence |
|---|---|
| GitHub Pages serves static files only | No backend. All state is in the browser (IndexedDB). Content ships as JSON in the build. |
| GitHub Pages has no SPA fallback routing | Use **hash routing** (`#/lesson/...`). |
| Repo name decides the URL path | Vite `base: './'` (relative), so the build works under any repo name. |
| iPhone / iOS Safari | Install to home screen (exempt from Safari's 7-day storage eviction). Audio must start from a user tap. Respect safe-area insets (Dynamic Island, home indicator). |
| HTTPS page cannot call `http://` LAN addresses (mixed content) | The Mac companion is exposed over **HTTPS via Tailscale Serve**, never as a raw LAN IP. |
| Intel MacBook, 32 GB RAM, no Apple-Silicon GPU | Ollama and Whisper run on the CPU, so they are slow. AI features must be asynchronous, streamed, and optional. Use smaller models for chat and larger ones for feedback. |
| Local 8B LLMs make grammar mistakes | The LLM is **never the authority**. Curriculum and grading are pre-authored and deterministic. LLM output is labelled advisory and cross-checked against the course dictionary. |

---

## 3. High-level architecture

```
┌──────────────────────── iPhone (Safari / home-screen PWA) ─────────────────────────┐
│                                                                                    │
│  UI (React)  ──►  Domain logic (pure TS)  ──►  Services                            │
│  screens,         grading, SRS scheduling,     content repository (bundled JSON)   │
│  exercises        lesson session, XP/streak    storage (Dexie / IndexedDB)         │
│                                                speech (pre-generated audio → TTS)  │
│                   Language packs (de, …)       recorder (MediaRecorder)            │
│                                                companion client (optional) ──┐     │
└──────────────────────────────────────────────────────────────────────────────┼─────┘
                                                                               │ HTTPS
                       static files ▲                                          │ (Tailscale)
                                    │                                          ▼
                  ┌─────────────────┴──────┐          ┌──────── MacBook (phase 4) ────────┐
                  │ GitHub Pages           │          │ Companion API (FastAPI)           │
                  │ built by GitHub Actions│          │  /transcribe → faster-whisper     │
                  └────────────────────────┘          │  /feedback, /chat → Ollama        │
                                                      └───────────────────────────────────┘
```

Layering rules:

- **`domain/`** is pure TypeScript: no React, no browser APIs, no IndexedDB. Everything that can be unit-tested lives here.
- **`services/`** wraps browser APIs and storage behind small interfaces. The domain depends on interfaces, not on Dexie or `speechSynthesis` directly.
- **`ui/`** renders state and forwards user intent. Screens are thin.
- **`languages/`** holds everything language-specific. The core never contains `if (lang === 'de')`.

---

## 4. Tech stack

| Concern | Choice | Why |
|---|---|---|
| Build | **Vite** + **TypeScript** (strict) | Fast, simple static output |
| UI | **React 19** + **React Router 7** (`HashRouter`) | Mainstream, good PWA story |
| Styling | Plain CSS with design tokens (CSS custom properties) | No framework lock-in. Light and dark themes for free. |
| Storage | **Dexie** (IndexedDB) + `dexie-react-hooks` | Typed tables, schema migrations, live queries |
| Spaced repetition | **ts-fsrs** | Maintained FSRS implementation |
| PWA | **vite-plugin-pwa** (Workbox) | Precache app + content; runtime-cache audio |
| Tests | **Vitest** + `fake-indexeddb` | Same config as Vite; storage code tested unmocked |
| CI/CD | **GitHub Actions** → GitHub Pages | Test, build, deploy on push to `main` |
| TTS (phase 2) | **Piper** (offline neural TTS) run on the Mac at authoring time | Natural audio, free, consistent across devices |
| Companion (phase 4) | **FastAPI** + **faster-whisper** + **Ollama** | Matches the user's Python/FastAPI conventions |

No external fonts or CDNs. The app uses the system font stack (SF Pro on iPhone) so it works fully offline.

---

## 5. Multi-language design

Two concepts make the app language-agnostic.

### 5.1 Language pack (code)

A language pack describes *how a language behaves*. It is the only place language-specific logic is allowed.

```ts
interface LanguagePack {
  code: LanguageCode;              // 'de'
  name: string;                    // 'German'
  nativeName: string;              // 'Deutsch'
  speechLocale: string;            // 'de-DE' (TTS + speech recognition)
  direction: TextDirection;        // LTR | RTL
  specialCharacters: string[];     // ['ä','ö','ü','ß'] → on-screen key row
  characterFolds: Record<string, string>; // ä→ae … used to detect "ae instead of ä"
  genders: GenderDefinition[];     // [{code:'m', article:'der', label:'masculine', colorToken:'gender-m'}, …]
  strictWords: string[];           // articles/pronouns that are never typo-tolerated
  formatNoun(noun: VocabItem): string;      // 'der Tisch'
  tokenize(sentence: string): string[];     // for word-order tiles
}
```

- Languages without grammatical gender use `genders: []`.
- Languages with elision (French *l'école*) override `formatNoun`.
- Languages without spaces (Japanese, Chinese) override `tokenize`.
- Non-Latin scripts use the optional `romanization` field on vocab items.

Packs are registered in `src/languages/registry.ts`. Adding French means adding `src/languages/fr/index.ts` and one registry line (Open/Closed principle).

### 5.2 Course (data)

A course is a **(target language, base language) pair**, for example `de-en` (learn German from English). Courses are folders of JSON under `content/courses/<courseId>/`. All progress, SRS cards, and audio are keyed by `courseId`, so several courses can coexist on one device. The active course is a setting.

---

## 6. Content model

All content is JSON validated against TypeScript types and an automated integrity test (§6.4).

### 6.1 Files

```
content/courses/de-en/
├── course.json            # metadata + ordered unit list grouped by CEFR level
└── units/
    ├── 00-sounds.json     # one file per unit: vocab, grammar notes, lessons
    ├── 01-hallo.json
    └── …
```

Units are loaded lazily with `import.meta.glob`, so each unit becomes its own small chunk that the service worker caches.

### 6.2 Types (abridged)

```ts
Course   { id, targetLanguage, baseLanguage, title, description,
           greetings: { morning, afternoon, evening },   // target-language greetings for the Today screen
           levels: { level: CefrLevel, unitIds: string[] }[] }

Unit     { id, level: CefrLevel, title, description, icon,
           vocab: VocabItem[], grammarNotes: GrammarNote[], lessons: Lesson[] }

VocabItem { id, text, translations: string[], partOfSpeech: PartOfSpeech,
            gender?: string, plural?: string, pronunciation?: string,   // 'MAYD-khen'
            romanization?: string, example?: { text, translation } }

GrammarNote { id, title, body /* light markdown */, table?: string[][] }

Lesson   { id, title, kind: LessonKind, introduces: string[] /* vocab ids */, exercises: Exercise[] }
```

### 6.3 Exercise types

All exercise types are a discriminated union on `type` (`ExerciseType` enum). Each type has one renderer component and one grading function, so a new type touches neither the player nor the other types.

| Type | What the learner does | Grading |
|---|---|---|
| `TEACH` | Reads an explanation card with tappable audio examples | none |
| `MULTIPLE_CHOICE` | Picks the right option for a prompt | index match |
| `MATCH_PAIRS` | Matches target ↔ base words | all pairs matched |
| `TRANSLATE` | Types a translation (either direction) | answer checker (§7) |
| `WORD_ORDER` | Builds a sentence from word tiles | exact token sequence |
| `CLOZE` | Fills a gap (article, ending, verb form) | answer checker, **strict** |
| `LISTEN_CHOOSE` | Hears audio, picks what was said (minimal pairs) | index match |
| `LISTEN_TYPE` | Dictation: hears audio, types it | answer checker |
| `SHADOW` | Listens, records themselves, compares playback | self-assessed |
| `SPEAK` (phase 2) | Says the sentence; recogniser transcribes it | word overlap with target |

### 6.4 Content validation

`tests/content/courseIntegrity.test.ts` runs over every course on every CI build and fails the build if:

- ids are not unique (units, lessons, vocab, notes)
- a lesson's `introduces` references unknown vocab
- a multiple-choice `answerIndex` is out of range
- a `WORD_ORDER` tile sequence does not tokenize from its own answer
- a noun's `gender` is not defined in the language pack
- a unit in `course.json` has no file, or a file is not listed

### 6.5 Authoring workflow

1. Claude drafts a unit following the curriculum map (§13), using the schema.
2. The integrity test validates it.
3. The learner (and optionally a native speaker) reviews it. German sentences are kept short and checked against reliable references (Duden for genders/plurals).
4. Phase 2: run the audio generator for new sentences.

---

## 7. Answer checking

`checkAnswer({ given, accepted, languagePack, strict })` returns `{ result: AnswerResult, note?: AnswerNote, bestMatch }`.

Steps, applied against every accepted answer, best result wins:

1. **Normalise**: trim, collapse whitespace, unify quotes/apostrophes, strip trailing sentence punctuation.
2. Exact match → `CORRECT`.
3. Match ignoring case → `ALMOST` + `CAPITALIZATION` (in German, nouns are capitalised).
4. Match after applying the pack's `characterFolds` to both sides (`ae`↔`ä`) → `ALMOST` + `SPECIAL_CHARACTER`.
5. **Typo tolerance** (skipped when `strict`): same word count, and every differing word has edit distance 1, is ≥ 4 letters long, is not in `strictWords`, and the edit is not inside the last `inflectedEndingLength` letters (2 for German) → `ALMOST` + `TYPO`.
6. Otherwise `WRONG`, showing the closest accepted answer.

Why the strict rules: *den* vs *dem*, *gute* vs *guten* or *wohne* vs *wohnt* are one letter apart but are exactly the grammar being learned. `CLOZE` exercises are always strict, and articles and pronouns are never typo-tolerated.

`ALMOST` counts as correct in lessons but is rated **Hard** in SRS.

---

## 8. Spaced repetition

- When a lesson is completed, each vocab item in `introduces` creates cards:
  - `RECOGNIZE`: see/hear target → recall meaning (flip card, self-rated)
  - `PRODUCE`: see meaning → type target (auto-graded)
  - `GENDER` (nouns, when the pack has genders): pick the article
- Card id: `<courseId>:<vocabId>:<cardType>`.
- Scheduling uses **FSRS** via `ts-fsrs`, wrapped in `domain/srs/scheduler.ts` so the library can be swapped.
- Rating mapping for auto-graded cards: `WRONG` → Again, `ALMOST` → Hard, `CORRECT` → Good. Self-rated cards expose all four buttons.
- The Review screen serves due cards, oldest due first, capped by a daily review limit (default 100) and a new-card limit (default 20/day).

---

## 9. Audio and pronunciation

### 9.1 The app speaks

`SpeechService.speak({ text, rate })` resolves audio in order:

1. **Pre-generated clip** (phase 2): looks up `audio/<courseId>/manifest.json`, keyed by a hash of the normalised text, and plays the file.
2. **Device TTS** fallback: `speechSynthesis` with the pack's `speechLocale`. Prefers voices named *Enhanced*/*Premium*.

Slow mode uses `rate ≈ 0.6` for TTS (or `playbackRate` for clips). Every target-language string in the UI is rendered by a `<Speakable>` component that adds the 🔊 / 🐢 buttons. Audio auto-plays after an answer is checked.

**iPhone setup (one-off):** Settings → Accessibility → Spoken Content → Voices → German → download an *Enhanced* or *Premium* voice. The Settings screen has a voice picker and a test button.

### 9.2 Pre-generated audio pipeline (phase 2)

`tools/generate_audio.py` (runs on the Mac):

1. Collects every target-language string in a course (vocab, examples, exercise sentences).
2. Hashes each one and skips those already generated.
3. Synthesises with **Piper** (German voice, licence checked per voice), then encodes to **MP3** (universally supported on iOS).
4. Writes `public/audio/<courseId>/<hash>.mp3` and `manifest.json`.

Estimated size is 50–100 MB for the full B1 course. Clips are **runtime-cached** (cache-first) rather than precached, so they download per unit as needed.

### 9.3 The learner speaks

| Level | Feature | Tech | Phase |
|---|---|---|---|
| 1 | **Shadowing**: listen → record → play yours and the native audio back to back | `MediaRecorder` (iOS gives `audio/mp4`) | 1 |
| 2 | **Speak the answer**: on-device recognition, word-by-word comparison | `webkitSpeechRecognition` (feature-detected; unreliable in iOS home-screen mode) | 2 |
| 3 | **Whisper check**: send the recording to the Mac, get a transcript, compare | Companion `/transcribe` | 4 |

Comparison is a word-level alignment between transcript and target, highlighting missing or misheard words. The UI calls this "how well you were understood", not a pronunciation score.

### 9.4 Pronunciation content

- **Unit 0 (Sounds of German)**: one teach card per sound, with minimal-pair listening drills and shadowing.
  - vowels: long/short, umlauts ä ö ü
  - *ch* (ich-Laut / ach-Laut), *r*, *z* = /ts/, *w* = /v/, *v* = /f/, *s* + vowel = /z/
  - *sp/st* at word start = /ʃp ʃt/
  - *ei* vs *ie*, *eu/äu*
  - final devoicing (*Tag* → /k/)
  - word stress
- Every vocab card can carry a learner-friendly respelling (`pronunciation`) and highlights the stressed syllable.
- Minimal-pair `LISTEN_CHOOSE` drills recur throughout A1–A2 (*schon/schön*, *Mutter/Mütter*, *fühlen/füllen*, *Staat/Stadt*).

---

## 10. Storage (Dexie / IndexedDB)

| Table | Key | Contents |
|---|---|---|
| `settings` | `key` | active course, daily goal, speech rate, voice, companion URL/token, unlock-all flag |
| `lessonProgress` | `[courseId+lessonId]` | first/last completed, best accuracy, times completed |
| `cards` | `id` | FSRS state (`due`, `stability`, `difficulty`, `reps`, `lapses`, `state`, `lastReview`) + course/vocab/type |
| `reviewLogs` | auto | card id, rating, reviewed at (for stats and future FSRS optimisation) |
| `dailyActivity` | `[courseId+date]` | XP, lessons completed, reviews done |

- Schema changes go through Dexie `version(n).upgrade(...)`, never by editing an old version.
- On first launch the app calls `navigator.storage.persist()`.
- **Backup:** Settings → *Export progress* downloads a JSON file. *Import* restores it. A gentle reminder appears if there's been no export for 14 days.

---

## 11. Screens and navigation

Bottom tab bar (thumb reach), with routes in parentheses:

| Tab | Route | Phase |
|---|---|---|
| Today | `#/` | 1 |
| Path | `#/path` | 1 |
| Review | `#/review` | 1 |
| Read | `#/read` | 3 |
| Settings | `#/settings` | 1 |

Full-screen routes (tab bar hidden): `#/lesson/:unitId/:lessonId`, `#/unit/:unitId/notes`, `#/review/session`.

### Today

```
┌─────────────────────────────────┐
│ Guten Tag!        🔥 4    A1 ▓░░ │
│                                 │
│ ① Review        12 due    ▶     │
│ ② Next lesson   Unit 1 · L2  ▶  │
│ ③ Shadowing     5 sentences ▶   │
│                                 │
│ Daily goal  ▓▓▓▓▓░░░  20/30 XP  │
├─────────────────────────────────┤
│  Today   Path   Review  Settings│
└─────────────────────────────────┘
```

### Lesson player

```
┌─────────────────────────────────┐
│ ✕  ▓▓▓▓▓▓░░░░░░                 │
│                                 │
│ Translate                       │
│ 🔊🐢  Ich heiße Anna.           │
│                                 │
│ ┌─────────────────────────────┐ │
│ │ My name is Anna_            │ │
│ └─────────────────────────────┘ │
│  ä  ö  ü  ß                     │
│                                 │
│ [          CHECK              ] │
└─────────────────────────────────┘
```

After **Check**, a bottom sheet shows ✅/⚠️/❌, the correct answer, a note (for example "Use ä, not ae"), plays the audio, and offers **Continue**. Wrong items are re-queued at the end of the lesson. A lesson finishes when every exercise has been answered correctly once. The summary screen shows accuracy, XP, and new words added to review.

### Visual language

- Calm and readable: warm off-white / deep-ink dark theme, one teal primary, amber for streaks.
- **Gender colours** are used everywhere a noun appears: masculine blue, feminine red, neuter green. These are language-pack tokens.
- Large tap targets (≥ 48 px) and primary actions anchored to the bottom.
- Respects `prefers-color-scheme`, `prefers-reduced-motion`, and iOS safe-area insets.

---

## 12. Gamification (light)

- **XP**: a lesson gives 10 (+5 if perfect first time). Each review gives 1.
- **Daily goal**: 30 XP by default, configurable.
- **Streak**: consecutive days on which the daily goal was met.
- No hearts, no lives, no penalties. Mistakes are information, not punishment.

---

## 13. Curriculum map (de-en)

Rough vocabulary targets (cumulative): A1 ≈ 650 words, A2 ≈ 1,300, B1 ≈ 2,400. Each unit has 3–6 lessons, and each lesson has 8–15 exercises.

### A1

| # | Unit | Main grammar / skill |
|---|---|---|
| 0 | Sounds of German | Alphabet, umlauts, *ch*, *r*, *ei/ie*, stress |
| 1 | Hallo! | Greetings, *ich bin / du bist*, *Wie heißt du?* |
| 2 | Numbers | 0–100, age, phone numbers, *Wie alt…?* |
| 3 | Where are you from? | Present tense of regular verbs, W-questions |
| 4 | Family | *der/die/das*, *mein/dein*, plurals intro |
| 5 | Food & drink | Accusative (*einen Kaffee*), *möchten*, *haben* |
| 6 | Around town | *es gibt*, *kein* vs *nicht*, plurals |
| 7 | My day | Telling time, separable verbs |
| 8 | Appointments | Days/months, *am/um*, modal verbs *können/müssen/wollen* |
| 9 | Free time | *gern*, verb-second word order and inversion |
| 10 | At home | Accusative definite articles, predicative adjectives |
| 11 | Shopping & clothes | Prices, colours, *dieser*, *welcher* |
| 12 | Getting around | Dative after *mit/zu/in*, imperative |
| 13 | Health | *wehtun*, *sollen*, polite imperative |
| 14 | What happened? | Perfekt with *haben/sein*, **A1 checkpoint** |

### A2

| # | Unit | Main grammar / skill |
|---|---|---|
| 15 | Weather & seasons | Impersonal *es*, *wenn* (present) |
| 16 | Work | Dative pronouns, *weil* clauses (verb-final) |
| 17 | Travel | Two-way prepositions (*in den / in dem*) |
| 18 | Describing people | Adjective endings after definite article |
| 19 | Media | *dass* clauses, Präteritum of *sein/haben*/modals |
| 20 | Celebrations | Dative verbs (*gefallen, gehören, schenken*) |
| 21 | Living together | Reflexive verbs |
| 22 | School & learning | Comparative and superlative |
| 23 | Customer service | Adjective endings after indefinite article |
| 24 | At the doctor's | *seit*, *sollen*, body vocab II |
| 25 | City vs country | Comparisons, *als/wie* |
| 26 | Plans | Futur I (*werden*), *um … zu* |
| 27 | Opinions | *Ich finde, dass…*, *deshalb/trotzdem* |
| 28 | Rules | *dürfen*, *man*, signs and notices |
| 29 | **A2 checkpoint** | Mixed review, mini mock exam |

### B1

| # | Unit | Main grammar / skill |
|---|---|---|
| 30 | Relationships | Relative clauses (nominative/accusative) |
| 31 | Job applications | Relative clauses (dative), formal email |
| 32 | Environment | Passive (present, with modals) |
| 33 | Wishes | Konjunktiv II (*würde, hätte, wäre, könnte*) |
| 34 | Telling stories | Präteritum of regular/irregular verbs, *als/wenn* |
| 35 | Polite requests | Konjunktiv II politeness, indirect questions (*ob*, W-) |
| 36 | Technology | *zu*-infinitive, verbs with prepositions, *da-/wo-* compounds |
| 37 | Health III | Genitive, *trotz/während/wegen* |
| 38 | Culture | n-declension, full adjective endings |
| 39 | Travel problems | Plusquamperfekt, *nachdem/bevor* |
| 40 | News & society | Passive in Präteritum, *je … desto* |
| 41 | Arguing a point | Connectors (*obwohl, trotzdem, außerdem*), opinion essay |
| 42 | Exam prep I | Goethe-style reading and listening |
| 43 | Exam prep II | Goethe-style writing and speaking |
| 44 | **B1 mock exam** | Full timed mock |

Time expectation: B1 typically takes several hundred hours of study from zero. At 30–45 minutes a day, plan for roughly 1.5–2 years.

---

## 14. Companion service (phase 4)

A small **FastAPI** app in `companion/` running on the MacBook. It is the only component that talks to Ollama and Whisper.

| Endpoint | Purpose |
|---|---|
| `GET /health` | Reports Ollama and Whisper availability and model names. The app shows/hides AI features based on this. |
| `POST /transcribe` | Multipart audio + language → transcript (faster-whisper, `int8` on CPU) |
| `POST /feedback/writing` | `{ courseId, level, task, text }` → `{ corrected, errors: [{ original, correction, category: ErrorCategory, explanation }], comment }`. Uses Ollama's JSON-schema `format` for structured output. |
| `POST /chat` | `{ scenario, level, messages }` → streamed reply, constrained to the learner's level |

- **Access:** `tailscale serve` exposes the service at `https://<mac>.<tailnet>.ts.net`, private to the user's devices, with a valid certificate. It works at home and on mobile data.
- **Auth:** a bearer token set in the app's Settings, plus CORS allow-listing the GitHub Pages origin. Never expose it with a public tunnel.
- **Models:** configurable per endpoint. On the Intel CPU, use a ~4B model for chat (latency) and a 7–9B model for writing feedback (quality). Benchmark candidates (Gemma, Qwen, Llama) on German before choosing. The "abliterated" Llama variant offers no benefit here.
- **Trust:** the app cross-checks LLM corrections against the course dictionary (for example a wrong noun gender) and labels all AI output "AI feedback — may be wrong".
- **Conventions:** Pydantic DTOs, `response_model` on every route, `Depends()` injection, enums for categories, `CustomLogger`, pytest with fixtures. This follows the user's global coding guidelines.

---

## 15. Repository layout

```
.
├── system_design.md
├── index.html
├── package.json / tsconfig.json / vite.config.ts
├── public/                      # icons, (phase 2) audio/<courseId>/
├── content/courses/de-en/       # course data (JSON)
├── src/
│   ├── main.tsx, App.tsx
│   ├── domain/                  # pure logic: content types, grading, srs, session, progress
│   ├── languages/               # language packs + registry
│   ├── services/                # content, storage (Dexie), speech, recorder, companion
│   ├── ui/                      # components, exercises, screens, styles
│   └── utils/                   # logger, small helpers
├── tests/                       # vitest; fixtures in tests/fixtures/
├── tools/                       # (phase 2) audio generation scripts
├── companion/                   # (phase 4) FastAPI service
└── .github/workflows/deploy.yml
```

---

## 16. Coding conventions (TypeScript side)

These mirror the user's global guidelines, adapted to TypeScript:

- **Enums** (`enum ExerciseType { … }`) for every fixed set of choices. No magic strings.
- **Object parameters** for any function with more than one argument (TypeScript's equivalent of keyword arguments).
- **JSDoc** on every exported function, class, and component, explaining purpose and usage.
- Comments explain *why*, not *what*.
- Single responsibility: screens render, domain functions decide, services do I/O.
- Use `utils/logger.ts` at important steps and edge cases (audio fallbacks, storage migrations, companion failures).
- Tests: one behaviour per test, module-level constants, fixtures in `tests/fixtures/`, mocks asserted with their arguments.
- No dead code or unused imports. `tsc --noEmit` and tests run in CI.

---

## 17. Deployment

1. Push to `main` triggers `.github/workflows/deploy.yml`, which runs `npm ci`, `npm test`, `npm run build` and deploys `dist/` with `actions/deploy-pages`.
2. One-off: GitHub repo → Settings → Pages → Source: **GitHub Actions**.
3. On the iPhone: open the URL in Safari → Share → **Add to Home Screen**.
4. Updates: the service worker picks up new versions. The app shows "Update available — reload" rather than reloading mid-lesson.

---

## 18. Roadmap

### Phase 1 — MVP

- [x] Project scaffold, PWA, GitHub Actions deploy workflow (first run happens on the first push)
- [x] Language pack interface + German pack
- [x] Content schema, loader, integrity tests
- [x] Answer checker with typo/umlaut/capitalisation handling
- [x] Lesson player with `TEACH`, `MULTIPLE_CHOICE`, `MATCH_PAIRS`, `TRANSLATE`, `WORD_ORDER`, `CLOZE`, `LISTEN_CHOOSE`, `LISTEN_TYPE`, `SHADOW`
- [x] FSRS review (recognise / produce / gender cards)
- [x] Today, Path, Review, Settings screens; XP, daily goal, streak
- [x] Device TTS with slow mode; shadowing recorder
- [x] Export/import progress
- [x] Content: Unit 0 (Sounds of German) and Unit 1 (Hallo!)
- [x] Content: Units 2–5 (Numbers, Where are you from?, Family, Food & drink)

### Phase 2 — A1–A2 depth

- Piper audio pipeline + manifest lookup
- `SPEAK` exercises via on-device recognition
- Grammar reference screen, stats screen, weak-spots queue
- Content: Units 6–29

### Phase 3 — B1 skills

- Reader (graded texts, tap-to-translate, add to deck)
- Listening comprehension and longer dictations
- Checkpoint tests and placement skip-ahead
- Content: Units 30–41

### Phase 4 — AI companion

- FastAPI companion, Tailscale setup guide
- Whisper speaking checks, writing feedback, conversation role-plays
- Exam prep units and the B1 mock exam

---

## 19. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Content errors teach wrong German | Integrity tests, short sentences, reference checks, learner review, and a "report this exercise" note stored locally for later fixes |
| iOS TTS voice quality | Enhanced voice setup guide in Settings; Piper clips in phase 2 |
| iOS speech recognition flaky in home-screen mode | Feature-detect it, keep it as a bonus, and use Whisper on the Mac as the robust path |
| Data loss on the phone | Home-screen install, `storage.persist()`, export reminders |
| Slow local LLM on Intel CPU | Streaming, small chat model, async feedback, and AI kept optional |
| Scope creep | Phases above. Content production is the long pole, so the app shell stays simple. |
