import { useEffect, useRef } from 'react';
import { completedRoundsText } from '../game/resultText.ts';
import './ResultDialog.css';

type ResultDialogProps = {
  outcome: 'won' | 'lost';
  completedRounds: number;
  onConfirm: () => void;
};

export default function ResultDialog({ outcome, completedRounds, onConfirm }: ResultDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();
  }, []);

  return (
    <div className="result-scrim">
      <div
        className="result-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="result-title"
        aria-describedby="result-detail"
      >
        {outcome === 'won' ? (
          <h2 id="result-title" className="result-dialog__title result-dialog__title--won">
            <span className="result-dialog__accent">כל הכבוד!</span> ניצחת!
          </h2>
        ) : (
          <h2 id="result-title" className="result-dialog__title result-dialog__title--lost">
            נפסלת!
          </h2>
        )}
        <p id="result-detail" className="result-dialog__detail">
          {completedRoundsText(completedRounds)}
        </p>
        <button ref={confirmRef} type="button" className="btn-primary" onClick={onConfirm}>
          אישור
        </button>
      </div>
    </div>
  );
}
