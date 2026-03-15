

# Use Uploaded Image as Hero Background

The uploaded image shows a dramatic sci-fi/cyberpunk scene with robots, neon lighting, and the gClaw logo — designed as a full-bleed hero background. I'll use the bottom-right variant (best composition for text overlay).

## Changes

### 1. Copy image to project
- Copy `user-uploads://A606F64C-1F8E-4AC7-9308-B41B016AA818.png` → `src/assets/hero-bg.png`

### 2. Update HeroSection (`src/components/landing/HeroSection.tsx`)
- Import the hero background image
- Replace the gradient mesh background div with:
  - Full-bleed `img` element with `object-cover`, absolute positioned behind content
  - Dark overlay gradient (`bg-gradient-to-t from-background via-background/80 to-background/40`) to ensure text readability
  - Keep the subtle blur blobs on top for extra depth
- All existing content (badge, headline, subheadline, CTAs, stats) stays exactly the same
- Text colors remain as-is — the dark overlay ensures contrast

### File changes
| File | Action |
|------|--------|
| `src/assets/hero-bg.png` | Copy from upload |
| `src/components/landing/HeroSection.tsx` | Replace background div with image + overlay |

