# James, a voice assistant for Christopher Sagris

A static site (no server, no API keys) where visitors can ask James questions about Christopher out loud or by typing. James answers from Christopher's CV in a deep, American-accented male voice.

## Files
- `index.html` – the page
- `style.css` – cream background, Newsreader serif type
- `script.js` – listening, answers and speech. Edit the CV facts and answers at the top of this file.

## Deploy to GitHub Pages
1. Create a repository and put these files in its root.
2. Push:
   ```
   git add .
   git commit -m "James voice assistant"
   git push origin main
   ```
3. On GitHub: Settings → Pages → Source: Deploy from a branch, Branch `main`, folder `/ (root)` → Save.
4. After about a minute the site is live at `https://<username>.github.io/<repository-name>/`.

GitHub Pages serves over HTTPS, which browsers require for microphone access.

## Notes
- Speaking to James works in Chrome, Edge and Safari. Firefox visitors can type.
- The voice comes from the visitor's device. James picks the best male US English voice it finds (Microsoft Andrew/Guy in Edge, Aaron/Fred on Apple devices, David on Windows) and lowers the pitch. Visitors can change it with the Voice menu at the bottom of the page.
- The phone number is left out by default because the page is public. To include it, fill in `phone` in `PROFILE` in `script.js`.
