# תוכנית – Milestone 6: פרסום ב-GitHub Pages ו-CI

מקורות: `MILESTONES.md` (Milestone 6), `ARCHITECTURE.md` §1 (CI/CD ו-Hosting), §2.8 (HTTPS, הרשאות מינימליות), §2.9 (Pipeline, נתיב פריסה, Repository ציבורי), §2.10, החלטה ראשונית 8, `DESIGN.md` §1.6 (נגישות בסיסית, כיוון אנכי), `PRD.md` §5.

## 0. המצב הנוכחי (נבדק ב-21.10.2026)

- ה-Repository `dovevgit/simon-game` **ציבורי** – אין צורך לשנות Visibility.
- **GitHub Pages כבר מופעל, אבל במצב "Deploy from a branch"**: הכתובת `https://dovevgit.github.io/simon-game/` מגישה את `index.html` הגולמי מקוד המקור (עם `/src/main.tsx`), ולכן היום מוצג דף ריק. יש להעביר את המקור ל-**GitHub Actions** (§3) – אחרת ה-Workflow לא יוכל לפרסם.
- `vite.config.ts` כבר מוגדר עם `base: '/simon-game/'` (החלטה ראשונית 8); `dist/` כבר ב-`.gitignore`.
- Node.js מקומי: `v24` (LTS). Vite 8 דורש Node 20.19+ / 22.12+.
- `gh` (GitHub CLI) אינו מותקן – לא נדרש; הבדיקות מול GitHub נעשות דרך הדפדפן ו-API ציבורי לקריאה בלבד.

## 1. שינויים בקבצים

```text
.github/workflows/deploy.yml   # חדש: בדיקות + Build + פריסה ל-Pages
index.html                     # <link rel="icon" href="data:,"> – מונע בקשת favicon.ico שמחזירה 404 (האייקון האמיתי ב-Milestone 7)
README.md                      # שורה עם כתובת האתר הפרוס ותג סטטוס של ה-Workflow
CLAUDE.md                      # "פקודות הרצה": כתובת Production
```

אין שינוי בקוד האפליקציה.

## 2. ה-Workflow – `.github/workflows/deploy.yml` (ARCHITECTURE §2.9)

- **שם:** `Deploy to GitHub Pages`.
- **טריגרים:** `push` לענף `main`, וגם `workflow_dispatch` (הרצה חוזרת בלחיצה, לגיבוי בלבד – אינה חלק מהזרימה הרגילה).
- **הרשאות ברמת ה-Workflow:** `contents: read`, `pages: write`, `id-token: write` – ולא יותר.
- **`concurrency`:** קבוצה `pages`, `cancel-in-progress: false` – פריסה אחת בכל רגע, בלי לקטוע פריסה שכבר רצה.
- **Job `build`** (`ubuntu-latest`):
  1. `actions/checkout`
  2. `actions/setup-node` עם `node-version: 24` ו-`cache: npm`
  3. `npm ci`
  4. `npm run typecheck`
  5. `npm run test`
  6. `npm run build`
  7. `actions/configure-pages`
  8. `actions/upload-pages-artifact` עם `path: dist`
- **Job `deploy`** (`needs: build`): `environment: github-pages` עם `url` מתוצאת הפריסה, `actions/deploy-pages`.
- כל שלב שנכשל עוצר את ה-Job, ו-`deploy` לא רץ (`needs`) – **Build שנכשל לא נפרס**.
- גרסאות ה-Actions: הגרסה הראשית (Major) העדכנית של כל Action רשמי ב-GitHub Marketplace, נבדקת בזמן הבנייה ונעולה ל-Tag ראשי (למשל `@v4`).

## 3. הגדרות שהמשתמש מבצע ב-GitHub (הדרכה צעד אחר צעד)

Claude לא משנה הגדרות בחשבון. בסיום הבנייה Claude ידריך:
1. להיכנס ל-`https://github.com/dovevgit/simon-game` → **Settings** → **Pages**.
2. תחת **Build and deployment** → **Source**: לבחור **GitHub Actions** (במקום "Deploy from a branch").
3. אין צורך לשמור דבר נוסף; Visibility כבר ציבורי.

