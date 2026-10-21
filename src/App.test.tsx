import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import confetti from 'canvas-confetti';
import App from './App.tsx';
import * as audio from './audio/audioEngine.ts';
import type { ColorId } from './game/colors.ts';
import { randomColor } from './game/random.ts';

vi.mock('./game/random.ts', () => ({ randomColor: vi.fn(() => 'green') }));
vi.mock('./audio/audioEngine.ts', () => ({
  unlock: vi.fn(),
  startTone: vi.fn(),
  playWin: vi.fn(),
  playLoss: vi.fn(),
  stopAll: vi.fn(),
}));
vi.mock('canvas-confetti', () => ({ default: Object.assign(vi.fn(), { reset: vi.fn() }) }));

const mockedRandom = vi.mocked(randomColor);
const mockedAudio = vi.mocked(audio);
const mockedConfetti = vi.mocked(confetti);

// Stop functions returned by startTone, in call order.
const toneStops: ReturnType<typeof vi.fn>[] = [];

function startedTones(): ColorId[] {
  return mockedAudio.startTone.mock.calls.map(([color]) => color);
}

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

// The audio unlock resolves asynchronously before the game starts.
async function clickStart() {
  fireEvent.click(screen.getByRole('button', { name: 'התחל משחק' }));
  await act(async () => {});
}

async function startGame() {
  render(<App />);
  await clickStart();
}

