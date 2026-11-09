# The offline dictionary

The **Dictionary** tab searches `content/dictionaries/de-en.json`. That file holds about 23,000 common German words, each with its gender, plural, IPA pronunciation and up to three English meanings. It also has about 20,000 inflected forms, so a search for *bin* leads to *sein*. The app adds the course's own words, with their respellings and example sentences. Any word can be played with the device voice.

The file is generated and committed; you only need this page to rebuild it, for example to pick up Wiktionary fixes.

## Rebuilding

1. Download the two sources into a scratch folder (outside the repo; the Wiktionary file is about 1 GB):

   ```sh
   mkdir -p /tmp/dictdata && cd /tmp/dictdata
   curl -fLO https://kaikki.org/dictionary/German/kaikki.org-dictionary-German.jsonl
   curl -fLO https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/de/de_50k.txt
   ```

2. From the project folder, run the build:

   ```sh
   node tools/build-dictionary.mjs /tmp/dictdata/kaikki.org-dictionary-German.jsonl /tmp/dictdata/de_50k.txt
   ```

   It takes about 15 seconds.

## How words are chosen

- A word is kept when it, or one of its inflected forms, is among the 50,000 most frequent words in German film subtitles. Entries are stored most common first, and search results are ranked in that order.
- Proper names, abbreviations and affixes are left out. So are meanings marked obsolete, archaic, dated or rare.
- Inflected forms come from Wiktionary's own form entries (*mir*: dative of *ich*). Where Wiktionary has none, they come from the word's inflection table. A table form shared by more than four words is dropped as ambiguous.

## Licence

The data comes from **Wiktionary** (CC BY-SA 4.0), via [kaikki.org](https://kaikki.org), and from **FrequencyWords** (CC BY-SA 4.0), based on OpenSubtitles. The Dictionary tab shows this attribution.
