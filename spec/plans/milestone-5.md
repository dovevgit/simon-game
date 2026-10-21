# תוכנית – Milestone 5: היסטוריית משחקים ומחיקה מאושרת

מקורות: `MILESTONES.md` (Milestone 5), `PRD.md` §3ב ("סיום משחק" סעיף 4, "צפייה בהיסטוריה ומחיקתה"), §4.4, Edge Cases (רענון באמצע משחק, היסטוריה ריקה, מגבלת ההיסטוריה, ביטול מחיקה, אחסון חסום, מעבר ל"אודות" אחרי הכרעה), `DESIGN.md` §1.2, §1.3, §1.5 (נוסחי הודעות), §2.3 (History Cards, Dialog, Secondary/Destructive), §2.5, `ARCHITECTURE.md` §2.3 (כללים 4, 8, 11), §2.5 (Data Model), §2.6 ("אודות"), §2.8, החלטה ראשונית 4, החלטה ראשונית 5.

הקוד הקיים (Milestones 1–4): `AboutScreen` מציג הוראות וחיווי ריק קבוע "עדיין אין משחקים שמורים."; `useGame` מוחזק ב-`App` וחושף `status`, `completedRounds`; ה-Reducer מעלה `gameId` בכל `start`, ו-`dismiss` שומר אותו; `ResultDialog` מציג את הודעת הסיום; `main.tsx` עוטף את `App` ב-`StrictMode`.

## 1. שינויים בקבצים

```text
src/history/historyStorage.ts       # חדש: מודול טהור – קריאה, אימות, הוספה, כתיבה ומחיקה ב-localStorage
src/history/historyStorage.test.ts  # חדש: בדיקות יחידה לאחסון
src/history/useHistory.ts           # חדש: Hook – רשימה + מצבי כשל, record() ו-clear()
src/components/ConfirmDialog.tsx    # חדש: חלונית "למחוק את ההיסטוריה?"
src/components/ConfirmDialog.css    # חדש
src/components/HistoryCard.tsx      # חדש: כרטיס תוצאה אחת
src/components/HistoryCard.css      # חדש
src/components/ResultDialog.tsx     # הודעת כשל שמירה
src/screens/AboutScreen.tsx         # רשימה, חיווי ריק, כפתור מחיקה, Dialog, הודעות כשל
src/screens/AboutScreen.css         # עיצוב רשימה, כפתור משני, הודעות
src/App.tsx                         # useHistory + Effect רישום תוצאה עם Guard לפי gameId
src/App.test.tsx                    # בדיקות אינטגרציה להיסטוריה
```

## 2. `historyStorage.ts` – מודול טהור (החלטה ראשונית 4)

- טיפוסים לפי `ARCHITECTURE.md` §2.5: `GameResult { id, finishedAt, completedRounds, outcome: 'win' | 'loss' }`, `HistoryData { schemaVersion: 1, results }`.
- קבועים: `HISTORY_KEY = 'simon.history.v1'`, `MAX_RESULTS = 10`.
- **`loadHistory(): { ok: true; results } | { ok: false }`**
  - אין מפתח → `ok: true`, רשימה ריקה.
  - `getItem` זורק, JSON לא תקין, או מבנה עליון שגוי (`schemaVersion !== 1` / `results` אינו מערך) → `ok: false`.
  - רשומות בודדות לא תקינות (סוג שגוי, `completedRounds` שאינו שלם 0–10, `outcome` לא מוכר, `finishedAt` שאינו תאריך) – מסוננות בשקט; מחזירים לכל היותר 10.
- **`createResult(outcome, completedRounds, now = new Date())`** – `finishedAt: now.toISOString()`, `id` מזמן + מספר אקראי (לא `crypto.randomUUID`, שאינו זמין ב-HTTP בבדיקה בטלפון).
- **`addResult(results, result)`** – טהורה: `[result, ...results].slice(0, 10)` (חדש ← ישן; הישנה ביותר נופלת).
- **`saveHistory(results): boolean`** – `setItem` של `HistoryData`; `false` אם נזרקה שגיאה (חסום / מלא).
- **`clearHistory(): boolean`** – `removeItem(HISTORY_KEY)`; `false` אם נזרקה שגיאה.
- כל גישה ל-`localStorage` (כולל עצם הגישה ל-`window.localStorage`) בתוך `try/catch`.

## 3. `useHistory` – מוחזק ב-`App`

- State: `results`, `loadError` (מ-`loadHistory` בטעינה הראשונה – Initializer עצל של `useState`; קריאה טהורה, בטוחה ב-Strict Mode), `saveError`, `deleteError`.
- `ref` שמחזיק את הרשימה העדכנית, כדי שהכתיבה תתבצע מחוץ ל-Updater של `setState` (ש-Strict Mode מריץ פעמיים).
- **`record(outcome, completedRounds)`** – `addResult` על הרשימה שבזיכרון → `saveHistory`; הרשימה בזיכרון מתעדכנת **גם בכשל** (התוצאה נראית ב"אודות" עד רענון), ו-`saveError` נקבע לפי ההצלחה. אם הטעינה נכשלה (JSON פגום) – השמירה כותבת רשימה תקינה חדשה (החלטה ראשונית 4); בהצלחה `loadError` מתאפס.
- **`clear()`** – `clearHistory()`; בהצלחה: רשימה ריקה, `loadError` ו-`deleteError` מתאפסים; בכשל: הרשימה **נשארת**, `deleteError = true` (אין לטשטש כשל, §2.5).
- מחזיר: `results`, `loadError`, `saveError`, `deleteError`, `record`, `clear`, `dismissDeleteError` (איפוס הודעת כשל המחיקה בפתיחת ה-Dialog מחדש).

