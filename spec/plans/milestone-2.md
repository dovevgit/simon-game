# תוכנית – Milestone 2: מנוע המשחק – לוגיקה והארה (ללא צלילים וקונפטי)

מקורות: `MILESTONES.md` (Milestone 2), `PRD.md` §3ב, §4.2, §3ב/Edge Cases, `DESIGN.md` §1.1 (מצבי תצוגה, חיווי שלב, טבלת "קצב הצגת הרצף"), §1.5, §1.6, §2.3–2.4, `ARCHITECTURE.md` §2.3 (כללים 1–5, 9–11), §2.4, §2.5 (Game Session), החלטות ראשוניות 1, 2, 3 (החלק של `abandon`), 5.

הקוד הקיים (Milestone 1): `App` מחזיק `screen`, `HomeScreen` סטטי, `SimonBoard` עם ארבעה כפתורים ללא פעולה, `BottomNav`, `game/colors.ts`.

## 1. החלטה שהתקבלה עם המשתמש

- **נוסח הפסד אחרי שלב אחד:** כאשר הושלם שלב אחד בלבד מוצג **"השלמת שלב אחד"**. לשאר המספרים: **"השלמת X שלבים"**; ל-0: **"לא השלמת אף שלב"** (DESIGN §1.5). זו השלמה ל-DESIGN §1.5, שהמשתמש יחליט אם לעדכן בו.

## 2. קבצים חדשים ושינויים

```text
src/game/
  constants.ts          # חדש: TOTAL_ROUNDS + קבועי הקצב
  random.ts             # חדש: randomColor() – Math.random, אינדקס 0–3
  gameReducer.ts        # חדש: טיפוסים, initialGameState, reducer טהור
  gameReducer.test.ts   # חדש: בדיקות יחידה ל-Reducer
  sequencePlayer.ts     # חדש: wait(ms, signal) ו-playPresentation(...) הניתנים לביטול
  useGame.ts            # חדש: Hook שמחבר Reducer, Timers, הארה ולחיצות
  resultText.ts         # חדש: completedRoundsText(n) לנוסח "השלמת..."
src/components/
  SimonBoard.tsx/.css   # שינוי: props להארה, עמעום, קלט
  ResultDialog.tsx/.css # חדש: Overlay ניצחון/הפסד עם "אישור"
src/screens/
  HomeScreen.tsx/.css   # שינוי: מקבל את מצב המשחק כ-props
src/App.tsx             # שינוי: useGame ב-App; מעבר ל"אודות" קורא ל-abandon
src/App.test.tsx        # שינוי: בדיקות אינטגרציה עם Fake Timers
```

`TOTAL_ROUNDS` עובר מ-`HomeScreen.tsx` ל-`constants.ts`.

## 3. `constants.ts` – קצב (DESIGN §1.1, ערכים מחייבים)

| קבוע | ערך |
|---|---|
| `TOTAL_ROUNDS` | `10` |
| `FLASH_MS` – הארת צבע ברצף | `600` |
| `GAP_MS` – הפסקה בין צבעים | `250` |
| `START_DELAY_MS` – לפני הצגה אחרי "התחל משחק" | `1000` |
| `ROUND_HOLD_MS` – חיווי השלב שהושלם נשאר | `1000` |
| `NEXT_ROUND_DELAY_MS` – מהצגת מספר השלב הבא עד הצבע הראשון | `1000` |
| `RESULT_DELAY_MS` – מהלחיצה המכריעה עד הודעת ניצחון/הפסד | `1000` |
| `PRESS_MIN_MS` – הארה מינימלית בלחיצת שחקן | `300` |

הקבועים זהים לכל השלבים (אין האצה).

## 4. `gameReducer.ts` – מכונת מצבים טהורה (ARCHITECTURE §2.3, §2.5)

```ts
type GameStatus = 'idle' | 'presenting' | 'awaitingInput' | 'won' | 'lost';
// 'paused' יתווסף ב-Milestone 4

type GameState = {
  status: GameStatus;
  sequence: ColorId[];      // 1–10
  round: number;            // 1–10
  inputIndex: number;
  completedRounds: number;  // 0–10
  gameId: number;           // עולה בכל "התחל משחק"
  presentationId: number;   // עולה בכל כניסה ל-presenting ובכל ביטול
  roundAdvanced: boolean;   // true כשה-presenting הנוכחי נכנס מהשלמת שלב (קובע את ההמתנה, §5)
};
```

