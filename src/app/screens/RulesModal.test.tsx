import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RulesModal } from './RulesModal.tsx';
import { MINI_GAME_IDS } from '../../types/match.ts';
import { getMiniGame } from '../../minigames/registry.ts';

describe('RulesModal', () => {
  it('renders an accessible dialog with a title', () => {
    render(<RulesModal onClose={() => {}} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('heading', { name: /how to play/i })).toBeInTheDocument();
  });

  it('lists all six mini-games by title', () => {
    render(<RulesModal onClose={() => {}} />);
    for (const id of MINI_GAME_IDS) {
      expect(screen.getByText(getMiniGame(id).title)).toBeInTheDocument();
    }
  });

  it('closes on the close button and on Escape', () => {
    const onClose = vi.fn();
    render(<RulesModal onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