## 4. רישום התוצאה – `App` (כלל 8, החלטות ראשוניות 4–5)

- Effect ב-`App` על `[game.status, game.gameId]`: בכניסה ל-`won` / `lost`, אם `gameId !== recordedGameId.current` → מעדכן את ה-`ref` ואז `history.record(status === 'won' ? 'win' : 'loss', completedRounds)`.
- `useGame` יחשוף גם את `gameId` (כרגע אינו מוחזר).
- הרישום **מיידי** בכניסה ל-`won`/`lost`, לא אחרי `RESULT_DELAY_MS` – כך שמעבר מהיר ל"אודות" כבר מציג את התוצאה.
- Strict Mode: ה-`ref` שורד את הרצת ה-Effect הכפולה, ולכן נרשמת רשומה אחת. `dismiss` שומר `gameId`, ולכן חזרה ל-`idle` לא רושמת שוב; משחק חדש מקבל `gameId` חדש.
- `paused`, ניווט, הסתרה ו-Refresh אינם עוברים ב-`won`/`lost`, ולכן אינם רושמים דבר.
- `ResultDialog` מקבל `saveFailed` ומציג מתחת לטקסט השלבים: **"לא ניתן לשמור את התוצאה במכשיר זה."** (`role="alert"`). המשחק ממשיך כרגיל.

## 5. UI – מסך "אודות" (DESIGN §1.2, §1.3)

`AboutScreen` מקבל את אובייקט ההיסטוריה כ-prop מ-`App`.

### 5.1 רשימה
- תחת הכותרת "10 המשחקים האחרונים" – `<ol>` של `HistoryCard`, מהחדש לישן.
- **`HistoryCard`** (כרטיס כהה, גבול עדין, פינות מעוגלות – כמו ה-Mockup):
  - צד ימין: מספר השלבים שהושלמו בנוסח הקיים `completedRoundsText` ("השלמת 4 שלבים" / "לא השלמת אף שלב" / "השלמת 10 שלבים"), ומתחתיו **"ניצחון"** או **"הפסד"** בטקסט, בגוון מאופק ירוק/אדום (צבע אינו החיווי היחיד).
  - צד שמאל: תאריך ושעה בגודל Caption (`14px`), לפי Locale עברי וזמן המכשיר: `Intl.DateTimeFormat('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })` → למשל `12.05.2024, 14:32`; בתוך `<time dateTime=…>` עם `dir="ltr"` לבידוד כיווניות.
- **חיווי ריק:** "עדיין אין משחקים שמורים." – רק כשאין רשומות **ואין** כשל טעינה.
- **כשל טעינה:** "לא ניתן לקרוא את ההיסטוריה במכשיר זה." במקום החיווי הריק.
- **כפתור "מחק היסטוריה"** – מתחת לרשימה, רק כשיש לפחות רשומה אחת. סגנון משני (משטח כהה עם קו מתאר, כמו ב-Mockup), רוחב מלא, גובה מגע ≥ `44px`.
- הרשימה גוללת בתוך תוכן המסך (`app__content` כבר גולל), פס הניווט נשאר קבוע.

### 5.2 `ConfirmDialog`
- Scrim כהה וכרטיס **בהיר** מרוכז (לפי ה-Mockup), `role="dialog"`, `aria-modal`, `aria-labelledby` / `aria-describedby`.
- כותרת **"למחוק את ההיסטוריה?"**, הסבר **"כל תוצאות המשחקים יימחקו."**, כפתורים **"ביטול"** (אפור משני) ו-**"מחק"** (אדום `#FF3B30`, טקסט לבן).
- סדר הכפתורים לפי ה-Wireframes (שגוברים על מבנה): ב-RTL **"ביטול" מימין, "מחק" משמאל**.
- פוקוס התחלתי על **"ביטול"** (הפעולה הבטוחה); מקש Escape = ביטול.
- **"ביטול"** – סוגר בלבד. **"מחק"** – `history.clear()` וסגירה; בהצלחה מוצג שוב החיווי הריק והכפתור נעלם, בכשל מוצג מתחת לרשימה **"המחיקה נכשלה. ההיסטוריה לא נמחקה."** והרשימה נשארת.

## 6. בדיקות אוטומטיות

