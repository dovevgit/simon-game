# תוכנית – Milestone 7: PWA והפעלה Offline

מקורות: `MILESTONES.md` (Milestone 7), `PRD.md` §4.5, §5 (PWA), Edge Case "דפדפן שאינו תומך בהתקנת PWA", `ARCHITECTURE.md` §1 (PWA), §2.7, §2.10, סיכון "עדכוני PWA", החלטות ראשוניות 6, 7, 8, 9, ADR-2, `DESIGN.md` §1.6 (כיוון אנכי), §2.4 (App Icon).

## 0. החלטות המשתמש לפני הבנייה (21.10.2026)

| שאלה | תשובה | השלכה |
|---|---|---|
| שם האפליקציה המותקנת | **"דובב"** (ולא `Simon`) | `name` ו-`short_name` = `דובב`. משנה את החלטה ראשונית 9 ואת ARCHITECTURE §2.7 → יתועד כ-ADR-4; עדכון ה-PRD/DESIGN/ARCHITECTURE עצמם – רק באישור המשתמש |
| הודעת "גרסה חדשה" | **ללא הודעה** (עדכון שקט) | החלטה ראשונית 6 כפי שהיא |

**הבהרה למשתמש:** PWA אינו קובץ להורדה (כמו APK); זה אתר שהדפדפן מאפשר "להתקין" – אייקון במסך הבית, פתיחה במסך מלא בלי שורת כתובת, ועבודה בלי אינטרנט אחרי הפתיחה הראשונה.

## 1. תאימות (ADR-2)

`vite-plugin-pwa@2.0.0` (עדכון אחרון 3.10.2026) מצהיר על תמיכה ב-`vite ^8.0.0`; תלויות: `workbox-build`/`workbox-window` `^7.4.1`, ו-`@vite-pwa/assets-generator` `^1 || ^2`. אין צורך לשנות את גרסת Vite.

## 2. שינויים בקבצים

```text
package.json / package-lock.json  # devDependencies: vite-plugin-pwa, @vite-pwa/assets-generator; סקריפט generate-pwa-assets
public/icon.svg                   # חדש: מקור האייקון
public/pwa-64x64.png              # נוצרים מהסקריפט ונשמרים ב-Repository (החלטה ראשונית 7)
public/pwa-192x192.png
public/pwa-512x512.png
public/maskable-icon-512x512.png
public/apple-touch-icon-180x180.png
public/favicon.ico
pwa-assets.config.ts              # חדש: תצורת המחולל (preset minimal-2023)
vite.config.ts                    # VitePWA: Manifest, Workbox, registerType: 'prompt'
src/main.tsx                      # registerSW({ immediate: true }) – ללא onNeedRefresh
tsconfig.app.json                 # types: "vite-plugin-pwa/client" (למודול virtual:pwa-register)
index.html                        # favicon אמיתי + apple-touch-icon במקום ה-data: הזמני; apple-mobile-web-app-title
spec/ARCHITECTURE.md              # ADR-4 בלבד (שם האפליקציה המותקנת)
CLAUDE.md                         # "פקודות הרצה": בדיקת PWA עם build + preview
```

## 3. אייקון (DESIGN §2.4, החלטה ראשונית 7)

- `public/icon.svg` נכתב ידנית, `512×512`: רקע `#0A1628` מלא (ללא שקיפות – נדרש ל-Maskable ול-iOS); לוח עגול בקוטר ~78% מהקנבס, ממורכז (בתוך ה-Safe Zone של 80%); ארבעה רבעים בסידור הלוח – **ירוק ↖ `#00D26A`, אדום ↗ `#FF3B30`, צהוב ↙ `#FFD600`, כחול ↘ `#00A3FF`** – מופרדים בפסי `#0F0F0F`, ודיסק מרכזי כהה `#0F0F0F`. ללא טקסט.
- `pwa-assets.config.ts`: `preset: minimal2023Preset`, `images: ['public/icon.svg']`; רקע ה-Maskable וה-Apple `#0A1628`.
- `npm run generate-pwa-assets` מייצר את קובצי ה-PNG ואת `favicon.ico` ל-`public/`; הם נשמרים ב-Repository, וה-CI לא מריץ את המחולל.

## 4. `vite.config.ts` – `VitePWA` (§2.7, החלטות ראשוניות 6, 8, 9)

- `registerType: 'prompt'`, `injectRegister: false`, `strategies: 'generateSW'`.
- **Manifest:**
  - `id: '/simon-game/app'` (קבוע לתמיד – החלטה ראשונית 9)
  - `name: 'דובב'`, `short_name: 'דובב'`, `description` קצר בעברית
  - `lang: 'he'`, `dir: 'rtl'`
  - `start_url: '/simon-game/'`, `scope: '/simon-game/'` (נגזרים מקבוע ה-`base` היחיד)
  - `display: 'standalone'`, `orientation: 'portrait'`
  - `theme_color: '#0A1628'`, `background_color: '#0A1628'`
  - `icons`: `pwa-64x64`, `pwa-192x192`, `pwa-512x512` (`purpose: 'any'`), `maskable-icon-512x512` (`purpose: 'maskable'`)
- **Workbox:**
  - `globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,woff}']` – כולל קובצי הגופן Heebo.
  - `navigateFallback: '/simon-game/index.html'` (SPA בתוך ה-Scope בלבד).
  - `cleanupOutdatedCaches: true`. **ללא** `skipWaiting` וללא `clientsClaim`.
  - אין Runtime Caching – אין בקשות רשת חיצוניות.
