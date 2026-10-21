# תוכנית – Milestone 3: צלילים וקונפטי

מקורות: `MILESTONES.md` (Milestone 3), `PRD.md` §4.2 (צליל לכל צבע, צליל הפסד שנייה אחרי לחיצה שגויה, צלילי סיום, קונפטי בניצחון בלבד, ללא מתג השתקה), `DESIGN.md` §1.1 (טבלת הקצב), §1.5 (הודעת כשל אודיו), §1.6 (`prefers-reduced-motion`), §2.4 (Motion & Feedback), `ARCHITECTURE.md` §1 (Web Audio API, `canvas-confetti`), §2.3 כללים 4–5 ו-9, §2.4.

הקוד הקיים (Milestone 2): `useGame` (`src/game/useGame.ts`) מנהל הצגה (`playPresentation` עם `onFlash`), לחיצות (`press`/`release`, `pressedColor`), Timer של הודעת סיום (`resultVisible`) ו-`abandon`. ה-Reducer טהור ואינו משתנה באבן דרך זו.

## 1. חבילות

- `canvas-confetti` (גרסה עדכנית, כרגע `1.9.x`) ו-`@types/canvas-confetti` (פיתוח), נעולות ב-Lockfile.
- ללא חבילת אודיו: Web Audio API מובנה (ARCHITECTURE §1).

## 2. קבצים

```text
src/audio/
  audioEngine.ts        # חדש: AudioContext, unlock, צליל לכל צבע, מוטיבי ניצחון/הפסד, עצירה
  audioEngine.test.ts   # חדש: בדיקות יחידה עם AudioContext מדומה
src/effects/
  confetti.ts           # חדש: fireWinConfetti(), clearConfetti()
src/game/useGame.ts     # שינוי: חיבור צלילים, unlock ב"התחל משחק", קונפטי, audioError
src/screens/HomeScreen.tsx/.css  # שינוי: הודעת כשל אודיו
src/App.test.tsx        # שינוי: Mock לאודיו ולקונפטי + בדיקות חדשות
package.json            # שינוי: script ‎dev:lan‎ לבדיקה בטלפון (§7)
```

## 3. `audioEngine.ts` – Web Audio

מודול יחיד (Singleton ברמת המודול), ללא React:

| פונקציה | התנהגות |
|---|---|
| `unlock(): Promise<void>` | נקרא **רק** מתוך Gesture (כרגע "התחל משחק"; ב-Milestone 4 גם "המשך משחק"). יוצר `AudioContext` אם אין (כולל `webkitAudioContext` כ-Fallback), קורא `resume()`, ונכשל (reject) אם אין תמיכה, אם `resume()` נכשל, או אם המצב אחרי ההמתנה אינו `running`. |
| `startTone(color): void` | מתחיל צליל רציף לצבע. אם כבר מתנגן צליל צבע – הוא נעצר קודם (צליל צבע אחד בכל רגע). |
| `stopTone(): void` | עוצר את צליל הצבע הנוכחי עם Release קצר. |
| `playWin(): void` / `playLoss(): void` | מוטיבי סיום קצרים (≈`0.6–1s`). |
| `stopAll(): void` | עוצר מיד כל צליל פעיל (צבע ומוטיבים). |

**צלילים** (ARCHITECTURE §2.4: Oscillator + `GainNode`, Envelope קצר):
- גבהי צליל בהשראת מכשיר Simon המקורי, נבדלים בבירור: **ירוק `415Hz`**, **אדום `310Hz`**, **צהוב `252Hz`**, **כחול `209Hz`**; גל `triangle`.
- Envelope: Attack ≈`10ms` ל-Gain ≈`0.3`, Release ≈`40ms` ב-`setTargetAtTime`/`linearRampToValueAtTime` – למניעת קליקים; ה-Oscillator נעצר אחרי ה-Release ומנותק.
- **ניצחון:** ארפג'ו עולה מהיר (`C5–E5–G5–C6`, כ-`120ms` לתו, האחרון ארוך יותר).
- **הפסד:** שני תווים יורדים ונמוכים (≈`196Hz` → `147Hz`, גל `sawtooth` בעוצמה נמוכה יותר), כ-`0.8s`.
- כל קריאה כשאין `AudioContext` פעיל היא No-op שקט (לא זורקת), כדי שלא לשבור משחק; הכשל עצמו מטופל רק ב-`unlock`.
- רישום הצלילים הפעילים (Set של nodes) כדי ש-`stopAll` יעצור הכל, כולל מוטיב שבאמצע.

## 4. חיבור ל-`useGame`

