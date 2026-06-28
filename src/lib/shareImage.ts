/**
 * Renders the final result to a square PNG "matchday card" on a <canvas>,
 * then shares it via the native share sheet (mobile) or downloads it
 * (desktop). No image assets and no dependencies — everything is drawn.
 *
 * Flavour (winner banner, accolade ribbon, biggest moment, best category)
 * comes from the shared `shareCard` model, so the image matches the text.
 */

import type { Room } from '../types/game';
import { accuracyPercent } from './scoring';
import { buildShareCard, type ShareContext } from './shareCard';

const SIZE = 1080;

export async function renderResultCard(
  room: Room,
  localPlayerId?: string,
  ctx?: ShareContext,
): Promise<Blob | null> {
  const [a, b] = room.players;
  if (!a || !b) return null;
  const model = buildShareCard(room, localPlayerId, ctx);
  if (!model) return null;

  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx2d = canvas.getContext('2d');
  if (!ctx2d) return null;
  const c = ctx2d;

  // Wait for the brand fonts so the card matches the app.
  try {
    await document.fonts.ready;
  } catch {
    /* fall back to system fonts */
  }

  const total = room.selectedQuestions.length;
  const center = SIZE / 2;
  const sans = 'system-ui, sans-serif';
  const display = '"Space Grotesk", system-ui, sans-serif';

  // Background gradient.
  const grad = c.createLinearGradient(0, 0, 0, SIZE);
  grad.addColorStop(0, '#0b1530');
  grad.addColorStop(1, '#05070d');
  c.fillStyle = grad;
  c.fillRect(0, 0, SIZE, SIZE);

  // Faint pitch markings.
  c.strokeStyle = 'rgba(22,255,122,0.16)';
  c.lineWidth = 3;
  c.strokeRect(56, 56, SIZE - 112, SIZE - 112);
  c.beginPath();
  c.moveTo(56, center);
  c.lineTo(SIZE - 56, center);
  c.stroke();
  c.beginPath();
  c.arc(center, center, 130, 0, Math.PI * 2);
  c.stroke();

  c.textAlign = 'center';
  c.textBaseline = 'middle';

  const text = (
    s: string,
    y: number,
    size: number,
    color: string,
    font = display,
    weight = '700',
  ) => {
    c.fillStyle = color;
    c.font = `${weight} ${size}px ${font}`;
    c.fillText(s, center, y);
  };

  // Header.
  c.save();
  c.letterSpacing = '8px';
  text('BALL KNOWLEDGE', 140, 40, '#16ff7a');
  c.restore();
  text('FULL TIME', 192, 24, 'rgba(255,255,255,0.45)', sans, '600');

  // Accolade ribbon (perfect / comeback / nightmare / late winner / daily…).
  if (model.accolade) {
    const label = `${model.accolade.emoji}  ${model.accolade.label}`;
    c.font = `800 30px ${display}`;
    const w = c.measureText(label).width + 64;
    const x = center - w / 2;
    const y = 232;
    c.fillStyle = 'rgba(255,210,74,0.16)';
    roundRect(c, x, y - 30, w, 60, 30);
    c.fill();
    c.strokeStyle = 'rgba(255,210,74,0.5)';
    c.lineWidth = 2;
    roundRect(c, x, y - 30, w, 60, 30);
    c.stroke();
    text(label, y, 30, '#ffd24a', display, '800');
    text(model.accolade.sub, y + 52, 22, 'rgba(255,255,255,0.55)', sans, '500');
  }

  // Teams + score.
  text(model.teamA, 340, 50, '#ffffff');
  text(`${model.goalsA} – ${model.goalsB}`, 510, 200, '#16ff7a');
  text(model.teamB, 690, 50, '#ffffff');

  text(`${model.pointsA} – ${model.pointsB} points`, 770, 30, 'rgba(255,255,255,0.5)', sans, '500');

  // Result banner + biggest moment.
  text(model.resultBanner, 840, 42, '#ffd24a');
  if (model.momentLine) {
    text(model.momentLine, 888, 26, 'rgba(255,255,255,0.6)', sans, '500');
  }

  // Compact two-up stats.
  const stat = (label: string, va: string, vb: string, y: number) => {
    c.font = `600 24px ${sans}`;
    c.fillStyle = 'rgba(255,255,255,0.45)';
    c.fillText(label, center, y);
    c.font = `700 26px ${display}`;
    c.fillStyle = '#ffffff';
    c.fillText(`${va}   ·   ${vb}`, center, y + 32);
  };
  stat(
    'ACCURACY',
    `${accuracyPercent(a.correctAnswers, total)}%`,
    `${accuracyPercent(b.correctAnswers, total)}%`,
    948,
  );
  stat('BEST STREAK', String(a.bestStreak), String(b.bestStreak), 1010);

  // Footer: best category + mode, then the play URL.
  const footerBits = [model.bestCategory ? `Best: ${model.bestCategory}` : null, model.modeLabel]
    .filter(Boolean)
    .join('  ·  ');
  text(footerBits, 1046, 21, 'rgba(255,255,255,0.4)', sans, '500');
  const playUrl = `${window.location.host}${window.location.pathname}`.replace(/\/$/, '');
  if (playUrl) text(playUrl, 1066, 20, '#16ff7a', sans, '600');

  return await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((blob) => resolve(blob), 'image/png'),
  );
}

function roundRect(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + radius, y);
  c.arcTo(x + w, y, x + w, y + h, radius);
  c.arcTo(x + w, y + h, x, y + h, radius);
  c.arcTo(x, y + h, x, y, radius);
  c.arcTo(x, y, x + w, y, radius);
  c.closePath();
}

export type ShareImageResult = 'shared' | 'downloaded' | 'failed';

export async function shareResultImage(
  room: Room,
  localPlayerId?: string,
  ctx?: ShareContext,
): Promise<ShareImageResult> {
  const blob = await renderResultCard(room, localPlayerId, ctx);
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
