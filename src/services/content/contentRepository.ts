import type { Course, Unit } from '../../domain/content/types';

const COURSE_ROOT = '/content/courses';

const courseModules = import.meta.glob<Course>('/content/courses/*/course.json', { eager: true, import: 'default' });
const unitLoaders = import.meta.glob<Unit>('/content/courses/*/units/*.json', { import: 'default' });

function unitPath({ courseId, unitId }: { courseId: string; unitId: string }): string {
  return `${COURSE_ROOT}/${courseId}/units/${unitId}.json`;
}

/** All bundled courses. Course metadata is small, so it is loaded eagerly. */
export function listCourses(): Course[] {
  return Object.values(courseModules);
}

/** Returns a course by id, or throws if it is not bundled. */
export function getCourse(courseId: string): Course {
  const course = courseModules[`${COURSE_ROOT}/${courseId}/course.json`];
  if (!course) {
    throw new Error(`Course "${courseId}" is not bundled`);
  }
  return course;
}

/** Unit ids of a course in learning order, across all CEFR levels. */
export function listUnitIds(course: Course): string[] {
  return course.levels.flatMap((level) => level.unitIds);
}

/**
 * Loads one unit. Units are separate chunks, so this fetches lazily and the
 * service worker caches each one for offline use.
 */
export async function loadUnit({ courseId, unitId }: { courseId: string; unitId: string }): Promise<Unit> {
  const loader = unitLoaders[unitPath({ courseId, unitId })];
  if (!loader) {
    throw new Error(`Unit "${unitId}" not found in course "${courseId}"`);
  }
  return loader();
}

/** Loads every unit of a course in learning order. */
export async function loadCourseUnits(course: Course): Promise<Unit[]> {
  return Promise.all(listUnitIds(course).map((unitId) => loadUnit({ courseId: course.id, unitId })));
}

/** Unit file ids present on disk for a course, used by the integrity tests. */
export function listUnitFileIds(courseId: string): string[] {
  const prefix = `${COURSE_ROOT}/${courseId}/units/`;
  return Object.keys(unitLoaders)
    .filter((path) => path.startsWith(prefix))
    .map((path) => path.slice(prefix.length).replace(/\.json$/, ''));
}
