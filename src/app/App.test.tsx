import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from './App.tsx';

describe('App smoke test', () => {
  it('renders the main menu on first load', () => {
    render(<App />);
    expect(
      screen.getByRole('heading', { name: /ball knowledge/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /play vs cpu/i }),
    ).toBeInTheDocument();
  });

  it('exposes a live region for screen-reader phase announcements', () => {
    render(<App />);
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent(/menu/i);
  });
});