- `devOptions` כבוי: ה-Service Worker לא רץ ב-`npm run dev` (מונע Cache מבלבל בפיתוח); בדיקות PWA רק עם `build` + `preview`.

## 5. רישום ועדכונים – `src/main.tsx` (החלטה ראשונית 6)

- `registerSW({ immediate: true })` מתוך `virtual:pwa-register`, **בלי** `onNeedRefresh` ובלי `updateSW()`.
- גרסה חדשה מותקנת ברקע ונשארת `waiting` עד שכל חלונות האפליקציה נסגרים – משחק פעיל לעולם אינו מתרענן בכפייה. אין הודעה למשתמש.
- ב-Vitest לא מורץ `main.tsx`, ולכן אין צורך ב-Mock למודול הווירטואלי.

## 6. `index.html`

- מחליף את `<link rel="icon" href="data:,">` הזמני (Milestone 6) ב-`favicon.ico` וב-`icon.svg` (`type="image/svg+xml"`).
- `<link rel="apple-touch-icon" href="…/apple-touch-icon-180x180.png">` – כל הנתיבים יחסיים ל-`base`.
- `<meta name="apple-mobile-web-app-title" content="דובב">` – השם מתחת לאייקון באייפון.
- את קישור ה-Manifest מזריק התוסף.

## 7. ADR

**ADR-4: שם האפליקציה המותקנת "דובב"** – הקשר: החלטה ראשונית 9 קבעה `Simon` לבקשת המשתמש; אחרי Milestone 6 המשתמש שינה את כותרת המשחק ל"דובב" וביקש שגם האפליקציה המותקנת תיקרא כך. החלטה: `name`/`short_name`/`apple-mobile-web-app-title` = "דובב"; ה-`id` (`/simon-game/app`), כתובת האתר ושם ה-Repository – ללא שינוי. השלכות: שינוי שם עתידי אפשרי בלי לשבור התקנות (ה-`id` קבוע).

## 8. בדיקות

### 8.1 אוטומטיות
- כל בדיקות ה-Regression הקיימות (78) עוברות ללא שינוי (DoD).
- אין בדיקות יחידה ל-Service Worker (נוצר אוטומטית ע"י Workbox); האימות ב-8.2.
- בדיקת Build: `dist/` מכיל `manifest.webmanifest`, `sw.js`, `workbox-*.js` ואת האייקונים; ה-Manifest כולל את השדות של §4.

### 8.2 ידניות ע"י Claude (`npm run build` + `npm run preview`, דפדפן מובנה, `http://localhost:4173/simon-game/`)
1. ה-Manifest נטען ותקין (בדיקה דרך `fetch` מה-Console), ה-Service Worker רשום ו-`activated`, ה-Scope `/simon-game/`.
2. `caches` מכיל את ה-JS, ה-CSS, ה-HTML, האייקונים וקובצי `woff2`.
3. **Offline:** סגירת שרת ה-`preview` → רענון הדף → האפליקציה נטענת מה-Cache: שני המסכים, משחק עד הפסד (צלילים – נבדקים ב-Mock בלבד; בדפדפן אין דרך לשמוע), רשומה חדשה בהיסטוריה וצפייה בה.
4. **עדכון בלי Reload:** Build שני עם שינוי זעיר בזמן שהדף פתוח ומשחק פעיל → ה-SW החדש `waiting`, הדף לא מתרענן והמשחק ממשיך.
5. אין שגיאות 404 ב-Network ובקונסול.

### 8.3 אחרי Push – באתר הפרוס (Claude)
אותן בדיקות 1–2 ב-`https://dovevgit.github.io/simon-game/` (HTTPS נדרש ל-Service Worker מחוץ ל-`localhost`).

### 8.4 בדיקת המשתמש בטלפון (DoD אחרון)
הוראות: פתיחת האתר → "הוספה למסך הבית" (Android: תפריט ⋮ → "התקן אפליקציה"; iPhone Safari: שיתוף → "הוסף למסך הבית") → אייקון "דובב" → פתיחה במסך מלא; מצב טיסה → פתיחה מהאייקון → משחק, צלילים, "אודות", היסטוריה. רק המשתמש מאשר.

## 9. סדר העבודה

1. **בנייה** (§2–§7) + אימות מקומי (§8.1–§8.2), סימון 🟡, בלי commit.
2. **עצירה:** בקשת אישור ל-Push – האתר הפרוס חייב HTTPS כדי שההתקנה תעבוד בטלפון.
3. אחרי האישור: Push, מעקב אחרי ה-Workflow, בדיקה §8.3, והוראות §8.4. ✅ רק לאחר אישור המשתמש.

## 10. מחוץ לתחום

הודעת "גרסה חדשה" (המשתמש בחר עדכון שקט), Push Notifications, Background Sync, Runtime Caching, חנויות אפליקציות (Google Play / App Store), שינוי כתובת האתר.

## 11. מיפוי ל-Definition of Done

| תנאי | איך מתקיים |
|---|---|
| Manifest ו-Service Worker תקינים; אפשרות התקנה | §3, §4, §6, בדיקות §8.2.1 + §8.3 |
| Offline: פתיחה מחדש, משחק, צלילים, ניווט, היסטוריה | Precache מלא כולל גופנים (§4), אודיו מקומי (Web Audio), `localStorage`; בדיקה §8.2.3 |
| עדכון גרסה לא מרענן משחק פעיל | `registerType: 'prompt'` בלי `skipWaiting`/`clientsClaim` (§4–§5); בדיקה §8.2.4 |
| בדיקות ה-Regression עוברות | §8.1, וגם ב-CI לפני כל פריסה |
| אישור המשתמש: התקנה ופתיחה Offline | §8.4 |