אם בהמשך תופיע הודעה ש-Environment `github-pages` חוסם את `main` – הדרכה ל-**Settings → Environments → github-pages → Deployment branches** לאפשר את `main`.

## 4. סדר העבודה (כולל ה-Push)

ה-Milestone **דורש Push** כדי להשלים אותו (הפריסה רצה רק מ-GitHub). לפי `CLAUDE.md`:
1. **בנייה:** Claude יוצר את הקבצים, מריץ מקומית `npm ci`, `npm run typecheck`, `npm run test`, `npm run build`, ובודק את `dist/` עם `npm run preview` (`http://localhost:4173/simon-game/`): שני המסכים, נכסים (JS, CSS, גופני Heebo) נטענים מתחת ל-`/simon-game/` בלי 404, ובלי שגיאות ב-Console. סימון 🟡. אין commit.
2. **עצירה:** Claude מבקש מהמשתמש (א) לבצע את §3, ו-(ב) אישור ל-commit + push של קובצי ה-Milestone.
3. **אחרי האישור:** commit + push → Claude עוקב אחרי ריצת ה-Workflow בדף ה-Actions הציבורי (דפדפן מובנה), ובודק את האתר הפרוס (§5).
4. אם ה-Workflow נכשל – תיקון, ושוב בקשת אישור ל-push.

הסימון נשאר 🟡 עד שהמשתמש מאשר בטלפון (DoD אחרון); ה-✅ מתווסף רק באישור.

## 5. בדיקות

### 5.1 אוטומטיות (Regression – קיימות, רצות גם ב-CI)
הבדיקות הקיימות כבר מכסות את דרישת ה-Regression ב-DoD, ורצות ב-Workflow לפני כל פריסה:
- עשרת השלבים וניצחון אחרי שלב 10 (`gameReducer.test.ts`, `App.test.tsx`).
- כישלון בצבע הראשון → 0 שלבים.
- קונפטי בניצחון בלבד (ולא בהפסד, ולא ב-`prefers-reduced-motion`).
- השהיה וחידוש (אודות, `visibilitychange`, `pagehide`, הצגה מחדש של כל הרצף).
- שמירת עשר תוצאות, סדר, מחיקה מאושרת, כשלי אחסון.
אין בדיקות חדשות ב-Milestone זה.

### 5.2 בדיקת האתר הפרוס (Claude, בדפדפן המובנה)
- `https://dovevgit.github.io/simon-game/` נטען ב-HTTPS, הכותרת "סיימון", RTL.
- `read_network_requests`: כל הבקשות (JS, CSS, `woff2`) מתחת ל-`/simon-game/assets/` ומחזירות 200; אין 404.
- `read_console_messages`: אין שגיאות.
- מעבר בית ↔ אודות, התחלת משחק, הפסד מהיר, רשומה ב"אודות", רענון – הרשומה נשמרת.
- תצוגת מובייל (`resize_window` 375×812).

### 5.3 בדיקת המשתמש בטלפון (DoD אחרון)
הוראות פשוטות: פתיחת הכתובת בטלפון; בדיקת מסכים, מגע, צלילים, השהיה/חידוש (נעילת מסך, מעבר אפליקציה), היסטוריה, ניצחון/הפסד, תצוגה אנכית ועברית מימין לשמאל. רק המשתמש מאשר סעיף זה.

## 6. מחוץ לתחום

PWA, Service Worker, Manifest ואייקונים (Milestone 7). Custom Domain. בדיקות Dependency Security נוספות ב-CI ("לפי הצורך" ב-§2.8 – לא נדרש כעת).

## 7. מיפוי ל-Definition of Done

| תנאי | איך מתקיים |
|---|---|
| Workflow מריץ בדיקות ו-Build ומפרסם אוטומטית אחרי Push ל-`main` | §2, §3, §4 |
| האתר ב-HTTPS, נכסים וניווט תחת `/simon-game/` בלי 404 | `base` קיים, `favicon` ב-§1, בדיקות §4.1 + §5.2 |
| Regression: עשרה שלבים, כישלון ראשון, קונפטי בניצחון בלבד, השהיה/חידוש, עשר תוצאות ומחיקה | §5.1 – רצות מקומית וב-CI |
| אישור המשתמש בטלפון בכתובת הפרוסה, אנכי ובעברית/RTL | §5.3 |
