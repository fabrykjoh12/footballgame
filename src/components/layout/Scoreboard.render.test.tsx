import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Scoreboard } from './Scoreboard';
import type { Player } from '../../types/game';

function player(id: string, name: string, goals: number, score: number): Player {
  return {
    id, name, isHost: id === 'a', connected: true,
    score, goals, correctAnswers: 0, streak: 0, bestStreak: 0, fastestAnswerMs: null,
  };
}

const render = (players: Player[], over = {}) =>
  renderToStaticMarkup(
    <Scoreboard players={players} localPlayerId="a" questionNumber={3} totalQuestions={10} {...over} />,
  );

describe('Scoreboard', () => {
  it('shows the football scoreline, the points, and the question count', () => {
    const html = render([player('a', 'Sara FC', 3, 8200), player('b', 'Jonas United', 2, 6100)]);
    expect(html).toContain('Sara FC');
    expect(html).toContain('Jonas United');
    expect(html).toContain('>3<'); // home goals
    expect(html).toContain('>2<'); // away goals
    expect(html).toContain('8200'); // points (secondary)
    expect(html).toContain('Question 3 / 10');
  });

  it('marks the local player and a disconnected opponent', () => {
    const b = { ...player('b', 'Jonas United', 2, 6100), connected: false };
    const html = render([player('a', 'Sara FC', 3, 8200), b]);
    expect(html).toContain('You');
    expect(html).toContain('Disconnected');
  });

  it('renders nothing without two players', () => {
    expect(render([player('a', 'Solo', 0, 0)])).toBe('');
  });
});
