import type { AppView } from '../types';

interface BottomNavProps {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
  onCreatePress: () => void;
}

export function BottomNav({ activeView, onNavigate, onCreatePress }: BottomNavProps) {
  return (
    <nav className="tab-nav tab-nav--bottom" aria-label="Main navigation">
      <button
        type="button"
        className={`tab-btn ${activeView === 'home' ? 'tab-btn--active' : ''}`}
        onClick={() => onNavigate('home')}
      >
        <span className="tab-icon" aria-hidden="true">⌂</span>
        Home
      </button>

      <button
        type="button"
        className="tab-btn tab-btn--create"
        onClick={onCreatePress}
        aria-label="Create new song"
      >
        <span className="tab-create-icon" aria-hidden="true">+</span>
      </button>

      <button
        type="button"
        className={`tab-btn ${activeView === 'library' ? 'tab-btn--active' : ''}`}
        onClick={() => onNavigate('library')}
      >
        <span className="tab-icon" aria-hidden="true">♫</span>
        Library
      </button>
    </nav>
  );
}