**Actions** (הצבע האקראי מגיע מבחוץ – החלטה ראשונית 2; ה-Reducer לא נוגע ב-Timers):

| Action | מותר מ- | תוצאה |
|---|---|---|
| `start { firstColor }` | `idle` | `presenting`, `sequence=[firstColor]`, `round=1`, `inputIndex=0`, `completedRounds=0`, `gameId+1`, `presentationId+1`, `roundAdvanced=false` |
| `presentationDone { presentationId }` | `presenting` עם אותו `presentationId` | `awaitingInput`, `inputIndex=0`. מזהה ישן – מתעלמים |
| `press { color, nextColor }` | `awaitingInput` | שגוי → `lost`, `completedRounds=round-1`. נכון ולא אחרון → `inputIndex+1`. נכון ואחרון: אם `round<10` → `completedRounds=round`, `round+1`, `sequence=[...sequence, nextColor]`, `presenting`, `presentationId+1`, `roundAdvanced=true`; אם `round===10` → `won`, `completedRounds=10` |
| `dismiss` | `won` / `lost` | `initialGameState` תוך שמירת `gameId` ו-`presentationId` (החלטה ראשונית 5) |
| `abandon` | `presenting` / `awaitingInput` | **זמני עד Milestone 4:** חזרה ל-`idle` (שמירת `gameId`, `presentationId+1`), בלי תוצאה |

כל Action ממצב לא מורשה מחזיר את אותו אובייקט state (ללא שינוי). אין שלב 11: `press` בשלב 10 עובר ל-`won` ולא מוסיף צבע.

## 5. `sequencePlayer.ts` + `useGame.ts` – Side Effects

**`wait(ms, signal)`** – Promise שמתבטל (reject עם `AbortError`) כש-`signal` מבוטל, ומנקה את ה-`setTimeout`.

**הצגת רצף** – Effect ב-`useGame` שרץ כאשר `status==='presenting'`, לפי `presentationId`:
1. `AbortController` חדש; ה-cleanup של ה-Effect קורא `abort()` (מבטל ב-`abandon`, ב-Unmount ובהרצה הכפולה של Strict Mode).
2. אם `roundAdvanced`: חיווי השלב מציג את השלב שהושלם (`round-1`) ← `wait(ROUND_HOLD_MS)` ← החיווי מתעדכן ל-`round` ← `wait(NEXT_ROUND_DELAY_MS)`. אחרת: `wait(START_DELAY_MS)`.
3. לכל צבע: `activeColor=color` ← `wait(FLASH_MS)` ← `activeColor=null` ← `wait(GAP_MS)` (לא אחרי האחרון).
4. `dispatch(presentationDone { presentationId })`.
5. בביטול – `activeColor=null`; ה-Reducer ממילא מתעלם מ-`presentationId` ישן (כלל 5).

**חיווי השלב (`displayRound`)** – ב-`useGame`: ב-`idle` = 1; במשחק = `round`, למעט ההמתנה של שלב 2 למעלה (`round-1`); ב-`won`/`lost` נשאר על השלב האחרון שהיה פעיל (`round`). אחרי `dismiss` חוזר ל-1 (DESIGN §1.1, §1.5).

**לחיצת שחקן** (החלטה ראשונית 2):
- `pointerdown` על רבע (רק ב-`awaitingInput`) → `dispatch(press { color, nextColor: randomColor() })` מיד, ו-`pressedColor=color`.
- ההארה נמשכת `max(PRESS_MIN_MS, עד שחרור)`: השחרור נקלט ב-`window` (`pointerup`/`pointercancel`), כי הרבע עלול להפוך ללא-פעיל באמצע. גם בלחיצה המכריעה (שגויה או אחרונה) ההארה מוצגת.
- מקלדת: `Enter`/`Space` על רבע ממוקד = לחיצה עם הארה של `PRESS_MIN_MS`.
- `preventDefault` ב-`pointerdown` כדי למנוע בחירת טקסט / Zoom.

**הודעת סיום** – Effect בכניסה ל-`won`/`lost` (לפי `gameId`): `setTimeout(RESULT_DELAY_MS)` → `resultVisible=true`. זה Timer תצוגה בלבד; הוא לא מבוטל במעבר ל"אודות" (ARCHITECTURE §2.3 כלל 9), ולכן ההודעה מופיעה/נשארת גם אחרי חזרה לבית (כלל 10). `dismiss` מאפס `resultVisible`.

