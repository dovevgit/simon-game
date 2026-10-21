# סיימון (Simon)

משחק זיכרון בעברית לטלפון: משחזרים רצפים הולכים ומתארכים של צבעים וצלילים לאורך 10 שלבים.
אתר סטטי (React + TypeScript + Vite), ניתן להתקנה כ-PWA ופועל גם ללא אינטרנט.

האפיון המלא נמצא בתיקיית [`spec/`](spec/): `PRD.md`, `ARCHITECTURE.md`, `DESIGN.md`, `MILESTONES.md`.

## הרצה מקומית

דרוש Node.js בגרסת LTS.

```bash
npm install
npm run dev
```

ואז פותחים בדפדפן את `http://localhost:5173/simon-game/`.

פקודות נוספות: `npm run test` (בדיקות), `npm run typecheck` (בדיקת טיפוסים), `npm run build` (בנייה לתיקיית `dist/`).
