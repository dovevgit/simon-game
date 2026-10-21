# תוכנית – Milestone 4: השהיה וחידוש משחק

מקורות: `MILESTONES.md` (Milestone 4), `PRD.md` §3ב ("מעבר למסך אודות והמשך משחק"), §4.3, Edge Cases (השהיה באמצע הצגה / שחזור / המתנת ביניים, מעבר ל"אודות" אחרי הכרעה), `DESIGN.md` §1.1 (מצב "מושהה", "המשך משחק"), §1.4, §1.5, `ARCHITECTURE.md` §2.3 (כללים 3, 5–11), §2.4 (Gesture ל"המשך משחק", `visibilitychange`/`pagehide`), §2.6 ("השהיה וחזרה"), החלטה ראשונית 3, ADR-1, ADR-3.

הקוד הקיים (Milestones 2–3): ב-Reducer יש Action זמני `abandon`; `App.handleNavigate` קורא ל-`game.abandon()` במעבר ל"אודות"; `useGame.start()` פותח אודיו (`audio.unlock()`) מתוך הלחיצה; ההצגה מבוטלת דרך `AbortController` ו-`presentationId`.

## 1. שינויים בקבצים

```text
src/game/gameReducer.ts       # 'paused', Actions pause/resume; הסרת abandon
src/game/gameReducer.test.ts  # בדיקות pause/resume במקום abandon
src/game/useGame.ts           # pause(), resume() עם unlock, האזנה ל-visibilitychange/pagehide
src/screens/HomeScreen.tsx    # מצב "מושהה": חיווי, לוח מעומעם, "המשך משחק", הודעת כשל אודיו
src/App.tsx                   # מעבר ל"אודות" קורא ל-game.pause()
src/App.test.tsx              # החלפת בדיקות abandon בבדיקות השהיה/חידוש
```

## 2. Reducer (החלטה ראשונית 3)

- `GameStatus` מקבל את `'paused'`.
- **`pause`** – מותר רק מ-`presenting` / `awaitingInput`:
  `status: 'paused'`, `inputIndex: 0` (קלט חלקי נזרק), `presentationId + 1` (כל סיום הצגה ישן מתעלם), `roundAdvanced: false`. `sequence`, `round`, `completedRounds`, `gameId` – ללא שינוי.
- **`resume`** – מותר רק מ-`paused`: `status: 'presenting'`, `presentationId + 1`, `roundAdvanced: false`, `inputIndex: 0`. אותו רצף ואותו שלב; אין תוספת צבע.
- **השהיה בזמן המתנת הביניים** (אחרי שחזור נכון, לפני הצגת השלב הבא): לפי ADR-1, המצב כבר `presenting` של השלב הבא עם הרצף המעודכן, ולכן `pause` → `resume` מציג את הרצף **של השלב הבא** בלי צבע נוסף (PRD Edge Case). ההמתנה בחידוש היא `START_DELAY_MS` (`1000ms`), כמו ב"התחל משחק" (DESIGN §1.1).
- `press`, `presentationDone`, `start`, `dismiss` – נשארים חסומים ב-`paused` (כבר כך, כי הם בודקים מצב מפורש).
- **הסרת `abandon`** – הפתרון הזמני מ-Milestone 2 מוחלף לגמרי.
- `won` / `lost` / `idle` אינם מושפעים מ-`pause` (כלל 7, כלל 10).

## 3. `useGame`

### 3.1 `pause()`
- אם המשחק פעיל (`presenting` / `awaitingInput`, לפי `ref` של הסטטוס העדכני): `endPress()` (מבטל הארה וצליל לחיצה), `audio.stopAll()` מיד, `dispatch(pause)`. ה-Cleanup של Effect ההצגה מבטל את כל ה-Timers ואת צליל ההארה (ARCHITECTURE §2.3 כלל 5).
- אחרת – לא עושה דבר (בפרט לא נוגע בצליל הסיום ובקונפטי של משחק שכבר הוכרע).
- פונקציה יציבה (`useCallback` + `ref`), כך שאפשר לרשום אותה פעם אחת כמאזין.

