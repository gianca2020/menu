# A letter from Caco

A static site (plain HTML/CSS/JS, no build step). Open the envelope, the letter writes itself, and the family can request dishes with the pen.

## Deploy to Vercel

**Option A: CLI**
```bash
cd site
npx vercel          # first run: log in, accept defaults ("Other" framework, no build command)
npx vercel --prod   # publish
```

**Option B: dashboard**
Push this folder to a GitHub repo → vercel.com → Add New Project → import the repo → Framework preset: **Other** → Deploy.

## After the first deploy

1. **Link preview (iMessage):** in `index.html`, change
   `<meta property="og:image" content="/assets/img/og.png">`
   to the full URL, e.g. `https://your-project.vercel.app/assets/img/og.png`, so the envelope shows when you text the link.
2. **Web3Forms:** in your Web3Forms dashboard, update the form's Website URL from `localhost` to your Vercel URL (it's only a label).
3. **Send yourself a test request** from your phone and check it arrives (look in spam the first time, then mark it "not spam").

## Editing

| What | Where |
| --- | --- |
| Letter text, dishes, funny notes | `index.html` |
| Request-email key | `WEB3FORMS_KEY` at the top of `app.js` (it's meant to be public) |
| Idea chips in the request card | `.chips` in `index.html` |
| Writing speed | `perChar` in `app.js` |
| Colors | `:root` variables at the top of `style.css` |
| Music | replace `assets/music.mp3` (keep the name) |

The music is an original loop made for this site. Pen and paper sounds are generated live in the browser. Sound starts on the first tap (iPhones require a tap first), and there's a mute button in the top-right corner.

## Run locally
```bash
cd site && python3 -m http.server 8000   # then open http://localhost:8000
```