**`abandon` (זמני)** – `useGame.abandon()`: אם המשחק פעיל → `dispatch(abandon)`, ניקוי `activeColor`/`pressedColor`. ה-cleanup של Effect ההצגה מבטל את כל ה-Timers.

**ממשק ה-Hook:**
```ts
useGame(): {
  status, displayRound, completedRounds,
  activeColor, pressedColor, resultVisible,
  start(), press(color), release(), dismiss(), abandon()
}
```

## 6. UI

### 6.1 `SimonBoard`
Props: `activeColor`, `pressedColor`, `dimmed` (ב-`presenting`), `interactive` (רק ב-`awaitingInput`), `onPadDown(color)`.
- רבע מואר (`activeColor` או `pressedColor`) → מחלקה `--lit`: `filter: brightness(1.3)` + `box-shadow` Glow בצבע הרבע.
- `dimmed` → רבעים לא מוארים מעומעמים (`filter: brightness(0.45) saturate(0.7)`), כמו ב-Mockup "הצגת רצף".
- `interactive=false` → `aria-disabled="true"` ו-`cursor: default`; הלחיצה לא נשלחת. לא משתמשים ב-`disabled` של HTML, כדי לא לאבד את אירוע השחרור.
- מעבר הארה `transition` קצר (≈`80ms`); ב-`prefers-reduced-motion` ללא מעבר (כבר ב-`index.css`).

### 6.2 `HomeScreen` – מצבים (DESIGN §1.1)

| מצב | חיווי שלב | שורת סטטוס (`aria-live`) | כפתור |
|---|---|---|---|
| `idle` | "שלב 1 מתוך 10" | – | **"התחל משחק"** |
| `presenting` | `displayRound` | **"המשחק מציג את הרצף"** | – |
| `awaitingInput` | `round` | **"התור שלך"** + שורה משנית **"הקש על הצבעים לפי הסדר"** | – |
| `won` / `lost` | השלב האחרון | – | – (רק "אישור" בהודעה) |

אזור הכפתור שומר על גובה קבוע כדי שהלוח לא יקפוץ בין מצבים.

### 6.3 `ResultDialog`
- מוצג כאשר `resultVisible`. שכבת Scrim חצי-שקופה מעל מסך הבית (הלוח נשאר מזוהה ברקע), כרטיס `--surface` עם גבול כחול ופינות מעוגלות (Mockups).
- `role="dialog"`, `aria-modal="true"`, `aria-labelledby` לכותרת; פוקוס עובר לכפתור "אישור" בפתיחה.
- **ניצחון:** כותרת **"כל הכבוד! ניצחת!"** (ירוק/צהוב בהשראת ה-Mockup), מתחת **"השלמת 10 שלבים"**.
- **הפסד:** כותרת **"נפסלת!"** באדום, מתחת `completedRoundsText(completedRounds)` (§1).
- כפתור ראשי **"אישור"** → `dismiss()`.
- ללא קונפטי וללא צלילים (Milestone 3).

### 6.4 `App`
- `const game = useGame()` ב-`App` (לא נפרק במעבר מסכים).
- `handleNavigate(screen)`: אם עוברים ל-`about` – `game.abandon()` (לא משפיע על `won`/`lost`/`idle`), ואז `setScreen`.
- `ResultDialog` מוצג מעל מסך הבית בלבד.

## 7. בדיקות אוטומטיות

### 7.1 `gameReducer.test.ts` (ללא Mocks)
- `start` יוצר רצף באורך 1, `round=1`, `gameId` עולה.
- מעבר שלב: הרצף גדל באחד, ומתחיל ברצף הקודם (prefix); אורכים 1, 2, …, 10 בשלבים 1, 2, …, 10; צבע חוזר מותר.
- `press` ב-`presenting` / `idle` / `won` / `lost` – ללא שינוי.
- `presentationDone` עם מזהה ישן – ללא שינוי.
- הפסד בשלב 1 → `lost`, `completedRounds=0`.
- הפסד בשלב 5 → `completedRounds=4`; הפסד בלחיצה אמצעית ולא רק ראשונה.
- ניצחון אחרי שלב 10 → `won`, `completedRounds=10`, אורך רצף 10 (אין שלב 11).
- `dismiss` → `idle`, שומר `gameId`; `start` אחריו נותן `gameId` חדש ורצף חדש.
- `abandon` → `idle` ללא תוצאה; מ-`won`/`lost` – ללא שינוי.

