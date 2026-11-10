# Deploying Neon Vault to Cloudflare Pages

This site is 100% static (HTML/CSS/JS). There is **no build step**. You can deploy it
to Cloudflare Pages in about five minutes, even if you have never used Cloudflare before.

---

## 1. Prerequisites

- A free [Cloudflare account](https://dash.cloudflare.com/sign-up) (email + password is enough)
- This repository pushed to your own GitHub account (it already is, at `285190-tech/proxy`)

## 2. Point Pages at the repo

1. Go to the Cloudflare dashboard →
   [dash.cloudflare.com](https://dash.cloudflare.com) and sign in.
2. In the left sidebar click **Workers & Pages** (under *Build*).
3. Click the blue **Create application** button, then choose the **Pages** tab,
   then click **Connect to Git**.
4. The first time, Cloudflare asks to install its GitHub app. Authorize it and
   pick the GitHub account/organization that owns this repository.
5. Select **`285190-tech/proxy`** from the repository list and click **Begin setup**.

## 3. Build configuration (important — do not add a build step)

Fill in the form exactly like this:

| Setting | Value |
| --- | --- |
| **Project name** | whatever you like, e.g. `neon-vault` (this becomes `<project>.pages.dev`) |
| **Production branch** | `main` (or `arena/8696162a-proxy` if you deploy this working branch) |
| **Framework preset** | **None** |
| **Build command** | *(leave completely empty)* |
| **Build output directory** | `/` |

3. Click **Save and Deploy**.

Cloudflare will copy the repository as-is and publish it. First deploy takes about a minute.
When it finishes you get a live URL like `https://neon-vault.pages.dev`
(for this repo the connected project is **`https://proxy-9ap.pages.dev`**).

## 4. Updating the site later

Every push to the production branch triggers an automatic redeploy. Nothing else to do.

To preview a non-production branch instead, open the project → **Settings → Builds & deployments**
and change the **Production branch** — or open the project and deploy the branch as a preview.

## 5. Optional: custom domain

Open the project → **Custom domains** → **Set up a custom domain**, type your domain
(you must own it and can change its DNS), and follow the two-click instructions.
HTTPS certificates are issued automatically.

## 6. Optional: privacy-friendly analytics

The site ships with **no analytics and no cookies**. If you want traffic stats, the
privacy-friendly option is **Cloudflare Web Analytics** (aggregated, no personal data,
no cookies):

1. Dashboard → **Web Analytics** → **Add a site**.
2. Pick **Automatic setup** (works if your Pages project is selected) or copy the
   small `<script>` beacon snippet shown for **JS snippet** setup.
3. If you used the snippet, paste it just before `</head>` in `index.html`, commit, push.

Do **not** sprinkle random third-party trackers on top; the site's whole pitch is that it doesn't.

## 7. Notes, limitations & honesty corner

- **No web proxy is included, on purpose.** Cloudflare Pages serves static files;
  a server-side proxy would require Pages Functions/Workers code and exists mainly to
  get around network filters (e.g. at schools), which violates those networks'
  acceptable-use rules and tends to get the domain blocked within days anyway.
  Deploying this site doesn't change that. If you need a genuine proxy for legitimate
  privacy reasons, evaluate a reputable VPN or browser-level tool instead.
- **Scores and settings live in `localStorage`** on each visitor's device. There is no
  shared leaderboard because there is no backend.
- **Google Fonts loads from Google at runtime.** Everything else is self-contained.
  If you want a fully self-hosted site, download the two font families and drop them in
  `assets/fonts/` with local `@font-face` rules — the design survives with system fonts.
- **Deep-linking:** all asset paths are relative (`assets/…`, `../../assets/…`), so the site
  works from any project subpath and doesn't rely on absolute roots.
- **`404.html`** is served automatically by Pages for unknown paths.
- No secrets, tokens, or API keys are required anywhere in this repository. If you add any
  (e.g. analytics beacons are fine — they aren't secret), use Pages' encrypted
  **Environment variables**, never commit them.

## 8. Troubleshooting

| Symptom | Fix |
| --- | --- |
| Blank page, console shows 404 for `assets/…` | Build output directory must be `/` and preset **None** — you likely built with a framework preset. |
| Site works but fonts look generic | Check that `fonts.googleapis.com` is reachable; see §7 self-hosting note. |
| Old version still live | Hard-refresh (`Ctrl/Cmd + Shift + R`); Pages caches assets briefly. |
| GitHub connected but nothing deploys | Project → **Settings → Builds & deployments → Configure production deployments** and pick the right branch. |
