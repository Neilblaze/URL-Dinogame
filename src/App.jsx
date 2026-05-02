import './styles/styles.css';
import './styles/multiplayer.css';

import Header        from './components/Header.jsx';
import ScoreCard     from './components/ScoreCard.jsx';
import HowToCard     from './components/HowToCard.jsx';
import LegendCard    from './components/LegendCard.jsx';
import SettingsCard  from './components/SettingsCard.jsx';
import AboutCard     from './components/AboutCard.jsx';
import ActionsCard   from './components/ActionsCard.jsx';
import MobileMsg     from './components/MobileMsg.jsx';
import MultiplayerModal from './components/MultiplayerModal.jsx';
import GithubCorner  from './components/GithubCorner.jsx';

export default function App() {
  return (
    <>
      <GithubCorner />

      {/* ── Mobile fallback ── */}
      <MobileMsg />

      {/* ── Main desktop layout ── */}
      <div className="page welcome_page">
        <Header />

        <main className="bento">
          <ScoreCard />
          <HowToCard />
          <LegendCard />
          <SettingsCard />
          <AboutCard />
          <ActionsCard />
        </main>
      </div>

      <MultiplayerModal />
    </>
  );
}
