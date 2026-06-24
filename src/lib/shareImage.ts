/**
 * Renders the final result to a square PNG "matchday card" on a <canvas>,
 * then shares it via the native share sheet (mobile) or downloads it
 * (desktop). No image assets and no dependencies — everything is drawn.
 */

import type { Room } from '../types/game';
import { teamName } from './teamName';
import { MATCH_MODES } from './matchModes';
import { accuracyPercent } from './scoring';

const SIZE = 1080;

export async function renderResultCard(room: Room): Promise<Blob | null> {
  const [a, b] = room.players;
  if (!a || !b) return null;

  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Wait for the brand fonts so the card matches the app.
  try {
    await document.fonts.ready;
  } catch {
    /* fall back to system fonts */
  }

  const total = room.selectedQuestions.length;
  const winner =
    a.goals !== b.goals
      ? a.goals > b.goals
        ? a
        : b
      : a.score !== b.score
        ? a.score > b.score
          ? a
          : b
        : null;

  const center = SIZE / 2;
  const sans = 'system-ui, sans-serif';
  const display = '"Space Grotesk", system-ui, sans-serif';

  // Background gradient.
  const grad = ctx.createLinearGradient(0, 0, 0, SIZE);
  grad.addColorStop(0, '#0b1530');
  grad.addColorStop(1, '#05070d');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Faint pitch markings.
  ctx.strokeStyle = 'rgba(22,255,122,0.16)';
  ctx.lineWidth = 3;
  ctx.strokeRect(56, 56, SIZE - 112, SIZE - 112);
  ctx.beginPath();
  ctx.moveTo(56, center);
  ctx.lineTo(SIZE - 56, center);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(center, center, 130, 0, Math.PI * 2);
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const text = (
    s: string,
    y: number,
    size: number,
    color: string,
    font = display,
    weight = '700',
  ) => {
    ctx.fillStyle = color;
    ctx.font = `${weight} ${size}px ${font}`;
    ctx.fillText(s, center, y);
  };

  // Header.
  ctx.save();
  ctx.letterSpacing = '8px';
  text('BALL KNOWLEDGE', 150, 40, '#16ff7a');
  ctx.restore();
  text('FULL TIME', 205, 24, 'rgba(255,255,255,0.45)', sans, '600');

  // Teams + score.
  text(teamName(a.name), 320, 52, '#ffffff');
  text(`${a.goals} – ${b.goals}`, 500, 210, '#16ff7a');
  text(teamName(b.name), 690, 52, '#ffffff');

  text(`${a.score} – ${b.score} points`, 775, 30, 'rgba(255,255,255,0.5)', sans, '500');

  // Result banner.
  text(
    winner ? `${teamName(winner.name)} win` : 'Honours even — a draw',
    860,
    44,
    '#ffd24a',
  );

  // Compact stats.
  const stat = (label: string, va: string, vb: string, y: number) => {
    ctx.font = `600 26px ${sans}`;
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fillText(label, center, y);
    ctx.font = `700 28px ${display}`;
    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${va}   ·   ${vb}`, center, y + 34);
  };
  stat(
    'ACCURACY',
    `${accuracyPercent(a.correctAnswers, total)}%`,
    `${accuracyPercent(b.correctAnswers, total)}%`,
    935,
  );
  stat('BEST STREAK', String(a.bestStreak), String(b.bestStreak), 1000);

  // Footer.
  text(
    `${MATCH_MODES[room.settings.mode].label}  ·  Prove your football IQ`,
    1045,
    22,
    'rgba(255,255,255,0.4)',
    sans,
    '500',
  );

  return await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((blob) => resolve(blob), 'image/png'),
  );
}

export type ShareImageResult = 'shared' | 'downloaded' | 'failed';

export async function shareResultImage(room: Room): Promise<ShareImageResult> {
  const blob = await renderResultCard(room);
  if (!blob) return 'failed';

  const file = new File([blob], 'ball-knowledge.png', { type: 'image/png' });
  const nav = navigator as Navigator & {
    canShare?: (data: { files: File[] }) => boolean;
  };

  if (nav.share && nav.canShare && nav.canShare({ files: [file] })) {
    try {
      await nav.share({
        files: [file],
        title: 'Ball Knowledge',
        text: 'My Ball Knowledge result — can you beat it?',
      });
      return 'shared';
    } catch {
      return 'failed'; // user cancelled or share failed
    }
  }

  // Desktop fallback: download the PNG.
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'ball-knowledge.png';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded';
}
