/**
 * Canonical pitch zones for the "On the Pitch" mini-game. Kept deliberately
 * broad (four lines) so a player's primary role is unambiguous.
 */
export const PITCH_ZONES = ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'] as const;

export type PitchZone = (typeof PITCH_ZONES)[number];
