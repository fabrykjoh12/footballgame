import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { QuestionCard } from './QuestionCard';
import type { Question, QuestionType } from '../../types/game';

/** A minimal, valid question of each type for render smoke-testing. */
const SAMPLES: Record<QuestionType, Question> = {
  who_am_i: {
    id: 'w1', type: 'who_am_i', difficulty: 'easy', category: 'players', explanation: '',
    clues: ['Clue one alpha', 'Clue two beta', 'Clue three gamma'],
    options: ['Alpha', 'Bravo', 'Charlie', 'Delta'], correctAnswer: 'Alpha',
  },
  career_path: {
    id: 'c1', type: 'career_path', difficulty: 'easy', category: 'players', explanation: '',
    path: ['Ajax', '???', 'Barcelona'], options: ['Alpha', 'Bravo', 'Charlie', 'Delta'], correctAnswer: 'Alpha',
  },
  higher_lower: {
    id: 'h1', type: 'higher_lower', difficulty: 'easy', category: 'players', explanation: '',
    prompt: 'Who scored MORE?', leftOption: { name: 'Lefty', value: 10 }, rightOption: { name: 'Righty', value: 2 },
    correctAnswer: 'Lefty',
  },
  club_country: {
    id: 'cc1', type: 'club_country', difficulty: 'easy', category: 'clubs', explanation: '',
    prompt: 'Which club is in Spain?', options: ['A', 'B', 'C', 'D'], correctAnswer: 'A',
  },
  guess_year: {
    id: 'gy1', type: 'guess_year', difficulty: 'easy', category: 'history', explanation: '',
    prompt: 'When did it happen?', options: ['2010', '2012', '2014', '2016'], correctAnswer: '2010',
  },
  transfer_fee: {
    id: 'tf1', type: 'transfer_fee', difficulty: 'easy', category: 'transfers', explanation: '',
    prompt: 'Roughly what fee?', options: ['€10m', '€50m', '€100m', '€222m'], correctAnswer: '€222m',
  },
  pitch_position: {
    id: 'pp1', type: 'pitch_position', difficulty: 'easy', category: 'players', explanation: '',
    prompt: 'Where did they play?', options: ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'], correctAnswer: 'Forward',
  },
  odd_one_out: {
    id: 'oo1', type: 'odd_one_out', difficulty: 'easy', category: 'clubs', explanation: '',
    prompt: 'Which does not belong?', options: ['A', 'B', 'C', 'D'], correctAnswer: 'D',
  },
  spot_the_lie: {
    id: 'sl1', type: 'spot_the_lie', difficulty: 'easy', category: 'history', explanation: '',
    prompt: 'Spot the false statement', options: ['A', 'B', 'C', 'D'], correctAnswer: 'A',
  },
  guess_the_number: {
    id: 'gn1', type: 'guess_the_number', difficulty: 'easy', category: 'players', explanation: '',
    prompt: 'How many goals?', correctAnswer: '50', min: 0, max: 100, unit: 'goals',
  },
};

const render = (question: Question, over: Partial<Parameters<typeof QuestionCard>[0]> = {}) =>
  renderToStaticMarkup(
    <QuestionCard
      question={question}
      clueStage={2}
      selectedAnswer={null}
      hasAnswered={false}
      opponentAnswered={false}
      onAnswer={() => {}}
      {...over}
    />,
  );

describe('QuestionCard renders every question type via the registry', () => {
  for (const [type, question] of Object.entries(SAMPLES) as [QuestionType, Question][]) {
    it(`renders ${type} without throwing, showing its prompt/content`, () => {
      const html = render(question);
      expect(html).toContain('Opponent thinking'); // shell status line
      if (type === 'who_am_i') expect(html).toContain('Clue one alpha');
      else if (type === 'career_path') expect(html).toContain('Barcelona');
      else if ('prompt' in question) expect(html).toContain(question.prompt);
    });
  }

  it('shows the locked state for a multiple-choice answer', () => {
    const html = render(SAMPLES.club_country, { selectedAnswer: 'A', hasAnswered: true });
    expect(html).toContain('Locked');
    expect(html).toContain('Answer locked');
  });

  it('reflects a locked guess on the number slider', () => {
    const html = render(SAMPLES.guess_the_number, { selectedAnswer: '73', hasAnswered: true });
    expect(html).toContain('73');
    // The "Lock it in" button is gone once a guess is locked.
    expect(html).not.toContain('Lock it in');
  });

  it('shows the opponent-answered state', () => {
    const html = render(SAMPLES.club_country, { opponentAnswered: true });
    expect(html).toContain('Opponent answered');
  });
});
