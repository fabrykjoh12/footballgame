import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { RulePicker } from './ScoutGame';
import { scoutCatalog } from '../../lib/scout/categories';

/**
 * The accuse list must never cross-reference the evidence for the player —
 * deducing the rule is the game. This guards against the old "Detective panel"
 * (which auto-narrowed to the single consistent rule) coming back.
 */
describe('RulePicker', () => {
  const catalog = scoutCatalog();

  it('lists rules to accuse without any answer-revealing deduction aid', () => {
    const html = renderToStaticMarkup(
      <RulePicker catalog={catalog} actionLabel="Accuse" onPick={() => {}} />,
    );
    expect(html).not.toContain('Detective panel');
    expect(html).not.toContain('match the evidence');
    // Still a usable list: the filter box and at least one rule render.
    expect(html).toContain('Filter rules…');
    expect(html).toContain(catalog[0].label);
  });

  it('does not accept an evidence prop (no consistency filtering path exists)', () => {
    // @ts-expect-error — `evidence` was removed from the props on purpose.
    const el = <RulePicker catalog={catalog} evidence={[]} actionLabel="Pick" onPick={() => {}} />;
    expect(el).toBeTruthy();
  });
});
