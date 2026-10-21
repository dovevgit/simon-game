# תוכנית – Milestone 1: בסיס אפליקציה ושני מסכים מעוצבים

מקורות: `MILESTONES.md` (Milestone 1), `PRD.md` §4.1, `DESIGN.md` §1.1–1.6 ו-§2, `ARCHITECTURE.md` §1, §2.1–2.2, §2.4, החלטות ראשוניות 1, 2 ו-8.

## 0. תנאי מקדים – Node.js

- **Node.js אינו מותקן כרגע במחשב** (`node`/`npm` לא נמצאו). לפני הבנייה המשתמש מתקין את גרסת **Node.js LTS** מ-nodejs.org (Windows Installer, ברירות מחדל), סוגר ופותח מחדש את Claude, ו-Claude מוודא ש-`node -v` ו-`npm -v` עובדים.
- Claude לא מתקין את Node בעצמו.

## 1. הקמת הפרויקט

הקמה ידנית בשורש הפרויקט (לא `npm create vite` לתוך תיקייה קיימת, כדי לא לדרוס את `README.md`, `.gitignore` ו-`spec/`).

**קבצים:**
| קובץ | תוכן |
|---|---|
| `package.json` | `name: "simon-game"`, `private`, `type: "module"`; סקריפטים: `dev` (`vite`), `build` (`tsc -b && vite build`), `preview` (`vite preview`), `typecheck` (`tsc -b --noEmit` או `tsc -p tsconfig.app.json --noEmit`), `test` (`vitest run`) |
| `package-lock.json` | נוצר ע"י `npm install`; גרסאות מקובעות (Lockfile) |
| `vite.config.ts` | `@vitejs/plugin-react`, `base: '/simon-game/'` (החלטה ראשונית 8); בלוק `test` ל-Vitest: `environment: 'jsdom'`, `setupFiles: './src/test/setup.ts'`, `globals: true` |
| `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json` | מבנה ה-template הרשמי של Vite ל-React-TS, `strict: true`; טיפוסים של `vitest/globals` ו-`@testing-library/jest-dom` |
| `index.html` | `<html lang="he" dir="rtl">`, `<title>סיימון</title>`, `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`, `<meta name="theme-color" content="#0A1628">`, `<div id="root">` |
| `src/vite-env.d.ts` | הפניה ל-`vite/client` |

**Dependencies:**
- רגילות: `react`, `react-dom`, `@fontsource/heebo`.
- פיתוח: `vite`, `@vitejs/plugin-react`, `typescript`, `@types/react`, `@types/react-dom`, `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`.
- גרסאות: הגרסאות היציבות העדכניות במועד ההתקנה, נעולות ב-Lockfile. לא מותקנים כעת `canvas-confetti` ו-`vite-plugin-pwa` (שייכים ל-Milestones 3 ו-7); תאימות Vite ↔ `vite-plugin-pwa` תיבדק ב-Milestone 7, ואם יתברר שגרסת Vite צריכה להשתנות – יתועד ADR.

**`.gitignore`:** כבר כולל `node_modules/`, `dist/`, `coverage/`, `*.tsbuildinfo` – אין צורך בשינוי.
**`.gitattributes`:** קיים (`* text=auto eol=lf`, `*.png binary`) – עונה לדרישה; ללא שינוי.
**`README.md`:** קיים עם תיאור קצר; מוסיפים רק סעיף קצר "הרצה מקומית" (`npm install`, `npm run dev`, הכתובת `http://localhost:5173/simon-game/`).

## 2. מבנה קוד המקור

```text
src/
  main.tsx                 # createRoot, ייבוא הגופן ו-index.css
  App.tsx                  # App Shell: מחזיק screen ('home' | 'about') ב-useState
  index.css                # CSS Variables, reset, RTL, layout, safe-area
  game/
    colors.ts              # רשימת הצבעים: id, תווית עברית, grid-area, משתנה CSS
  components/
    BottomNav.tsx / .css   # פס ניווט "בית" / "אודות"
    SimonBoard.tsx / .css  # לוח עגול, 4 כפתורי רבע + דיסק מרכזי
  screens/
    HomeScreen.tsx / .css  # כותרת, חיווי שלב, לוח, אזור סטטוס, כפתור
    AboutScreen.tsx / .css # כותרת, כרטיס "על המשחק", היסטוריה ריקה
  test/
    setup.ts               # import '@testing-library/jest-dom/vitest'
  App.test.tsx             # בדיקות Render/Navigation
```

ללא Router: המעבר בין המסכים הוא החלפת רכיב לפי `screen` ב-`App` (ARCHITECTURE §2.1), ולכן אין טעינת דף מחדש ואין צורך ב-Rewrite ב-GitHub Pages.

## 3. פירוט רכיבים

