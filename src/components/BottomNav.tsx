import './BottomNav.css';

export type Screen = 'home' | 'about';

const NAV_ITEMS: readonly { screen: Screen; label: string }[] = [
  { screen: 'home', label: 'בית' },
  { screen: 'about', label: 'אודות' },
];

type BottomNavProps = {
  current: Screen;
  onNavigate: (screen: Screen) => void;
};

export default function BottomNav({ current, onNavigate }: BottomNavProps) {
  return (
    <nav className="bottom-nav" aria-label="ניווט ראשי">
      {NAV_ITEMS.map((item) => (
        <button
          key={item.screen}
          type="button"
          className="bottom-nav__item"
          aria-current={current === item.screen ? 'page' : undefined}
          onClick={() => onNavigate(item.screen)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}