beforeEach(() => {
  vi.clearAllMocks();
  mockedRandom.mockReset();
  mockedRandom.mockReturnValue('green');
  mockedAudio.unlock.mockReset();
  mockedAudio.unlock.mockResolvedValue(undefined);
  toneStops.length = 0;
  mockedAudio.startTone.mockImplementation(() => {
    const stop = vi.fn();
    toneStops.push(stop);
    return stop;
  });
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

  it('presents round 1 with the required pacing, then hands over to the player', async () => {
    mockedRandom.mockReturnValueOnce('red');
    await startGame();

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
    await startGame();
    await advance(1000);

    tap('red'); // wrong color, but input is blocked
    await advance(3000);
    expect(screen.queryByText('נפסלת!')).not.toBeInTheDocument();
    expect(screen.getByText('התור שלך')).toBeInTheDocument();
  });

  it('lights the pressed pad for at least 300ms, or while held', async () => {
    await startGame();
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
    await startGame();
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
    await startGame();
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
    await startGame();
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
    await startGame();
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
    await clickStart();
    await advance(1000);
    expect(litPads()).toEqual(['yellow']);
  });

  it('keeps a decided result across a visit to About until "אישור"', async () => {
    await startGame();
    await advance(presentationMs(1, false));
    tap('red');

    fireEvent.click(within(getNav()).getByRole('button', { name: 'אודות' }));
    await advance(1000);
    fireEvent.click(within(getNav()).getByRole('button', { name: 'בית' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('נפסלת!')).toBeInTheDocument();
  });
});

describe('Pause and resume', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  });

  function goTo(name: 'בית' | 'אודות') {
    fireEvent.click(within(getNav()).getByRole('button', { name }));
  }

  function setVisibility(state: 'hidden' | 'visible') {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: state });
    fireEvent(document, new Event('visibilitychange'));
  }

  async function clickResume() {
    fireEvent.click(screen.getByRole('button', { name: 'המשך משחק' }));
    await act(async () => {});
  }

  function expectPaused(round: number) {
    expect(screen.getByText('המשחק מושהה')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'המשך משחק' })).toBeInTheDocument();
    expect(screen.getByText(`שלב ${round} מתוך 10`)).toBeInTheDocument();
    expect(getBoard()).toHaveClass('simon-board--dimmed');
    expect(litPads()).toEqual([]);
  }

  // Reaches round 2 (sequence red, blue) and waits for the player's turn.
  async function reachRound2() {
    mockedRandom.mockReturnValueOnce('red').mockReturnValueOnce('blue');
    await startGame();
    await advance(presentationMs(1, false));
    tap('red');
    await advance(presentationMs(2, true));
    expect(screen.getByText('התור שלך')).toBeInTheDocument();
  }

  it('shows "המשך משחק" only in a paused game', async () => {
    render(<App />);
    expect(screen.queryByRole('button', { name: 'המשך משחק' })).not.toBeInTheDocument();
    await clickStart();
    expect(screen.queryByRole('button', { name: 'המשך משחק' })).not.toBeInTheDocument();
  });

  it('leaving for About mid-presentation pauses it at once, with no highlight, sound or timer left', async () => {
    await startGame();
    await advance(1100); // a pad is lit and its tone plays
    expect(litPads()).toHaveLength(1);

    goTo('אודות');
    expect(mockedAudio.stopAll).toHaveBeenCalled();
    expect(toneStops[0]).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);

    goTo('בית');
    expectPaused(1);
    // No automatic resume.
    await advance(5000);
    expectPaused(1);
    expect(startedTones()).toHaveLength(1);
  });

  it('ignores board presses while paused', async () => {
    await startGame();
    await advance(presentationMs(1, false));
    goTo('אודות');
    goTo('בית');
    mockedAudio.startTone.mockClear();

    tap('red');
    await advance(3000);
    expect(startedTones()).toEqual([]);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expectPaused(1);
  });

  it('"המשך משחק" replays the whole sequence of the same round, even after a partial input', async () => {
    await reachRound2();
    tap('red'); // first of two colors

    goTo('אודות');
    goTo('בית');
    expectPaused(2);

    mockedAudio.startTone.mockClear();
    await clickResume();
    expect(mockedAudio.unlock).toHaveBeenCalledTimes(2);
    expect(screen.getByText('המשחק מציג את הרצף')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'המשך משחק' })).not.toBeInTheDocument();

    await advance(999);
    expect(litPads()).toEqual([]);
    await advance(1);
    expect(litPads()).toEqual(['red']);
    await advance(850);
    expect(litPads()).toEqual(['blue']);
    await advance(600);
    expect(startedTones()).toEqual(['red', 'blue']);
    expect(screen.getByText('שלב 2 מתוך 10')).toBeInTheDocument();
    expect(screen.getByText('התור שלך')).toBeInTheDocument();

    // The input starts over: one press is not enough, and the second one completes the round.
    tap('red');
    expect(screen.getByText('התור שלך')).toBeInTheDocument();
    tap('blue');
    expect(screen.getByText('המשחק מציג את הרצף')).toBeInTheDocument();
    await advance(1000);
    expect(screen.getByText('שלב 3 מתוך 10')).toBeInTheDocument();
  });

  it('pausing between rounds resumes the next round with no extra color', async () => {
    mockedRandom.mockReturnValueOnce('red').mockReturnValueOnce('blue');
    await startGame();
    await advance(presentationMs(1, false));
    tap('red');
    await advance(500); // waiting before round 2 is shown

    goTo('אודות');
    goTo('בית');
    expectPaused(2);

    mockedAudio.startTone.mockClear();
    await clickResume();
    await advance(presentationMs(2, false));
    expect(startedTones()).toEqual(['red', 'blue']);
    expect(mockedRandom).toHaveBeenCalledTimes(2);
    expect(screen.getByText('התור שלך')).toBeInTheDocument();
  });

  it('keeps the game paused when audio cannot be enabled, and allows a retry', async () => {
    await startGame();
    goTo('אודות');
    goTo('בית');

    mockedAudio.unlock.mockRejectedValueOnce(new Error('blocked'));
    await clickResume();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'לא הצלחנו להפעיל את הצליל. הקש שוב על הכפתור.',
    );
    await advance(5000);
    expectPaused(1);

    await clickResume();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('המשחק מציג את הרצף')).toBeInTheDocument();
  });

  it('a quick double click on "המשך משחק" resumes once', async () => {
    await startGame();
    goTo('אודות');
    goTo('בית');
    mockedAudio.unlock.mockClear();
    mockedAudio.startTone.mockClear();

    const button = screen.getByRole('button', { name: 'המשך משחק' });
    fireEvent.click(button);
    fireEvent.click(button);
    await act(async () => {});
    expect(mockedAudio.unlock).toHaveBeenCalledTimes(1);

    await advance(presentationMs(1, false));
    expect(startedTones()).toEqual(['green']);
    expect(screen.getByText('התור שלך')).toBeInTheDocument();
  });

  it('hiding the app pauses it and showing it again does not resume', async () => {
    await startGame();
    await advance(1100);

    setVisibility('hidden');
    expect(mockedAudio.stopAll).toHaveBeenCalled();
    expect(toneStops[0]).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);

    setVisibility('visible');
    await advance(5000);
    expectPaused(1);
    expect(startedTones()).toHaveLength(1);
  });

  it('pagehide pauses the game', async () => {
    await startGame();
    await advance(presentationMs(1, false));
    fireEvent(window, new Event('pagehide'));
    expectPaused(1);
  });

  it('hiding the app does not affect a decided result', async () => {
    await startGame();
    await advance(presentationMs(1, false));
    tap('red');

    setVisibility('hidden');
    await advance(1000);
    setVisibility('visible');
    expect(screen.getByText('נפסלת!')).toBeInTheDocument();
    expect(screen.queryByText('המשחק מושהה')).not.toBeInTheDocument();
  });
});