### 3.1 `main.tsx` + גופן
- ייבוא `@fontsource/heebo/400.css`, `600.css`, `700.css` בלבד (Regular, Semibold, Bold).
- `font-family: 'Heebo', Arial, sans-serif` ב-`body`.

### 3.2 `index.css` – שפה חזותית
- **CSS Variables** (DESIGN §2.1): `--green #00D26A`, `--red #FF3B30`, `--yellow #FFD600`, `--blue #00A3FF`, `--charcoal #0F0F0F`, `--soft-gray #E5E5E5`, `--white #FFFFFF`, `--bg #0A1628`, `--surface #12213A`, `--border #1E3556`.
- **ריווח:** `--space-1: 8px`, `--space-2: 12px`, `--space-3: 16px`, `--space-4: 24px`.
- **טיפוגרפיה (DESIGN §2.2):** H1 32/700, H2 24/700, H3 20/600, Body 16/400, Caption 14/400, Button 16/600.
- **Layout (DESIGN §1.6):** `html, body` ברקע `--bg`; מיכל `.app` ברוחב `100%`, `max-width: 480px`, ממורכז (`margin-inline: auto`), `min-height: 100dvh`, `display: flex; flex-direction: column`; `padding` עם `env(safe-area-inset-*)`; `overflow-x: hidden`. התוכן גולל (`flex: 1; overflow-y: auto`) ופס הניווט נשאר בתחתית.
- `touch-action: manipulation`, `-webkit-tap-highlight-color: transparent`; `user-select: none` על הלוח והכפתורים.
- `@media (prefers-reduced-motion: reduce)` – ביטול transitions.
- **Primary Button:** רקע `--blue`, טקסט לבן 16/600, רחב (`width: min(100%, 320px)`), `border-radius: 999px`, צל רך, גובה ≥ `44px`; מצב `:active`/`:focus-visible` ברור.

### 3.3 `game/colors.ts`
מערך של ארבעה צבעים לפי סדר מרחבי (DESIGN §1.1, §1.5):

| id | תווית (aria-label) | מיקום (`grid-area`) |
|---|---|---|
| `green` | ירוק | למעלה-שמאל |
| `red` | אדום | למעלה-ימין |
| `yellow` | צהוב | למטה-שמאל |
| `blue` | כחול | למטה-ימין |

טיפוס `ColorId = 'green' | 'red' | 'yellow' | 'blue'` – יישמש גם ב-Milestone 2.

### 3.4 `SimonBoard` (החלטה ראשונית 1)
- מיכל עגול (`aspect-ratio: 1`, `width: min(100%, 340px)` בערך, מותאם כך שהכל ייכנס ב-Viewport טלפון טיפוסי), רקע `--charcoal`, `border-radius: 50%`, מסגרת `--border`, צל רך.
- `display: grid; grid-template: "green red" 1fr "yellow blue" 1fr / 1fr 1fr; gap` עבה (פסי ההפרדה הכהים). **`direction: ltr`** על המיכל כדי שהסידור המרחבי לא יתהפך ב-RTL.
- כל רבע: `<button type="button" aria-label="ירוק">` וכו', צבע הרקע מהמשתנה, פינה חיצונית אחת מעוגלת (`border-top-left-radius: 100%` לירוק, וכן הלאה), בלי טקסט גלוי (כמו ב-Mockups).
- דיסק מרכזי: `div` עם `aria-hidden`, `pointer-events: none`, ממוקם `absolute` במרכז, רקע כהה וגבול `--border`; **ריק** (DESIGN §1.5).
- Props לעתיד בלבד אם נדרשים כעת – ב-Milestone זה **אין** Glow/עמעום/לחיצה פעילה; הכפתורים מוצגים אך אינם עושים דבר (בלי `onClick`). לא מוסיפים לוגיקה שאינה נדרשת.

### 3.5 `HomeScreen` – מצב "לפני תחילת משחק" בלבד
מלמעלה למטה (Wireframes + Mockups):
1. כותרת `<h1>סיימון</h1>` ממורכזת, וקו הפרדה דק בצבע `--border` מתחתיה.
2. חיווי שלב: **"שלב 1 מתוך 10"** (H3), עם בידוד כיווניות למספרים לפי הצורך (DESIGN §2.5).
3. שורת סטטוס (`<p aria-live="polite">`) – ריקה במצב זה (שומר מקום קבוע כדי שהלוח לא יקפוץ ב-Milestone 2).
4. `SimonBoard`.
5. כפתור ראשי **"התחל משחק"** – ללא פעולה בשלב זה.

