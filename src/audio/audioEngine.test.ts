type AudioEngine = typeof import('./audioEngine.ts');

function fakeParam() {
  return {
    value: 0,
    setValueAtTime: vi.fn(),
    linearRampToValueAtTime: vi.fn(),
    cancelScheduledValues: vi.fn(),
  };
}

type FakeOscillator = {
  type: string;
  frequency: { value: number };
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  onended: null | (() => void);
};

const oscillators: FakeOscillator[] = [];

class FakeAudioContext {
  static nextState: 'running' | 'suspended' = 'running';
  static resumeFails = false;

  state = 'suspended';
  currentTime = 0;
  destination = {};

  resume = vi.fn(async () => {
    if (FakeAudioContext.resumeFails) throw new Error('blocked');
    this.state = FakeAudioContext.nextState;
  });

  createOscillator() {
    const oscillator: FakeOscillator = {
      type: 'sine',
      frequency: { value: 0 },
      connect: vi.fn(),
      disconnect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null,
    };
    oscillators.push(oscillator);
    return oscillator;
  }

  createGain() {
    return { gain: fakeParam(), connect: vi.fn(), disconnect: vi.fn() };
  }
}

async function loadEngine(): Promise<AudioEngine> {
  vi.resetModules();
  return import('./audioEngine.ts');
}

beforeEach(() => {
  oscillators.length = 0;
  FakeAudioContext.nextState = 'running';
  FakeAudioContext.resumeFails = false;
  vi.stubGlobal('AudioContext', FakeAudioContext);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('audioEngine.unlock', () => {
  it('succeeds when the context is running', async () => {
    const engine = await loadEngine();
    await expect(engine.unlock()).resolves.toBeUndefined();
  });

  it('fails when Web Audio is not supported', async () => {
    vi.stubGlobal('AudioContext', undefined);
    const engine = await loadEngine();
    await expect(engine.unlock()).rejects.toThrow();
  });

  it('fails when resume() is rejected', async () => {
    FakeAudioContext.resumeFails = true;
    const engine = await loadEngine();
    await expect(engine.unlock()).rejects.toThrow();
  });

  it('fails when the context stays suspended', async () => {
    FakeAudioContext.nextState = 'suspended';
    const engine = await loadEngine();
    await expect(engine.unlock()).rejects.toThrow();
  });
});

describe('audioEngine tones', () => {
  it('uses four distinct pitches', async () => {
    const engine = await loadEngine();
    const pitches = Object.values(engine.TONE_FREQUENCIES);
    expect(new Set(pitches).size).toBe(4);
  });

  it('does nothing (and does not throw) before unlock', async () => {
    const engine = await loadEngine();
    expect(() => engine.startTone('green')()).not.toThrow();
    expect(() => engine.playWin()).not.toThrow();
    expect(() => engine.stopAll()).not.toThrow();
    expect(oscillators).toHaveLength(0);
  });

  it('plays the color pitch and stops it with its own stop function', async () => {
    const engine = await loadEngine();
    await engine.unlock();

    const stop = engine.startTone('red');
    expect(oscillators).toHaveLength(1);
    expect(oscillators[0].frequency.value).toBe(engine.TONE_FREQUENCIES.red);
    expect(oscillators[0].start).toHaveBeenCalled();

    stop();
    expect(oscillators[0].stop).toHaveBeenCalled();
  });

  it('keeps one color tone at a time; a stale stop does not cut the newer tone', async () => {
    const engine = await loadEngine();
    await engine.unlock();

    const stopFirst = engine.startTone('green');
    engine.startTone('blue');
    expect(oscillators[0].stop).toHaveBeenCalled();

    stopFirst();
    expect(oscillators[1].stop).not.toHaveBeenCalled();
  });

  it('stopAll silences tones and motifs', async () => {
    const engine = await loadEngine();
    await engine.unlock();

    engine.startTone('yellow');
    engine.playLoss();
    oscillators.forEach((oscillator) => oscillator.stop.mockClear());

    engine.stopAll();
    oscillators.forEach((oscillator) => expect(oscillator.stop).toHaveBeenCalled());
  });
});
