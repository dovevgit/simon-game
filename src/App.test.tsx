import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App.tsx';
import type { ColorId } from './game/colors.ts';
import { randomColor } from './game/random.ts';

vi.mock('./game/random.ts', () => ({ randomColor: vi.fn(() => 'green') }));
const mockedRandom = vi.mocked(randomColor);

const COLOR_LABELS: Record<ColorId, string> = {
  green: 'ירוק',
  red: 'אדום',
  yellow: 'צהוב',
  blue: 'כחול',
};

function getNav() {
  return screen.getByRole('navigation', { name: 'ניווט ראשי' });
}

function getBoard() {
  return screen.getByRole('group', { name: 'לוח המשחק' });
}

function getPad(color: ColorId) {
  return within(getBoard()).getByRole('button', { name: COLOR_LABELS[color] });
}

function litPads(): ColorId[] {
  return (Object.keys(COLOR_LABELS) as ColorId[]).filter((color) =>
    getPad(color).classList.contains('simon-board__pad--lit'),
  );
}

async function advance(ms: number) {
  await act(() => vi.advanceTimersByTimeAsync(ms));
}

// Lead-in + 600ms per color + 250ms between colors.
function presentationMs(length: number, roundAdvanced: boolean) {
  return (roundAdvanced ? 2000 : 1000) + length * 600 + (length - 1) * 250;
}

function tap(color: ColorId) {
  fireEvent.pointerDown(getPad(color));
  fireEvent.pointerUp(window);
}

beforeEach(() => {
  mockedRandom.mockReset();
  mockedRandom.mockReturnValue('green');
});

describe('App shell', () => {
  it('renders the home screen before a game starts', () => {
    render(<App />);

    expect(screen.getByRole('heading', { level: 1, name: 'סיימון' })).toBeInTheDocument();
    expect(screen.getByText('שלב 1 מתוך 10')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'התחל משחק' })).toBeInTheDocument();
  });

  it('places the four pads in board order: green, red, yellow, blue', () => {
    render(<App />);

    const pads = within(getBoard()).getAllByRole('button');
    expect(pads.map((pad) => pad.getAttribute('aria-label'))).toEqual([
      'ירוק',
      'אדום',
      'צהוב',
      'כחול',
    ]);
  });

  it('has exactly two navigation options', () => {
    render(<App />);

    const items = within(getNav()).getAllByRole('button');
    expect(items.map((item) => item.textContent)).toEqual(['בית', 'אודות']);
  });

  it('switches between home and about without leaving the app', async () => {
    const user = userEvent.setup();
    render(<App />);
    const nav = getNav();

    expect(within(nav).getByRole('button', { name: 'בית' })).toHaveAttribute('aria-current', 'page');

    await user.click(within(nav).getByRole('button', { name: 'אודות' }));
    expect(screen.getByRole('heading', { level: 1, name: 'אודות' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'על המשחק' })).toBeInTheDocument();
    expect(screen.getByText('עדיין אין משחקים שמורים.')).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'לוח המשחק' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'מחק היסטוריה' })).not.toBeInTheDocument();
    expect(within(nav).getByRole('button', { name: 'אודות' })).toHaveAttribute('aria-current', 'page');

    await user.click(within(nav).getByRole('button', { name: 'בית' }));
    expect(getBoard()).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'התחל משחק' })).toBeInTheDocument();
  });
});