### 4.1 התחלת משחק עם Gesture (ARCHITECTURE §2.4, §2.6)
- `start()` נקרא מתוך ה-`onClick` של "התחל משחק": `audio.unlock()` נקרא **סינכרונית בתוך ה-Handler** (כדי שייחשב Gesture), ורק כשה-Promise מצליח → `dispatch(start)`.
- Guard (`ref`) נגד לחיצה כפולה בזמן שה-unlock ממתין.
- **כשל:** לא מתחילים רצף שקט. נשארים ב-`idle`, מוצגת ההודעה **"לא הצלחנו להפעיל את הצליל. הקש שוב על הכפתור."** (DESIGN §1.5) מתחת ללוח, והכפתור "התחל משחק" נשאר ללחיצה חוזרת. ניסיון מוצלח מנקה את ההודעה.
- `useGame` מחזיר גם `audioError: boolean`.

### 4.2 צליל בהצגת הרצף
- `onFlash(color)` → `setActiveColor(color)` + `audio.startTone(color)`; `onFlash(null)` → `audio.stopTone()`. כך הצליל זהה בדיוק להארה (`600ms`).
- Cleanup של Effect ההצגה (ביטול / `abandon` / Unmount) → `audio.stopTone()`.

### 4.3 צליל בלחיצת שחקן
- ב-`press` (בכל לחיצה ב-`awaitingInput`, נכונה או שגויה) → `audio.startTone(color)` **מיד**, יחד עם ההארה.
- הצליל נמשך כמו ההארה: לפחות `300ms` או כל עוד האצבע לוחצת; בכל מקום שבו `pressedColor` מתאפס → `audio.stopTone()` (פונקציה אחת `endPress` שמרכזת את שניהם).
- לחיצה שגויה: הצליל של הצבע שנלחץ מושמע מיד (PRD §4.2), ושנייה אחר כך צליל ההפסד (§4.4).

### 4.4 סיום משחק
- ה-Timer הקיים של `RESULT_DELAY_MS` (`1000ms`) מציג את ההודעה **ובאותו רגע** מפעיל: `playLoss()` בהפסד, או `playWin()` + קונפטי בניצחון. הקונפטי והצליל נשארים צמודים להודעה (DESIGN §1.1).
- ה-Timer לא מתבטל במעבר ל"אודות" (כלל 9), ולכן גם הצליל יושמע אם המשתמש עבר ל"אודות" בשנייה הזו – זהו משחק שכבר הוכרע ואינו "משחק פעיל".

### 4.5 עצירה
- `abandon()` (הפתרון הזמני ממילסטון 2) → `audio.stopAll()` מיד, בנוסף לניקוי הקיים.
- `dismiss()` ("אישור") → `audio.stopAll()` + `clearConfetti()`.
- Unmount של ה-Hook → `audio.stopAll()`.

## 5. קונפטי – `src/effects/confetti.ts`

- `fireWinConfetti()`: אם `matchMedia('(prefers-reduced-motion: reduce)')` פעיל – לא עושה דבר (DESIGN §1.6). אחרת: פרץ אחד מרכזי ושני פרצים צדדיים קצרים, צבעי המשחק בלבד (`#00D26A`, `#FF3B30`, `#FFD600`, `#00A3FF`), `disableForReducedMotion: true`, `zIndex` מעל חלונית הסיום.
- `clearConfetti()`: `confetti.reset()`.
- **פעם אחת בלבד לכל ניצחון:** הקריאה נעשית מתוך ה-Timer של הודעת הסיום, שרץ פעם אחת לכל `gameId`; Guard נוסף ב-`ref` של ה-`gameId` האחרון שקיבל קונפטי, כדי לא להפעיל שוב בהרצה הכפולה של Strict Mode.
- **ניקוי ביציאה מהמצב:** Cleanup של ה-Effect כשהסטטוס יוצא מ-`won` (אחרי "אישור") → `clearConfetti()`.
- בהפסד אין קונפטי.

## 6. UI

- `HomeScreen`: כשהמצב `idle` ו-`audioError` – פסקה `role="alert"` עם ההודעה מ-§4.1, מעל הכפתור, בצבע בולט (`--red` או `--soft-gray` על רקע `--surface`), בלי לשנות את גובה הלוח.
- אין כפתור או מתג השתקה (PRD §4.2).
- ההוראה על מתג השקט באייפון כבר מוצגת במסך "אודות" (Milestone 1).

## 7. בדיקה במכשיר אמיתי (DoD: "המשתמש אישר במכשיר אמיתי שהצלילים נשמעים")