### 6.1 `historyStorage.test.ts` (jsdom `localStorage`, מתנקה לפני כל בדיקה)
- טעינה בלי מפתח → `ok`, ריק.
- שמירה וטעינה חוזרת → אותן רשומות, אותו סדר; המבנה ב-`localStorage` כולל `schemaVersion: 1`.
- `addResult` 11 פעמים → 10 רשומות, החדשה ראשונה, הראשונה שנוספה הוסרה.
- JSON פגום / `schemaVersion` שגוי → `ok: false`; רשומות לא תקינות מסוננות מתוך מבנה תקין.
- `getItem` / `setItem` / `removeItem` זורקים (`vi.spyOn(Storage.prototype, …)`) → `ok: false` / `false` / `false`, בלי חריגה.
- `createResult` – `finishedAt` בפורמט ISO, `outcome` ו-`completedRounds` כפי שנמסרו, מזהים שונים.

### 6.2 `App.test.tsx` (Fake Timers, Mock לאודיו ולרנדום, `localStorage.clear()` לפני כל בדיקה)
- **הפסד בשלב 1** → ב"אודות" כרטיס אחד: "לא השלמת אף שלב", "הפסד" ותאריך/שעה; כפתור "מחק היסטוריה" מופיע.
- **ניצחון** → כרטיס "השלמת 10 שלבים", "ניצחון".
- **רישום מיידי:** הפסד ומעבר ל"אודות" לפני שההודעה מוצגת → הכרטיס כבר שם.
- **בדיוק רשומה אחת:** אחרי הפסד, מעבר ל"אודות" וחזרה, הסתרת האפליקציה ו"אישור" – עדיין רשומה אחת.
- **Strict Mode:** רינדור `<StrictMode><App /></StrictMode>`, הפסד → רשומה אחת ב-`localStorage` ובמסך.
- **ללא רשומה:** משחק פעיל שהושהה (אודות / `visibilitychange`), וגם `unmount` באמצע משחק (הדמיית Refresh) → אין רשומות.
- **11 משחקים** → 10 כרטיסים, החדש ראשון (`completedRounds` שונה בין משחקים כדי לזהות סדר).
- **שמירה אחרי Refresh:** `unmount` ו-`render` מחדש → הכרטיסים עדיין מוצגים.
- **"ביטול"** → ה-Dialog נסגר, הרשימה ו-`localStorage` ללא שינוי.
- **"מחק"** → חיווי ריק, הכפתור נעלם, המפתח הוסר מ-`localStorage`.
- **כשל שמירה** (`setItem` זורק) → הודעת הסיום כוללת "לא ניתן לשמור את התוצאה במכשיר זה."; אפשר ללחוץ "אישור" ולהתחיל משחק חדש.
- **כשל טעינה** (`getItem` זורק / JSON פגום) → "לא ניתן לקרוא את ההיסטוריה במכשיר זה." ב"אודות"; "התחל משחק" עובד.
- **כשל מחיקה** (`removeItem` זורק) → "המחיקה נכשלה. ההיסטוריה לא נמחקה." והרשימה נשארת.
- בדיקת "switches between home and about" הקיימת ממשיכה לעבור (היסטוריה ריקה).

## 7. אימות עצמי בסיום הבנייה (ע"י Claude)

1. `npm run typecheck`, `npm run test`, `npm run build` עוברים.
2. `npm run dev` בדפדפן המובנה: כמה הפסדים מהירים (ניצחון מלא נבדק בבדיקות האוטומטיות), צפייה ב"אודות", רענון ובדיקה שהרשומות נשארו, "ביטול" ו"מחק"; הדמיית JSON פגום מה-Console ורענון → הודעת כשל טעינה; בדיקה שאין רשומה כפולה תחת Strict Mode של `dev`.
3. סגירת השרת, סימון 🟡. ADR רק אם התקבלה החלטה שאינה מתועדת בהחלטה ראשונית 4. אין commit.

## 8. מחוץ לתחום

PWA ו-Offline (Milestone 7), פריסה ו-CI (Milestone 6). אין סטטיסטיקות, מיון או מחיקת רשומה בודדת – רק מחיקת כל ההיסטוריה.

## 9. מיפוי ל-Definition of Done

| תנאי | איך מתקיים |
|---|---|
| ניצחון/הפסד מוסיפים בדיוק רשומה אחת עם זמן, שלבים ו"ניצחון"/"הפסד" | §2 `createResult`, §4 Guard לפי `gameId`, §5.1, בדיקות 6.2 |
| ניווט, השהיה, Refresh או יציאה באמצע משחק אינם מוסיפים רשומה | §4 (רישום רק ב-`won`/`lost`), בדיקות 6.2 |
| אחרי 11 משחקים לכל היותר 10, חדש ← ישן, נשמרות אחרי Refresh | §2 `addResult`/`saveHistory`, §3, בדיקות 6.1 + 6.2 |
| "ביטול" לא משנה; "מחק" מרוקן ומחזיר חיווי ריק | §5.2, בדיקות 6.2 |
| כשל אחסון אינו מונע משחק; הודעה בעברית בכשל שמירה/טעינה/מחיקה | §2 `try/catch`, §3, §4, §5, בדיקות 6.1 + 6.2 |
| בדיקות אוטומטיות להיסטוריה, מגבלת עשר, מחיקה, כשל אחסון ומניעת שמירה כפולה | §6 |
