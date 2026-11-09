#!/usr/bin/env node
//
// Builds the offline German → English dictionary used by the Dictionary tab.
//
// Inputs (download once, see docs/dictionary.md):
//   1. Wiktextract's German extract of English Wiktionary (JSON lines, ~1 GB):
//      https://kaikki.org/dictionary/German/kaikki.org-dictionary-German.jsonl
//   2. The 50,000 most frequent German words (OpenSubtitles):
//      https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/de/de_50k.txt
//
// Usage:
//   node tools/build-dictionary.mjs <wiktionary.jsonl> <de_50k.txt> [output.json]
//
// Only words people actually use are kept: a dictionary word is included when
// it, or one of its inflected forms, is in the frequency list. Entries are
// written most common first, so the app can rank search results by position.

import { createReadStream, readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';

const DEFAULT_OUTPUT = 'content/dictionaries/de-en.json';
const MAX_MEANINGS = 3;
const MAX_MEANING_LENGTH = 80;
const SOURCE =
  'Wiktionary (CC BY-SA 4.0) via kaikki.org; word frequencies from OpenSubtitles via FrequencyWords (CC BY-SA 4.0)';

/** Wiktionary parts of speech kept, mapped to the app's PartOfSpeech values. */
const PART_OF_SPEECH = {
  noun: 'NOUN',
  verb: 'VERB',
  adj: 'ADJECTIVE',
  adv: 'ADVERB',
  pron: 'PRONOUN',
  prep: 'PREPOSITION',
  postp: 'PREPOSITION',
  conj: 'CONJUNCTION',
  num: 'NUMBER',
  intj: 'INTERJECTION',
  article: 'ARTICLE',
  det: 'DETERMINER',
  particle: 'PARTICLE',
};

/** Sense tags that mark meanings a learner shouldn't be shown first. */
const SKIPPED_SENSE_TAGS = new Set(['obsolete', 'archaic', 'dated', 'historical', 'rare', 'form-of', 'alt-of', 'misspelling']);
/** The same labels written into the gloss text instead of the tags. */
const SKIPPED_GLOSS_PATTERN = /^\((obsolete|archaic|dated|historical|rare)\b/i;
const WORD_PATTERN = /^[\p{L}][\p{L}'-]*$/u;
/** A table form shared by more words than this (e.g. "ihn" in every pronoun's table) says nothing useful. */
const MAX_TABLE_LINKS = 4;
const DECLENSION_SOURCES = new Set(['declension', 'conjugation', 'inflection']);
// "auxiliary" is the helper verb (haben/sein) listed in every verb's table, not a form of the verb.
const IGNORED_FORM_TAGS = new Set(['table-tags', 'inflection-template', 'class', 'auxiliary']);

function readFrequencyRanks(path) {
  const ranks = new Map();
  readFileSync(path, 'utf8')
    .split('\n')
    .forEach((line) => {
      const word = line.split(' ')[0]?.trim().toLowerCase();
      if (word && !ranks.has(word)) {
        ranks.set(word, ranks.size + 1);
      }
    });
  return ranks;
}

function shorten(text) {
  if (text.length <= MAX_MEANING_LENGTH) {
    return text;
  }
  const cut = text.slice(0, MAX_MEANING_LENGTH);
  return `${cut.slice(0, cut.lastIndexOf(' '))}…`;
}

function extractMeanings(senses) {
  const meanings = [];
  for (const sense of senses ?? []) {
    if (sense.form_of || sense.alt_of || (sense.tags ?? []).some((tag) => SKIPPED_SENSE_TAGS.has(tag))) {
      continue;
    }
    const gloss = sense.glosses?.[sense.glosses.length - 1];
    if (gloss && !SKIPPED_GLOSS_PATTERN.test(gloss) && !meanings.includes(gloss)) {
      meanings.push(shorten(gloss));
    }
    if (meanings.length === MAX_MEANINGS) {
      break;
    }
  }
  return meanings;
}

/** The noun's gender as written after the headword, e.g. "Hund m (strong, …)". */
function extractGender(record) {
  const expansion = record.head_templates?.[0]?.expansion ?? '';
  const match = expansion.match(/^\S+ ([mfn])(?:[ ,]|$)/);
  return match?.[1];
}

function extractPlural(record) {
  const plural = (record.forms ?? []).find(
    (form) => !form.source && form.tags?.length === 1 && form.tags[0] === 'plural' && WORD_PATTERN.test(form.form),
  );
  return plural?.form;
}

function extractIpa(record) {
  return (record.sounds ?? []).find((sound) => sound.ipa)?.ipa;
}

/** Inflected forms listed in a word's own declension or conjugation table. */
function extractInflectedForms(record) {
  return (record.forms ?? [])
    .filter((form) => DECLENSION_SOURCES.has(form.source) || (!form.source && form.tags?.length))
    .filter((form) => !(form.tags ?? []).some((tag) => IGNORED_FORM_TAGS.has(tag)))
    .map((form) => form.form)
    .filter((form) => WORD_PATTERN.test(form));
}

function isFormOnly(record) {
  const senses = record.senses ?? [];
  return senses.length > 0 && senses.every((sense) => sense.form_of || (sense.tags ?? []).includes('form-of'));
}

/** Identifies a dictionary word by spelling and part of speech, so "bin" links to the verb sein, not "sein" (his). */
function lemmaKey({ word, partOfSpeech }) {
  return `${word}|${partOfSpeech}`;
}

function addFormLink({ formLinks, form, lemma, partOfSpeech }) {
  const key = form.toLowerCase();
  if (key === lemma.toLowerCase()) {
    return;
  }
  const lemmas = formLinks.get(key) ?? new Set();
  lemmas.add(lemmaKey({ word: lemma, partOfSpeech }));
  formLinks.set(key, lemmas);
}

/**
 * Form links stated by Wiktionary's own form entries ("mir: dative of ich")
 * win over those read from inflection tables, because some tables list a
 * whole set of words (every personal pronoun's table includes "mir").
 */
function mergeFormLinks({ statedLinks, tableLinks }) {
  const merged = new Map([...tableLinks].filter(([, lemmas]) => lemmas.size <= MAX_TABLE_LINKS));
  statedLinks.forEach((lemmas, form) => merged.set(form, lemmas));
  return merged;
}

async function readWiktionary({ path, ranks }) {
  const candidates = [];
  /** Lower-case form → lemma keys it belongs to, from form entries and from inflection tables. */
  const statedLinks = new Map();
  const tableLinks = new Map();
  const lines = createInterface({ input: createReadStream(path), crlfDelay: Infinity });

  for await (const line of lines) {
    const record = JSON.parse(line);
    if (record.lang_code !== 'de' || !WORD_PATTERN.test(record.word ?? '')) {
      continue;
    }
    // Entries can mix form senses with ordinary ones ("ihn": accusative of er, plus an obsolete meaning).
    if (ranks.has(record.word.toLowerCase())) {
      (record.senses ?? [])
        .flatMap((sense) => sense.form_of ?? [])
        .forEach(({ word }) =>
          addFormLink({ formLinks: statedLinks, form: record.word, lemma: word, partOfSpeech: PART_OF_SPEECH[record.pos] }),
        );
    }
    if (isFormOnly(record)) {
      continue;
    }
    const partOfSpeech = PART_OF_SPEECH[record.pos];
    const meanings = extractMeanings(record.senses);
    if (!partOfSpeech || meanings.length === 0) {
      continue;
    }
    extractInflectedForms(record)
      .filter((form) => ranks.has(form.toLowerCase()))
      .forEach((form) => addFormLink({ formLinks: tableLinks, form, lemma: record.word, partOfSpeech }));
    candidates.push({
      word: record.word,
      partOfSpeech,
      gender: partOfSpeech === 'NOUN' ? extractGender(record) : undefined,
      plural: partOfSpeech === 'NOUN' ? extractPlural(record) : undefined,
      ipa: extractIpa(record),
      meanings,
    });
  }
  return { candidates, formLinks: mergeFormLinks({ statedLinks, tableLinks }) };
}

/** A word's frequency rank: its own, or failing that its most frequent inflected form's. */
function rankWords({ ranks, formLinks }) {
  const wordRanks = new Map();
  ranks.forEach((rank, word) => wordRanks.set(word, rank));
  formLinks.forEach((lemmas, form) => {
    const formRank = ranks.get(form);
    lemmas.forEach((lemma) => {
      const key = lemma.split('|')[0].toLowerCase();
      if (formRank && formRank < (wordRanks.get(key) ?? Infinity)) {
        wordRanks.set(key, formRank);
      }
    });
  });
  return wordRanks;
}

function buildForms({ entries, formLinks, ranks }) {
  const indexesByLemma = new Map();
  entries.forEach((entry, index) => {
    const key = lemmaKey(entry);
    indexesByLemma.set(key, [...(indexesByLemma.get(key) ?? []), index]);
  });
  const forms = {};
  [...formLinks.keys()]
    .filter((form) => ranks.has(form))
    .sort((a, b) => ranks.get(a) - ranks.get(b))
    .forEach((form) => {
      const indexes = [...formLinks.get(form)].flatMap((lemma) => indexesByLemma.get(lemma) ?? []);
      if (indexes.length > 0) {
        forms[form] = [...new Set(indexes)].sort((a, b) => a - b);
      }
    });
  return forms;
}

function withoutEmptyFields(entry) {
  return Object.fromEntries(Object.entries(entry).filter(([, value]) => value !== undefined));
}

async function main() {
  const [wiktionaryPath, frequencyPath, outputPath = DEFAULT_OUTPUT] = process.argv.slice(2);
  if (!wiktionaryPath || !frequencyPath) {
    console.error('Usage: node tools/build-dictionary.mjs <wiktionary.jsonl> <de_50k.txt> [output.json]');
    process.exit(1);
  }
  const ranks = readFrequencyRanks(frequencyPath);
  const { candidates, formLinks } = await readWiktionary({ path: wiktionaryPath, ranks });
  const wordRanks = rankWords({ ranks, formLinks });

  const entries = candidates
    .map((candidate, order) => ({ candidate, order, rank: wordRanks.get(candidate.word.toLowerCase()) }))
    .filter(({ rank }) => rank !== undefined)
    .sort((a, b) => a.rank - b.rank || a.order - b.order)
    .map(({ candidate }) => withoutEmptyFields(candidate));
  const forms = buildForms({ entries, formLinks, ranks });

  writeFileSync(outputPath, `${JSON.stringify({ source: SOURCE, entries, forms })}\n`);
  console.log(`Wrote ${entries.length} words and ${Object.keys(forms).length} inflected forms to ${outputPath}`);
}

await main();
