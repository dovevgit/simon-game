import './AboutScreen.css';

const INSTRUCTIONS = [
  'זכור את רצף הצבעים שמוצג.',
  'הקש על הצבעים באותו סדר.',
  'נסה להגיע עד שלב 10!',
  'אם הצלילים לא נשמעים באייפון – בדוק שמתג השקט כבוי.',
];

export default function AboutScreen() {
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
      <p className="about__empty">עדיין אין משחקים שמורים.</p>
    </section>
  );
}