### 3.2 `resume()` – מתוך הלחיצה על "המשך משחק"
- אותו מנגנון כמו `start()`: `audio.unlock()` נקרא סינכרונית בתוך ה-Handler; רק בהצלחה → `dispatch(resume)`; בכשל → `audioError = true`, נשארים `paused` עם ההודעה **"לא הצלחנו להפעיל את הצליל. הקש שוב על הכפתור."** (ARCHITECTURE §2.4, ADR-3).
- **הגנה מפני ריבוי Resume:** ה-Guard הקיים `unlocking` משותף ל-`start` ו-`resume`; וה-Reducer מקבל `resume` רק מ-`paused`.
- קוד משותף: פונקציה פנימית `unlockThen(action)` שמשמשת גם את `start`.

### 3.3 הסתרת האפליקציה (ARCHITECTURE §2.4, החלטה ראשונית 3)
- Effect אחד ב-`useGame`:
  - `document` → `visibilitychange`: אם `document.visibilityState === 'hidden'` → `pause()`.
  - `window` → `pagehide` → `pause()` (Safety Net).
  - חזרה ל-`visible` – **לא עושה דבר** (אין Resume אוטומטי, כלל 7).
- נעילת מסך ומעבר לאפליקציה אחרת מגיעים כ-`visibilitychange`.
- ה-Timer של הודעת הסיום אינו מבוטל בהסתרה (כלל 9); בחזרה ההודעה מוצגת.

### 3.4 ממשק
`useGame` מחזיר גם `resume` ו-`pause`, ומפסיק להחזיר `abandon`. `displayRound` ב-`paused` = `round` (השלב הנוכחי, DESIGN §1.1).

## 4. UI

### 4.1 `HomeScreen` – מצב "מושהה" (DESIGN §1.1)
| אלמנט | תוכן |
|---|---|
| חיווי שלב | "שלב X מתוך 10" – השלב הנוכחי, ללא שינוי |
| שורת סטטוס (`aria-live`) | **"המשחק מושהה"** |
| לוח | כל ארבעת הרבעים מעומעמים (כמו ה-Mockup "משחק מושהה"), לא לחיצים |
| כפתור | **"המשך משחק"** (Primary) – מופיע **רק** ב-`paused` |
| כשל אודיו | אותה הודעה כמו ב-`idle`, מעל הכפתור |

- ב-`SimonBoard`: `dimmed` יהיה `true` גם ב-`paused` (כבר מעמעם את כל הרבעים שאינם מוארים, ובמצב זה אין רבע מואר).

### 4.2 `App`
- `handleNavigate('about')` → `game.pause()` (במקום `abandon`). חזרה ל"בית" אינה עושה דבר מעבר להחלפת המסך.
- `ResultDialog` ממשיך להופיע במסך הבית כל עוד `resultVisible`, גם אחרי ביקור ב"אודות" (כבר קיים; כלל 10).

## 5. בדיקות אוטומטיות

### 5.1 `gameReducer.test.ts`
- `pause` מ-`presenting` ומ-`awaitingInput` (גם אחרי קלט חלקי) → `paused`, `inputIndex: 0`, אותו `sequence`/`round`/`completedRounds`, `presentationId + 1`.
- `pause` מ-`idle` / `won` / `lost` / `paused` – ללא שינוי.
- `presentationDone` עם המזהה שלפני ההשהיה – מתעלם.
- `press` ו-`start` ב-`paused` – ללא שינוי.
- `resume` → `presenting` עם אותו רצף ושלב, `roundAdvanced: false`; `resume` שלא מ-`paused` – ללא שינוי.
- השהיה בהמתנת הביניים: אחרי השלמת שלב 2 → `pause` → `resume` → אורך הרצף 3 (ללא תוספת נוספת), שלב 3.
- הבדיקה הקיימת של `abandon` מוסרת.

