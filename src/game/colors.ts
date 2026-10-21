export type ColorId = 'green' | 'red' | 'yellow' | 'blue';

export type GameColor = {
  id: ColorId;
  label: string;
};

// Spatial order on the board: top-left, top-right, bottom-left, bottom-right (DESIGN.md §1.1).
// The board renders in LTR so this order never flips under RTL.
export const GAME_COLORS: readonly GameColor[] = [
  { id: 'green', label: 'ירוק' },
  { id: 'red', label: 'אדום' },
  { id: 'yellow', label: 'צהוב' },
  { id: 'blue', label: 'כחול' },
];
