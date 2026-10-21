import { useState } from 'react';
import ConfirmDialog from '../components/ConfirmDialog.tsx';
import HistoryCard from '../components/HistoryCard.tsx';
import type { HistoryView } from '../history/useHistory.ts';
import './AboutScreen.css';

const INSTRUCTIONS = [
  'זכור את רצף הצבעים שמוצג.',
  'הקש על הצבעים באותו סדר.',
  'נסה להגיע עד שלב 10!',
  'אם הצלילים לא נשמעים באייפון – בדוק שמתג השקט כבוי.',
];

type AboutScreenProps = {
  history: HistoryView;
};

export default function AboutScreen({ history }: AboutScreenProps) {
  const [confirming, setConfirming] = useState(false);
  const { results } = history;

  function openConfirm() {
    history.dismissDeleteError();
    setConfirming(true);
  }

  function handleDelete() {
    setConfirming(false);
    history.clear();
  }

  return (
    <section className="about">
      <h1 className="screen-title">אודות</h1>

      <div className="card about__intro">
        <h2 className="about__heading">על המשחק</h2>
        {INSTRUCTIONS.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>

      <h2 className="about__heading">10 המשחקים האחרונים</h2>
      {results.length > 0 ? (
        <ol className="about__list">
          {results.map((result) => (
            <HistoryCard key={result.id} result={result} />
          ))}
        </ol>
      ) : history.loadError ? (
        <p className="about__error" role="alert">
          לא ניתן לקרוא את ההיסטוריה במכשיר זה.
        </p>
      ) : (
        <p className="about__empty">עדיין אין משחקים שמורים.</p>
      )}

      {history.deleteError && (
        <p className="about__error" role="alert">
          המחיקה נכשלה. ההיסטוריה לא נמחקה.
        </p>
      )}

      {results.length > 0 && (
        <button type="button" className="about__delete" onClick={openConfirm}>
          מחק היסטוריה
        </button>
      )}

      {confirming && (
        <ConfirmDialog onCancel={() => setConfirming(false)} onConfirm={handleDelete} />
      )}
    </section>
  );
}