### 5.2 `App.test.tsx` (Fake Timers, Mock לאודיו)
- **"אודות" באמצע הצגה:** `stopAll` נקרא, אין רבע מואר, `vi.getTimerCount() === 0`; בחזרה: "המשחק מושהה", "המשך משחק", אותו שלב; אחרי `5000ms` עדיין מושהה (אין Resume אוטומטי) ואין `startTone` חדש.
- **"אודות" באמצע שחזור:** לוחצים צבע ראשון נכון משלב 2, משהים, ממשיכים → כל הרצף (2 צבעים) מוצג מחדש מההתחלה, ואחר כך צריך להקיש את שניהם; לחיצה אחת לא מספיקה.
- **"המשך משחק":** `unlock` נקרא; אחרי `1000ms` הרבע הראשון מואר עם צליל; השלב לא השתנה.
- **כשל אודיו בחידוש:** `unlock` נכשל → ההודעה מוצגת, נשארים "המשחק מושהה"; ניסיון חוזר מצליח ממשיך.
- **לחיצה כפולה מהירה על "המשך משחק"** → `unlock` נקרא פעם אחת, הצגה אחת.
- **`visibilitychange` ל-`hidden`** (דרך `Object.defineProperty(document, 'visibilityState')`) → מושהה וצליל נעצר; חזרה ל-`visible` → עדיין מושהה.
- **`pagehide`** → מושהה.
- **לחיצות על הלוח במצב מושהה** – לא משנות דבר.
- **הודעת סיום** נשארת אחרי "אודות" וחזרה (בדיקה קיימת) – וגם אחרי `visibilitychange` (הוכרע → לא מושפע).
- **השהיה בהמתנת הביניים:** שחזור נכון של שלב 1 → "אודות" לפני הצגת שלב 2 → חזרה → "המשך משחק" → מוצג רצף של 2 צבעים.
- בדיקות Milestone 2–3 שהתבססו על `abandon` מעודכנות להתנהגות ההשהיה.

## 6. אימות עצמי בסיום הבנייה (ע"י Claude)

1. `npm run typecheck`, `npm run test`, `npm run build` עוברים.
2. `npm run dev` בדפדפן המובנה: השהיה דרך "אודות" בזמן הצגה ובזמן שחזור, "המשך משחק", בדיקה שאין Resume אוטומטי; הדמיית `visibilitychange` מה-Console; רענון דף במצב מושהה → מצב התחלה.
3. סגירת השרת, סימון 🟡, ADR על החלפת `abandon` בהשהיה (אם יש פרט שלא מתועד בהחלטה הראשונית 3). אין commit.

## 7. בדיקה במכשיר אמיתי (DoD)

ב"הרץ כדי שאבדוק" – הרצה עם `npm run dev:lan` (כמו ב-Milestone 3), והוראות למשתמש: נעילת מסך באמצע הצגת הרצף ובאמצע תורו, מעבר לאפליקציה אחרת וחזרה, ובכל מקרה – המשחק מושהה, אין צליל, ו"המשך משחק" מציג מחדש את כל הרצף של אותו שלב. Claude לא מסמן את הבדיקה כעוברת – רק המשתמש מאשר.

## 8. מחוץ לתחום

היסטוריה ושמירת תוצאות (Milestone 5 – ובו גם הוודאות שהשהיה אינה יוצרת רשומה); PWA (Milestone 7). אין שמירת מצב מושהה לאחסון – רענון מאפס (כלל 11).

## 9. מיפוי ל-Definition of Done

| תנאי | איך מתקיים |
|---|---|
| "אודות" בזמן הצגה ובזמן שחזור משהה ועוצר מיד הארה וצליל | §2 `pause`, §3.1, §4.2, בדיקות 5.2 |
| חזרה ל"בית" אינה מפעילה רצף; "המשך משחק" רק במשחק מושהה | §3.3, §4.1, בדיקות 5.2 |
| "המשך משחק" מציג את כל הרצף מחדש; אותו שלב, ללא צבע חדש | §2 `resume`, בדיקות 5.1 + 5.2 |
| הסתרה וחזרה – אותו כלל, ללא Callback מיושן | §3.3, `presentationId`, בדיקות 5.1 + 5.2 |
| השהיה אינה הפסד; Refresh מאפס | §2 (אין מעבר ל-`lost`), מצב ב-Memory בלבד |
| הודעת ניצחון/הפסד נשארת אחרי "אודות" וחזרה עד "אישור" | §2 (`pause` לא משפיע על `won`/`lost`), §4.2, בדיקה 5.2 |
| אישור המשתמש במכשיר אמיתי | §7 |