describe('Game flow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function startGame() {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'התחל משחק' }));
  }

  it('presents round 1 with the required pacing, then hands over to the player', async () => {
    mockedRandom.mockReturnValueOnce('red');
    startGame();

    expect(screen.getByText('המשחק מציג את הרצף')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'התחל משחק' })).not.toBeInTheDocument();
    expect(litPads()).toEqual([]);

    await advance(999);
    expect(litPads()).toEqual([]);
    await advance(1);
    expect(litPads()).toEqual(['red']);
    await advance(599);
    expect(litPads()).toEqual(['red']);
    await advance(1);
    expect(litPads()).toEqual([]);

    expect(screen.getByText('התור שלך')).toBeInTheDocument();
    expect(screen.getByText('הקש על הצבעים לפי הסדר')).toBeInTheDocument();
  });

  it('ignores presses while the sequence is shown', async () => {
    startGame();
    await advance(1000);

    tap('red'); // wrong color, but input is blocked
    await advance(3000);
    expect(screen.queryByText('נפסלת!')).not.toBeInTheDocument();
    expect(screen.getByText('התור שלך')).toBeInTheDocument();
  });

  it('lights the pressed pad for at least 300ms, or while held', async () => {
    startGame();
    await advance(presentationMs(1, false));
    mockedRandom.mockReturnValue('green');

    fireEvent.pointerDown(getPad('green'));
    await advance(299);
    expect(litPads()).toEqual(['green']);
    await advance(400);
    expect(litPads()).toEqual(['green']); // still held
    fireEvent.pointerUp(window);
    expect(litPads()).toEqual([]);
  });

  it('moves to the next round with the round-change pauses and an extended sequence', async () => {
    mockedRandom.mockReturnValueOnce('red').mockReturnValueOnce('blue');
    startGame();
    await advance(presentationMs(1, false));

    tap('red');
    expect(screen.getByText('המשחק מציג את הרצף')).toBeInTheDocument();
    expect(screen.getByText('שלב 1 מתוך 10')).toBeInTheDocument();
    await advance(999);
    expect(screen.getByText('שלב 1 מתוך 10')).toBeInTheDocument();
    await advance(1);
    expect(screen.getByText('שלב 2 מתוך 10')).toBeInTheDocument();
    expect(litPads()).toEqual([]);

    await advance(1000);
    expect(litPads()).toEqual(['red']);
    await advance(600);
    expect(litPads()).toEqual([]);
    await advance(250);
    expect(litPads()).toEqual(['blue']);
    await advance(600);
    expect(screen.getByText('התור שלך')).toBeInTheDocument();
  });

  it('shows the loss message one second after a wrong press at round 1', async () => {
    startGame();
    await advance(presentationMs(1, false));

    tap('red');
    expect(screen.queryByText('נפסלת!')).not.toBeInTheDocument();
    await advance(999);
    expect(screen.queryByText('נפסלת!')).not.toBeInTheDocument();
    await advance(1);

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('נפסלת!')).toBeInTheDocument();
    expect(within(dialog).getByText('לא השלמת אף שלב')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'אישור' })).toBeInTheDocument();
  });

  it('reports completed rounds when losing later in the game', async () => {
    startGame();
    await advance(presentationMs(1, false));
    tap('green');
    await advance(presentationMs(2, true));
    tap('green');
    tap('red');
    await advance(1000);

    expect(screen.getByText('השלמת שלב אחד')).toBeInTheDocument();
    expect(screen.getByText('שלב 2 מתוך 10')).toBeInTheDocument();
  });

  it('wins after round 10, then "אישור" returns to a fresh start', async () => {
    startGame();
    for (let round = 1; round <= 10; round++) {
      await advance(presentationMs(round, round > 1));
      for (let i = 0; i < round; i++) tap('green');
    }
    await advance(1000);

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'כל הכבוד! ניצחת!' })).toBeInTheDocument();
    expect(within(dialog).getByText('השלמת 10 שלבים')).toBeInTheDocument();
    expect(screen.getByText('שלב 10 מתוך 10')).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'אישור' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('שלב 1 מתוך 10')).toBeInTheDocument();

    mockedRandom.mockReturnValueOnce('yellow');
    fireEvent.click(screen.getByRole('button', { name: 'התחל משחק' }));
    await advance(1000);
    expect(litPads()).toEqual(['yellow']);
  });

  it('leaving for About mid-game cancels it with no highlight or timer left', async () => {
    startGame();
    await advance(1100); // a pad is lit
    expect(litPads()).toHaveLength(1);

    fireEvent.click(within(getNav()).getByRole('button', { name: 'אודות' }));
    expect(vi.getTimerCount()).toBe(0);

    fireEvent.click(within(getNav()).getByRole('button', { name: 'בית' }));
    expect(litPads()).toEqual([]);
    expect(screen.getByText('שלב 1 מתוך 10')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'התחל משחק' })).toBeInTheDocument();
  });

  it('keeps a decided result across a visit to About until "אישור"', async () => {
    startGame();
    await advance(presentationMs(1, false));
    tap('red');

    fireEvent.click(within(getNav()).getByRole('button', { name: 'אודות' }));
    await advance(1000);
    fireEvent.click(within(getNav()).getByRole('button', { name: 'בית' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('נפסלת!')).toBeInTheDocument();
  });
});