### 3.6 `AboutScreen`
1. כותרת `<h1>אודות</h1>` (DESIGN §1.2; ה-Mockup מציג "סיימון" אך המסמך וה-Wireframes קובעים "אודות").
2. כרטיס (Surface + Border + פינות מעוגלות) עם `<h2>על המשחק</h2>` ושורות ההוראות המחייבות (DESIGN §1.5):
   - "זכור את רצף הצבעים שמוצג."
   - "הקש על הצבעים באותו סדר."
   - "נסה להגיע עד שלב 10!"
   - "אם הצלילים לא נשמעים באייפון – בדוק שמתג השקט כבוי."
3. `<h2>10 המשחקים האחרונים</h2>`.
4. חיווי ריק: **"עדיין אין משחקים שמורים."**
5. **ללא** כפתור "מחק היסטוריה" (מוצג רק כשיש רשומות – Milestone 5). אין קריאה ל-`localStorage` ב-Milestone זה.

### 3.7 `BottomNav`
- `<nav aria-label="ניווט ראשי">` עם שני `<button>`: **"בית"** (ימין, ראשון ב-RTL) ו-**"אודות"**.
- רקע `--surface`, גבול `--border`, פינות מעוגלות, קו הפרדה בין האפשרויות (כמו ב-Mockups); האפשרות הפעילה בכחול (`--blue`, DESIGN §1.5) ו-`aria-current="page"`.
- איקון קטן מעל התווית – **לא** בשלב זה (מותר אך אינו נדרש; פשטות). גובה ≥ `44px`.

### 3.8 `App`
- `const [screen, setScreen] = useState<'home' | 'about'>('home')`.
- מציג `HomeScreen` או `AboutScreen` בתוך אזור התוכן, ואת `BottomNav` בתחתית.
- אין מצב משחק ב-Milestone זה; ב-Milestone 2 יתווסף `useGame` ל-`App`.

## 4. בדיקות אוטומטיות (`src/App.test.tsx`)

עם Vitest + React Testing Library:
1. **Render:** מסך הבית מציג "סיימון", "שלב 1 מתוך 10", כפתור "התחל משחק", וארבעה כפתורים עם השמות ירוק/אדום/צהוב/כחול.
2. **סדר הלוח:** סדר הכפתורים ב-DOM הוא ירוק, אדום, צהוב, כחול (תואם ל-`grid-area`).
3. **ניווט:** לחיצה על "אודות" מציגה "על המשחק" ו"עדיין אין משחקים שמורים.", והלוח לא מוצג; לחיצה על "בית" מחזירה את הלוח. `aria-current` עובר לאפשרות הפעילה.
4. **אין מסך שלישי:** בפס הניווט יש בדיוק שני כפתורים.
5. **אין כפתור "מחק היסטוריה"** במסך אודות.

## 5. אימות עצמי בסיום הבנייה (ע"י Claude)

1. `npm run typecheck`, `npm run test`, `npm run build` – כולם עוברים.
2. `npm run dev` והצגה בדפדפן המובנה בכתובת `http://localhost:5173/simon-game/`:
   - Viewport מובייל (375×812): הכל קריא, אין גלילה אופקית (בדיקת `document.documentElement.scrollWidth <= innerWidth`), פס הניווט גלוי.
   - Viewport רחב: העמוד ממורכז ברוחב ≤ 480px.
   - מעבר בית ↔ אודות ללא טעינה מחדש (בדיקה שמשתנה ב-`window` נשמר אחרי המעבר).
   - השוואה חזותית ל-Mockups (צבעים, סידור הלוח, כרטיסים, ניווט).
3. סגירת שרת הפיתוח, סימון 🟡 ליד Milestone 1 ב-`MILESTONES.md`, ועדכון "פקודות הרצה" ב-`CLAUDE.md` (`npm run dev`, `npm run test`).
4. אין commit.

## 6. מחוץ לתחום ב-Milestone זה

לוגיקת משחק, הארה/Glow, צלילים, קונפטי, השהיה, היסטוריה ו-`localStorage`, Dialog מחיקה, PWA/אייקונים, Workflow של GitHub Actions. אין Backend, Database או `.env`.

## 7. מיפוי ל-Definition of Done

| תנאי | איך מתקיים |
|---|---|
| build + typecheck עוברים; בדיקת Render/Navigation עוברת | §1 סקריפטים, §4 בדיקות, §5.1 |
| שני מסכים, מעבר ללא רענון, אין מסך שלישי | §3.7–3.8, בדיקות 3–4, §5.2 |
| ארבעת אזורי הלוח במיקום נכון, חיווי שלב, "התחל משחק"; אודות עם הסבר והודעת היסטוריה ריקה | §3.3–3.6, בדיקות 1–2 |
| עברית, RTL, נוח ב-Smartphone, ללא גלילה אופקית; ב-Desktop ממורכז | `index.html`, §3.2, §5.2 |
| ללא יכולות מחוץ ל-PRD, ללא Backend/DB | §6 |