- script חדש ב-`package.json`: `"dev:lan": "vite --host"` – שרת הפיתוח נגיש גם מטלפון באותה רשת Wi-Fi, בכתובת `http://<כתובת-המחשב>:5173/simon-game/`. Web Audio עובד גם ב-HTTP מקומי (לא נדרש HTTPS).
- ב"הרץ כדי שאבדוק" Claude מריץ את `dev:lan`, מציג למשתמש את הכתובת שמופיעה ב-Vite (`Network: ...`), ונותן הוראות פשוטות: לחבר את הטלפון לאותה רשת, לאשר את חומת האש של Windows אם תופיע שאלה (המשתמש מאשר בעצמו), באייפון לוודא שמתג השקט כבוי והווליום פתוח.
- Claude לא מסמן את הבדיקה הזו כעוברת – רק המשתמש מאשר.

## 8. בדיקות אוטומטיות

### 8.1 `audioEngine.test.ts` (AudioContext מדומה ב-`vi.stubGlobal`)
- `unlock` נכשל כשאין `AudioContext`, כש-`resume()` נכשל, וכשהמצב נשאר `suspended`; מצליח כשהמצב `running`.
- ארבעת הצבעים מקבלים ארבעה גבהי צליל שונים.
- `startTone` של צבע שני עוצר את הקודם; `stopAll` עוצר את כל ה-Oscillators הפעילים.
- קריאות לפני `unlock` אינן זורקות.

### 8.2 `App.test.tsx` (`vi.mock` ל-`./audio/audioEngine.ts` ול-`canvas-confetti`)
- כל בדיקות Milestone 2 ממשיכות לעבור (ה-Mock של `unlock` מצליח כברירת מחדל; `start` נהיה אסינכרוני, ולכן הבדיקות ממתינות ל-`act` אחרי הלחיצה).
- **כשל אודיו:** `unlock` נכשל → מוצגת ההודעה, אין "המשחק מציג את הרצף", אין `startTone` גם אחרי שניות; לחיצה חוזרת עם `unlock` מצליח → המשחק מתחיל וההודעה נעלמת.
- **צליל בהצגה:** `startTone('red')` בזמן ההארה, `stopTone` בסופה.
- **צליל לחיצה:** `pointerdown` → `startTone(color)` מיד; `stopTone` אחרי `300ms` (או בשחרור מאוחר).
- **הפסד:** לחיצה שגויה → `startTone` של הצבע מיד; `playLoss` לא נקרא לפני `1000ms` ונקרא בדיוק עם הופעת ההודעה; `confetti` לא נקרא.
- **ניצחון:** `playWin` ו-`confetti` נקראים פעם אחת עם הופעת ההודעה; "אישור" → `confetti.reset` ו-`stopAll`.
- **מעבר ל"אודות" באמצע משחק:** `stopAll` נקרא, ואין `startTone` נוסף לאחר מכן.

## 9. אימות עצמי בסיום הבנייה (ע"י Claude)

1. `npm run typecheck`, `npm run test`, `npm run build` עוברים.
2. `npm run dev` בדפדפן המובנה: משחק אמיתי, ובדיקה שה-`AudioContext` במצב `running` ושאין שגיאות ב-Console. Claude לא יכול לשמוע, ולכן השמיעה עצמה נבדקת אצל המשתמש (§7). הגעה לניצחון ידני אינה מעשית בבדיקה עצמית, ולכן הקונפטי נבדק בבדיקות האוטומטיות, ובמראה – אצל המשתמש.
3. סגירת השרת, סימון 🟡, ADR אם התקבלה החלטה טכנית (למשל גבהי הצליל או מודול אודיו יחיד). אין commit.

## 10. מחוץ לתחום

השהיה, "המשך משחק" ו-`visibilitychange`/`pagehide` (Milestone 4, כולל unlock ב"המשך משחק" והודעת כשל שם); היסטוריה (Milestone 5); טיפול בהפרעת אודיו מצד מערכת ההפעלה באמצע משחק – מעבר לנעשה ב-unlock – אינו נדרש באבן דרך זו.

## 11. מיפוי ל-Definition of Done

| תנאי | איך מתקיים |
|---|---|
| ארבעה צלילים שונים והארה נבדלת | §3 גבהי צליל, §4.2–4.3, בדיקות 8.1 |
| לחיצה שגויה: צליל הצבע מיד, צליל הפסד + הודעה אחרי שנייה | §4.3–4.4, בדיקה 8.2 "הפסד" |
| טקסט וצליל סיום מתאימים; קונפטי בניצחון בלבד | §4.4, §5, בדיקות 8.2 |
| כשל אודיו: הודעה בעברית, ניסיון חוזר, ללא רצף שקט | §4.1, §6, בדיקה 8.2 "כשל אודיו" |
| מעבר ל"אודות" לא משאיר צליל פעיל | §4.5, בדיקה 8.2 |
| אישור המשתמש במכשיר אמיתי | §7 |
