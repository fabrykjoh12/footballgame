/**
 * Data for the Higher / Lower mini-game. Pure numeric facts grouped by
 * category — no media. Values are deliberately round/approximate "knowledge"
 * figures; the game only compares relative magnitude, never exact totals.
 */

export interface HigherLowerItem {
  label: string;
  value: number;
}

export interface HigherLowerCategory {
  /** e.g. "European Cup / Champions League titles" */
  metric: string;
  /** Short unit shown in the UI, e.g. "titles". */
  unit: string;
  items: HigherLowerItem[];
}

export const HIGHER_LOWER_BANK: readonly HigherLowerCategory[] = [
  {
    metric: 'European Cup / Champions League titles',
    unit: 'titles',
    items: [
      { label: 'Real Madrid', value: 15 },
      { label: 'AC Milan', value: 7 },
      { label: 'Bayern Munich', value: 6 },
      { label: 'Liverpool', value: 6 },
      { label: 'Barcelona', value: 5 },
      { label: 'Ajax', value: 4 },
      { label: 'Manchester United', value: 3 },
      { label: 'Inter', value: 3 },
      { label: 'Juventus', value: 2 },
      { label: 'Chelsea', value: 2 },
      { label: 'Porto', value: 2 },
      { label: 'Borussia Dortmund', value: 1 },
    ],
  },
  {
    metric: 'FIFA World Cup titles (men)',
    unit: 'titles',
    items: [
      { label: 'Brazil', value: 5 },
      { label: 'Germany', value: 4 },
      { label: 'Italy', value: 4 },
      { label: 'Argentina', value: 3 },
      { label: 'France', value: 2 },
      { label: 'Uruguay', value: 2 },
      { label: 'Spain', value: 1 },
      { label: 'England', value: 1 },
    ],
  },
  {
    metric: 'Approx. stadium capacity',
    unit: 'seats',
    items: [
      { label: 'Camp Nou (Barcelona)', value: 99000 },
      { label: 'Santiago Bernabéu (Real Madrid)', value: 81000 },
      { label: 'Signal Iduna Park (Dortmund)', value: 81000 },
      { label: 'San Siro (Milan)', value: 75000 },
      { label: 'Old Trafford (Man Utd)', value: 74000 },
      { label: 'Allianz Arena (Bayern)', value: 75000 },
      { label: 'Anfield (Liverpool)', value: 61000 },
      { label: 'Emirates (Arsenal)', value: 60000 },
      { label: 'Wembley (England NT)', value: 90000 },
      { label: 'Celtic Park (Celtic)', value: 60000 },
      { label: 'Stade de France', value: 80000 },
    ],
  },
  {
    metric: 'UEFA European Championship titles',
    unit: 'titles',
    items: [
      { label: 'Germany', value: 3 },
      { label: 'Spain', value: 4 },
      { label: 'Italy', value: 2 },
      { label: 'France', value: 2 },
      { label: 'Portugal', value: 1 },
      { label: 'Netherlands', value: 1 },
      { label: 'Denmark', value: 1 },
      { label: 'Greece', value: 1 },
    ],
  },
  {
    metric: 'Year the club was founded',
    unit: '',
    items: [
      { label: 'Manchester United', value: 1878 },
      { label: 'Liverpool', value: 1892 },
      { label: 'Barcelona', value: 1899 },
      { label: 'AC Milan', value: 1899 },
      { label: 'Real Madrid', value: 1902 },
      { label: 'Bayern Munich', value: 1900 },
      { label: 'Ajax', value: 1900 },
      { label: 'Juventus', value: 1897 },
      { label: 'Arsenal', value: 1886 },
      { label: 'Borussia Dortmund', value: 1909 },
    ],
  },
];
