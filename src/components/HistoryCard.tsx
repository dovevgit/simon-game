import { completedRoundsText } from '../game/resultText.ts';
import type { GameResult } from '../history/historyStorage.ts';
import './HistoryCard.css';

const dateFormat = new Intl.DateTimeFormat('he-IL', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

type HistoryCardProps = {
  result: GameResult;
};

export default function HistoryCard({ result }: HistoryCardProps) {
  const won = result.outcome === 'win';
  return (
    <li className="history-card">
      <div className="history-card__main">
        <p className="history-card__rounds">{completedRoundsText(result.completedRounds)}</p>
        <p className={`history-card__outcome history-card__outcome--${result.outcome}`}>
          {won ? 'ניצחון' : 'הפסד'}
        </p>
      </div>
      {/* Isolated so the numbers keep their order inside the RTL row */}
      <time className="history-card__time" dateTime={result.finishedAt} dir="ltr">
        {dateFormat.format(new Date(result.finishedAt))}
      </time>
    </li>
  );
}
