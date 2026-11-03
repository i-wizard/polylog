import type { LanguagePack } from '../../languages/types';
import { ExerciseType, PartOfSpeech, type Course, type Exercise, type Unit } from './types';

/**
 * Checks a course for authoring mistakes the type system can't catch.
 *
 * Returns human-readable problems; an empty list means the course is valid.
 * Run by the integrity test on every build, so broken content never ships.
 */
export function validateCourse({
  course,
  units,
  unitFileIds,
  targetPack,
}: {
  course: Course;
  units: Unit[];
  unitFileIds: string[];
  targetPack: LanguagePack;
}): string[] {
  const problems: string[] = [];
  const listedUnitIds = course.levels.flatMap((level) => level.unitIds);

  for (const unitId of listedUnitIds) {
    if (!unitFileIds.includes(unitId)) problems.push(`course.json lists unit "${unitId}" but no file exists`);
  }
  for (const fileId of unitFileIds) {
    if (!listedUnitIds.includes(fileId)) problems.push(`unit file "${fileId}" is not listed in course.json`);
  }

  problems.push(...findDuplicates({ label: 'unit id', ids: units.map((unit) => unit.id) }));
  problems.push(...findDuplicates({ label: 'lesson id', ids: units.flatMap((unit) => unit.lessons.map((lesson) => lesson.id)) }));
  problems.push(
    ...findDuplicates({
      label: 'exercise id',
      ids: units.flatMap((unit) => unit.lessons.flatMap((lesson) => lesson.exercises.map((exercise) => exercise.id))),
    }),
  );
  // Card ids are courseId:vocabId:type, so vocab ids must be unique across the whole course.
  problems.push(...findDuplicates({ label: 'vocab id', ids: units.flatMap((unit) => unit.vocab.map((item) => item.id)) }));
  // The first translation is the production-card prompt, so it must be unambiguous.
  problems.push(
    ...findDuplicates({
      label: 'first translation',
      ids: units.flatMap((unit) => unit.vocab.map((item) => item.translations[0]?.toLowerCase() ?? '')),
    }),
  );

  for (const unit of units) {
    problems.push(...validateUnit({ unit, targetPack }));
  }
  return problems;
}

function findDuplicates({ label, ids }: { label: string; ids: string[] }): string[] {
  const seen = new Set<string>();
  const problems: string[] = [];
  for (const id of ids) {
    if (seen.has(id)) problems.push(`duplicate ${label} "${id}"`);
    seen.add(id);
  }
  return problems;
}

function validateUnit({ unit, targetPack }: { unit: Unit; targetPack: LanguagePack }): string[] {
  const problems: string[] = [];
  const genderCodes = targetPack.genders.map((gender) => gender.code);
  const introducedCount = new Map<string, number>();

  for (const vocab of unit.vocab) {
    if (vocab.translations.length === 0) problems.push(`${unit.id}/${vocab.id}: no translations`);
    if (vocab.partOfSpeech === PartOfSpeech.NOUN && genderCodes.length > 0 && !vocab.gender) {
      problems.push(`${unit.id}/${vocab.id}: noun without gender`);
    }
    if (vocab.gender && !genderCodes.includes(vocab.gender)) {
      problems.push(`${unit.id}/${vocab.id}: unknown gender "${vocab.gender}"`);
    }
  }

  const vocabIds = new Set(unit.vocab.map((item) => item.id));
  for (const lesson of unit.lessons) {
    if (lesson.exercises.length === 0) problems.push(`${lesson.id}: lesson has no exercises`);
    for (const vocabId of lesson.introduces) {
      if (!vocabIds.has(vocabId)) problems.push(`${lesson.id}: introduces unknown vocab "${vocabId}"`);
      introducedCount.set(vocabId, (introducedCount.get(vocabId) ?? 0) + 1);
    }
    for (const exercise of lesson.exercises) {
      problems.push(...validateExercise({ exercise, targetPack }).map((problem) => `${lesson.id}/${exercise.id}: ${problem}`));
    }
  }

  for (const vocabId of vocabIds) {
    const count = introducedCount.get(vocabId) ?? 0;
    if (count !== 1) problems.push(`${unit.id}/${vocabId}: introduced by ${count} lessons (expected exactly 1)`);
  }
  return problems;
}

function sortedTokens({ sentence, pack }: { sentence: string; pack: LanguagePack }): string {
  return [...pack.tokenize(sentence)].sort().join(' ');
}

function validateExercise({ exercise, targetPack }: { exercise: Exercise; targetPack: LanguagePack }): string[] {
  const problems: string[] = [];
  switch (exercise.type) {
    case ExerciseType.MULTIPLE_CHOICE:
    case ExerciseType.LISTEN_CHOOSE:
      if (exercise.options.length < 2) problems.push('needs at least 2 options');
      if (exercise.answerIndex < 0 || exercise.answerIndex >= exercise.options.length) {
        problems.push('answerIndex out of range');
      }
      if (new Set(exercise.options).size !== exercise.options.length) problems.push('duplicate options');
      break;
    case ExerciseType.MATCH_PAIRS: {
      if (exercise.pairs.length < 2) problems.push('needs at least 2 pairs');
      const targets = new Set(exercise.pairs.map((pair) => pair.target));
      const bases = new Set(exercise.pairs.map((pair) => pair.base));
      if (targets.size !== exercise.pairs.length || bases.size !== exercise.pairs.length) {
        problems.push('pairs must be unique on both sides');
      }
      break;
    }
    case ExerciseType.TRANSLATE:
    case ExerciseType.CLOZE:
      if (exercise.accepted.length === 0) problems.push('no accepted answers');
      break;
    case ExerciseType.WORD_ORDER: {
      const answerTokens = targetPack.tokenize(exercise.answer);
      if (answerTokens.length < 2) problems.push('answer needs at least 2 tiles');
      for (const distractor of exercise.distractors ?? []) {
        if (answerTokens.includes(distractor)) problems.push(`distractor "${distractor}" is also in the answer`);
      }
      const expectedTiles = sortedTokens({ sentence: exercise.answer, pack: targetPack });
      for (const alternative of exercise.alternatives ?? []) {
        if (sortedTokens({ sentence: alternative, pack: targetPack }) !== expectedTiles) {
          problems.push(`alternative "${alternative}" uses different tiles than the answer`);
        }
      }
      break;
    }
    case ExerciseType.TEACH:
    case ExerciseType.LISTEN_TYPE:
    case ExerciseType.SHADOW:
      break;
  }
  return problems;
}
