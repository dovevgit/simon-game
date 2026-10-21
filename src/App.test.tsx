import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App.tsx';

function getNav() {
  return screen.getByRole('navigation', { name: 'ניווט ראשי' });
}

describe('App shell', () => {
  it('renders the home screen before a game starts', () => {
    render(<App />);

    expect(screen.getByRole('heading', { level: 1, name: 'סיימון' })).toBeInTheDocument();
    expect(screen.getByText('שלב 1 מתוך 10')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'התחל משחק' })).toBeInTheDocument();
  });

  it('places the four pads in board order: green, red, yellow, blue', () => {
    render(<App />);

    const board = screen.getByRole('group', { name: 'לוח המשחק' });
    const pads = within(board).getAllByRole('button');
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
    expect(screen.getByRole('group', { name: 'לוח המשחק' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'התחל משחק' })).toBeInTheDocument();
  });
});
