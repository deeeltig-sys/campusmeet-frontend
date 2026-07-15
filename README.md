# CampMEET — Frontend

React + Vite web app, shelled as a native Android/iOS app with Capacitor.
Palette: deep maroon (#6B1530) + gold (#D4AF37), verified-student seal in light maroon (#F3E1E6).

Backend is already live at: `https://campus-backend-tz9q.onrender.com`
(set in `src/api/client.js` — that's the only file to touch if the URL ever changes)

---

## 1. Local setup

```
npm install
npm run dev
```

Opens at `http://localhost:5173`. Runs entirely against your live Render backend — no local backend needed.

## 2. Push to GitHub (same pattern as the backend)

```
cd campmeet-frontend
git init
git add .
git commit -m "Initial commit - CampMEET frontend"
git branch -M main
git remote add origin https://github.com/deeeltig-sys/campmeet-frontend.git
git push -u origin main
```

(Create the empty repo on GitHub first, same as you did for `backend`.)

## 3. Wrap it with Capacitor (native Android app)

Capacitor is already installed as a dependency. To turn this into an installable Android app:

```
npm run build
npx cap add android
npx cap sync
npx cap open android
```

That last command opens Android Studio. From there: **Build → Generate Signed Bundle/APK** to get an installable app, or just hit Run to test on an emulator/device.

If you want an iOS build later (needs a Mac + Xcode):
```
npx cap add ios
npx cap sync
npx cap open ios
```

Whenever you change the React code, re-run `npm run build && npx cap sync` before opening the native project again — Capacitor only picks up whatever's in `dist/`.

## 4. App icon / splash

`capacitor.config.json` sets the splash background to the maroon (#4A0E21) so there's no white flash on native boot.
For proper native app icons (not just the web favicon), use:
```
npx @capacitor/assets generate --iconBackgroundColor '#4A0E21' --splashBackgroundColor '#4A0E21'
```
after adding your source icon to `assets/icon.png` (1024×1024) — copy `src/assets/app-icon.png` there first.

---

## API contract (confirmed against your actual route files)

| Action | Endpoint | Notes |
|---|---|---|
| Sign up | `POST /api/auth/signup` | `full_name` top-level, not nested |
| Log in | `POST /api/auth/login` | |
| Own profile | `GET /api/auth/me` | raw row — includes `student_id_number`, `verified_at` |
| Feed | `GET /api/posts/feed` | public, ranked, active posts only |
| Create post | `POST /api/posts` | auth required |
| Edit / soft-delete post | `PATCH /api/posts/:id` | `{"delete": true}` to remove |
| React | `POST /api/posts/:id/reactions` | `{"type": "fire"}` — must be `fire`, `cosign`, `doubt`, or `yawa`, not a generic "like" |
| Remove reaction | `DELETE /api/posts/:id/reactions` | |
| Public profile | `GET /api/profile/:id` | shaped by `public_user_fields` — no email/student ID |
| Edit own profile | `PATCH /api/profile/me` | only `full_name`, `avatar_url` accepted |
| Pending verifications | `GET /api/admin/users?verified=false` | staff only |
| Verify | `POST /api/admin/users/:id/verify` | sets `verified_at` server-side via RPC |

One open question I couldn't resolve without `db/schema.sql`: the `feed` view may or may not join in each post's author name/verified status directly. `PostCard.jsx` handles a couple of likely shapes (`author.full_name` or flattened `author_full_name`/`author_verified_at`), but if names don't show up on the feed, that's the first thing to check — share `db/schema.sql`'s `feed` view definition and I'll match it exactly.

## Admin access

Any user whose `role` comes back as `"admin"` from `/api/auth/me` sees a small gold shield button floating above the bottom nav, on every screen except the admin panel itself. Tapping it opens `/admin` — a list of pending USTED verifications with a one-tap Verify button, calling the real `verify_student` RPC through your backend. This is exactly the account you promoted via SQL earlier.

---

Created by **Makaveli X** — Founder & Lead Developer, ProjectX Web Development.
