

# gBot → gClaw: Full Rebrand

## Brand Colors (from logo)

The gClaw logo uses Google's brand palette:
- **Red**: `#EA4335` / `hsl(5, 81%, 56%)`
- **Blue**: `#4285F4` / `hsl(217, 89%, 61%)`
- **Yellow**: `#FBBC04` / `hsl(45, 97%, 50%)`
- **Green**: `#34A853` / `hsl(137, 52%, 43%)`

## Changes Required

### 1. Logo Asset
- Copy uploaded logo to `public/logo-gclaw.png` (for favicon + HTML meta)
- Copy to `src/assets/logo-gclaw.png` (for React component imports in Navbar/Footer)
- Update `index.html` favicon reference

### 2. Color System (`src/index.css`)
- Replace `--gbot-green`, `--gbot-blue`, `--gbot-glow` with `--gclaw-red`, `--gclaw-blue`, `--gclaw-yellow`, `--gclaw-green`
- Change `--primary` from green `90 80% 42%` to blue `217 89% 61%` (blue is the dominant logo color)
- Change `--ring` to match new primary
- Update `.text-gradient-green` → `.text-gradient-brand` using a 4-color gradient (blue → green)
- Update `.glow-green` → `.glow-brand` using blue glow
- Update `.hero-mesh` radial gradients to use all 4 brand colors
- Update `.btn-hover-glow` and `.border-glow`

### 3. Tailwind Config (`tailwind.config.ts`)
- Rename `gbot` color group → `gclaw` with `red`, `blue`, `yellow`, `green`, `surface`, `surface-light`

### 4. Content Rename (`src/constants/landing.ts`)
- Replace every "gBot" → "gClaw" in all text content
- Rename `gbot` property in `ComparisonRow` interface → `gclaw`
- Update ecosystem variant names: "gClaw Core", "gClaw Enterprise", etc.
- Update FAQ questions and answers

### 5. Component Updates (all files in `src/components/landing/`)
- **Navbar.tsx**: Replace `Bot` icon with `<img>` of logo asset, change "gBot" text → "gClaw"
- **Footer.tsx**: Same logo swap, rename text
- **HeroSection.tsx**: Update copy "Launch gClaw", description text, class references
- **OverviewSection.tsx**: Update header text
- **ComparisonTable.tsx**: Update `row.gbot` → `row.gclaw`, header text, card labels
- **WhyItMatters.tsx**: Update header
- **EcosystemSection.tsx**: Update header/description
- **NotFound.tsx**: Update text + logo

### 6. Metadata (`index.html`, `public/manifest.json`, `public/sitemap.xml`)
- Replace all "gBot" → "gClaw" in title, meta tags, JSON-LD, manifest

### 7. CSS class renames
- `glow-green` → `glow-brand` (used in ~5 components)
- `text-gradient-green` → `text-gradient-brand` (used in ~6 section headers)
- `text-gbot-blue` → `text-gclaw-blue`
- `bg-gbot-blue` references

## Files to Modify

| File | Changes |
|------|---------|
| `src/index.css` | Color tokens, utility classes, hero-mesh gradients |
| `tailwind.config.ts` | `gbot` → `gclaw` color group |
| `src/constants/landing.ts` | All "gBot" → "gClaw" text, property rename |
| `src/components/landing/Navbar.tsx` | Logo image, text rename, class renames |
| `src/components/landing/Footer.tsx` | Logo image, text rename |
| `src/components/landing/HeroSection.tsx` | Text + class renames |
| `src/components/landing/OverviewSection.tsx` | Text + class renames |
| `src/components/landing/ComparisonTable.tsx` | Property + text + class renames |
| `src/components/landing/WhyItMatters.tsx` | Text + class renames |
| `src/components/landing/EcosystemSection.tsx` | Text + class renames |
| `src/components/landing/FAQSection.tsx` | Class renames |
| `src/components/landing/FeaturesGrid.tsx` | Class renames |
| `src/pages/NotFound.tsx` | Logo + text rename |
| `index.html` | Title, meta, JSON-LD, favicon |
| `public/manifest.json` | Name fields |

