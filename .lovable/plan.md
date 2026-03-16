

## Implement New gClaw Logo Across the Project

The uploaded image is the new gClaw logo — a stylized "G" with claw marks in the Google-inspired 4-color palette (red, blue, yellow, green). It will replace the current `logo-gclaw.png` in both asset locations.

### Changes

1. **Copy the uploaded logo to both asset locations:**
   - `src/assets/logo-gclaw.png` — used by React component imports (Navbar, Footer, Chat, Auth, VoiceAgent)
   - `public/logo-gclaw.png` — used by favicon, PWA manifest, and HTML meta tags

2. **No code changes needed** — all components already import from `@/assets/logo-gclaw.png` or reference `/logo-gclaw.png`. The file names stay the same, so every usage updates automatically:
   - **Navbar** — logo in top-left
   - **Footer** — logo in footer brand area  
   - **Auth page** — login/signup logo
   - **Chat page** — header logo + empty-state logo
   - **VoiceAgent** — avatar logo
   - **Favicon** (`index.html`)
   - **PWA manifest** (`public/manifest.json`)

3. **Minor enhancement** — Update Navbar and Footer to show the logo image alongside the text brand, since they currently only use the text `"> gClaw"` treatment despite importing the logo. Add a small `<img>` before the text in both components.