### 7.2 `App.test.tsx` (אינטגרציה, `vi.useFakeTimers()`, `fireEvent` סינכרוני, `vi.mock('./game/random.ts')` עם רצף צבעים צפוי)
- בדיקות Milestone 1 הקיימות ממשיכות לעבור.
- "התחל משחק" → "המשחק מציג את הרצף"; אחרי `1000ms` הרבע הראשון מואר; אחרי `600ms` נכבה; אחרי סיום ההצגה – "התור שלך".
- לחיצה בזמן ההצגה לא משנה דבר (אין הפסד/התקדמות).
- שחזור נכון של שלב 1 → חיווי נשאר "שלב 1 מתוך 10" `1000ms`, מתחלף ל-"שלב 2 מתוך 10", ואחרי `1000ms` נוסף מתחילה ההצגה; רצף שלב 2 = הצבע הקודם + החדש.
- לחיצה שגויה → אין הודעה מיד; אחרי `1000ms` "נפסלת!" ו-"לא השלמת אף שלב" + "אישור".
- הפסד בשלב 2 → "השלמת שלב אחד"; בשלב 3 → "השלמת 2 שלבים".
- ניצחון מלא (10 שלבים עם Mock) → "כל הכבוד! ניצחת!" + "השלמת 10 שלבים".
- "אישור" → ההודעה נסגרת, "שלב 1 מתוך 10" ו-"התחל משחק"; משחק חדש מתחיל עם רצף חדש.
- מעבר ל"אודות" באמצע הצגה/תור → בחזרה: מצב "לפני תחילת משחק", אין רבע מואר, ו-`vi.getTimerCount()===0`.
- הודעת סיום שכבר הוכרעה נשארת אחרי מעבר ל"אודות" וחזרה, עד "אישור".
- `completedRoundsText` – בדיקת יחידה ל-0, 1, 2, 10.

## 8. אימות עצמי בסיום הבנייה (ע"י Claude)

1. `npm run typecheck`, `npm run test`, `npm run build` עוברים.
2. `npm run dev` בדפדפן המובנה ב-Viewport מובייל: משחק אמיתי – הצגה, הארה, לחיצות, מעבר שלב, הפסד מכוון, "אישור", משחק חדש; מעבר ל"אודות" באמצע משחק; בדיקה ש-Strict Mode לא מכפיל הצגה.
3. רענון דף באמצע משחק → מצב התחלה.
4. סגירת השרת, סימון 🟡 ליד Milestone 2, ADR ב-`ARCHITECTURE.md` אם התקבלה החלטה טכנית חדשה (למשל `displayRound`/`roundAdvanced` כחלק מ-presenting). אין commit.

## 9. מחוץ לתחום

צלילים ו-`AudioContext`, הודעת כשל אודיו, קונפטי (Milestone 3); מצב `paused` ו"המשך משחק", `visibilitychange` (Milestone 4); שמירת היסטוריה (Milestone 5). רענון דף מאפס הכל באופן טבעי – אין שמירת מצב משחק.

## 10. מיפוי ל-Definition of Done

| תנאי | איך מתקיים |
|---|---|
| התחלה בלחיצה; אורכי רצף 1/2/10; כל רצף מרחיב את הקודם | §4 `start`/`press`, בדיקות 7.1 + 7.2 |
| לחיצות ב-`presenting` לא משפיעות; נכונות מקדמות; שגויה אחת מפסידה | §4, §6.1 `interactive`, בדיקות 7.1 + 7.2 |
| בדיקות: הפסד בשלב 1 (0), הפסד מתקדם, ניצחון, אין שלב 11, רצף חדש במשחק הבא | §7.1 |
| קצב ההצגה וההמתנות לפי DESIGN; הודעת הפסד אחרי שנייה | §3, §5, בדיקות Fake Timers ב-7.2 |
| טקסט סיום נכון + "אישור"; החיווי חוזר ל"שלב 1 מתוך 10" | §6.3, §5 `displayRound`, 7.2 |
| Refresh מבטל משחק; אין שמירת מצב פעיל | מצב ב-Memory בלבד, §8.3 |
| מעבר ל"אודות" לא משאיר הארה או Timer | §5 `abandon`, 7.2 `getTimerCount` |