describe('Sound and confetti', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function winGame() {
    await startGame();
    for (let round = 1; round <= 10; round++) {
      await advance(presentationMs(round, round > 1));
      for (let i = 0; i < round; i++) tap('green');
    }
  }

  it('does not start a silent game when audio cannot be enabled, and allows a retry', async () => {
    mockedAudio.unlock.mockRejectedValueOnce(new Error('blocked'));
    await startGame();

    expect(screen.getByRole('alert')).toHaveTextContent(
      'לא הצלחנו להפעיל את הצליל. הקש שוב על הכפתור.',
    );
    expect(screen.queryByText('המשחק מציג את הרצף')).not.toBeInTheDocument();
    await advance(5000);
    expect(mockedAudio.startTone).not.toHaveBeenCalled();
    expect(litPads()).toEqual([]);

    await clickStart();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('המשחק מציג את הרצף')).toBeInTheDocument();
    expect(mockedAudio.unlock).toHaveBeenCalledTimes(2);
  });

  it('plays the color tone together with each flash of the sequence', async () => {
    mockedRandom.mockReturnValueOnce('red');
    await startGame();

    await advance(1000);
    expect(startedTones()).toEqual(['red']);
    expect(toneStops[0]).not.toHaveBeenCalled();
    await advance(600);
    expect(toneStops[0]).toHaveBeenCalled();
  });

  it('sounds a press immediately and keeps it for at least 300ms', async () => {
    await startGame();
    await advance(presentationMs(1, false));
    mockedAudio.startTone.mockClear();
    toneStops.length = 0;

    fireEvent.pointerDown(getPad('green'));
    expect(startedTones()).toEqual(['green']);
    fireEvent.pointerUp(window);
    await advance(299);
    expect(toneStops[0]).not.toHaveBeenCalled();
    await advance(1);
    expect(toneStops[0]).toHaveBeenCalled();
  });

  it('a wrong press sounds its color at once and the loss sound one second later, without confetti', async () => {
    await startGame();
    await advance(presentationMs(1, false));
    mockedAudio.startTone.mockClear();

    tap('blue');
    expect(startedTones()).toEqual(['blue']);
    await advance(999);
    expect(mockedAudio.playLoss).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await advance(1);
    expect(mockedAudio.playLoss).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(mockedAudio.playWin).not.toHaveBeenCalled();
    expect(mockedConfetti).not.toHaveBeenCalled();
  });

  it('a win plays the win sound and confetti once, cleared by "אישור"', async () => {
    await winGame();
    await advance(999);
    expect(mockedAudio.playWin).not.toHaveBeenCalled();
    expect(mockedConfetti).not.toHaveBeenCalled();
    await advance(1);

    expect(mockedAudio.playWin).toHaveBeenCalledTimes(1);
    expect(mockedConfetti).toHaveBeenCalled();
    const bursts = mockedConfetti.mock.calls.length;
    await advance(5000);
    expect(mockedConfetti).toHaveBeenCalledTimes(bursts);
    expect(mockedAudio.playLoss).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'אישור' }));
    expect(mockedConfetti.reset).toHaveBeenCalled();
    expect(mockedAudio.stopAll).toHaveBeenCalled();
  });

  it('skips confetti when reduced motion is preferred', async () => {
    vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('reduce') }));
    try {
      await winGame();
      await advance(1000);
      expect(mockedAudio.playWin).toHaveBeenCalledTimes(1);
      expect(mockedConfetti).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('leaving for About mid-game silences all sound', async () => {
    await startGame();
    await advance(1100); // a tone is playing
    expect(startedTones()).toHaveLength(1);

    fireEvent.click(within(getNav()).getByRole('button', { name: 'אודות' }));
    expect(mockedAudio.stopAll).toHaveBeenCalled();
    expect(toneStops[0]).toHaveBeenCalled();

    await advance(5000);
    expect(startedTones()).toHaveLength(1);
  });
});
