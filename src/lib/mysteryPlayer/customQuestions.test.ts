import { describe, it, expect } from 'vitest';
import {
  normalizeQuestion,
  addToList,
  removeFromList,
  STARTER_QUESTIONS,
} from './customQuestions';

describe('mystery custom questions', () => {
  it('normalizes whitespace and caps length', () => {
    expect(normalizeQuestion('  did   he   play?  ')).toBe('did he play?');
    expect(normalizeQuestion('x'.repeat(300)).length).toBe(160);
  });

  it('adds to the front and dedupes case-insensitively', () => {
    let list: string[] = [];
    list = addToList(list, 'Is your player a forward?');
    list = addToList(list, 'Did they play in Spain?');
    expect(list[0]).toBe('Did they play in Spain?');
    // Re-adding (different case) moves it to front without duplicating.
    list = addToList(list, 'is your player a FORWARD?');
    expect(list).toHaveLength(2);
    expect(list[0].toLowerCase()).toBe('is your player a forward?');
  });

  it('ignores empty/whitespace additions', () => {
    expect(addToList(['a'], '   ')).toEqual(['a']);
  });

  it('caps the list at 40', () => {
    let list: string[] = [];
    for (let i = 0; i < 50; i++) list = addToList(list, `question ${i}`);
    expect(list).toHaveLength(40);
    expect(list[0]).toBe('question 49'); // newest first
  });

  it('removes case-insensitively', () => {
    const list = ['Foo?', 'Bar?'];
    expect(removeFromList(list, 'foo?')).toEqual(['Bar?']);
    expect(removeFromList(list, 'nope?')).toEqual(list);
  });

  it('ships a handful of starter prompts', () => {
    expect(STARTER_QUESTIONS.length).toBeGreaterThanOrEqual(6);
    STARTER_QUESTIONS.forEach((q) => expect(q.trim().length).toBeGreaterThan(0));
  });
});
