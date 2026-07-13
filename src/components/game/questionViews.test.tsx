import { describe, it, expect } from 'vitest';
import { QUESTION_RENDERERS } from './questionViews';
import { MATCH_TYPE_DISTRIBUTION } from '../../lib/matchModes';
import { BASE_POINTS } from '../../lib/scoring';

describe('QUESTION_RENDERERS registry', () => {
  it('has a renderer for every type in the match distribution', () => {
    for (const type of Object.keys(MATCH_TYPE_DISTRIBUTION)) {
      expect(QUESTION_RENDERERS, type).toHaveProperty(type);
      expect(typeof (QUESTION_RENDERERS as Record<string, unknown>)[type], type).toBe('function');
    }
  });

  it('covers exactly the scoring types (no missing / stray renderer)', () => {
    // BASE_POINTS is a TS-enforced Record<QuestionType, number>, so it is the
    // canonical list of mini-game types. The registry must match it 1:1.
    expect(new Set(Object.keys(QUESTION_RENDERERS))).toEqual(new Set(Object.keys(BASE_POINTS)));
  });
});
