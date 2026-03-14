

# gBot — Production-Ready Refactor Plan

## Current State

Phase 1 landing page is built with 11 components, dark theme, and NVIDIA-green branding. The site renders correctly but needs significant polish and hardening for a production release.

## Refactor Areas

### 1. Visual Polish and Animations

**Scroll animations** — Add `framer-motion` for section reveal animations (fade-up on scroll entry). Every section currently appears statically.

**Hero enhancements:**
- Animated gradient mesh or particle background (CSS-only, no heavy lib)
- Typing effect on the headline or a rotating tagline
- Animated counter for the stats (3+, infinity, 100%)

**Micro-interactions:**
- Card hover lift with subtle shadow transitions
- Navbar blur-fade on scroll with active section highlighting
- Smooth scroll behavior for anchor links
- Button hover glow pulse animations

### 2. Responsive Design Hardening

- Navbar: mobile menu needs slide-in animation, not instant show/hide
- Hero: text sizing needs fine-tuning at 375px-414px widths
- FeaturesGrid: single column on mobile, 2-col tablet, 3-col desktop (currently jumps)
- ComparisonTable: horizontal scroll indicator on mobile, or card-based layout
- PartnersSection: 2-col grid too tight on small screens
- Footer: stack layout with proper spacing on mobile

### 3. Performance Optimization

- Replace Google Fonts `@import` with `<link>` preconnect + preload in `index.html`
- Add `font-display: swap` to prevent FOIT
- Lazy-load below-fold sections with `React.lazy` + `Suspense`
- Add proper image optimization setup (even though images are minimal now)
- Add `will-change` hints for animated elements

### 4. SEO and Metadata

- Add structured data (JSON-LD) for Organization and WebSite schemas
- Add canonical URL tag
- Add `theme-color` meta tag matching dark background
- Create a proper `manifest.json` for PWA-readiness
- Update `robots.txt` with sitemap reference
- Add `sitemap.xml` generation or static sitemap

### 5. Accessibility (a11y)

- Add `aria-label` to icon-only buttons (mobile menu toggle)
- Ensure color contrast ratios meet WCAG AA (green-on-dark needs verification)
- Add `skip-to-content` link
- Keyboard navigation for all interactive elements
- Focus-visible styles on all focusable elements
- `prefers-reduced-motion` media query to disable animations
- Proper heading hierarchy audit (h1 > h2 > h3 flow)

### 6. Code Architecture

- Extract shared section wrapper component (consistent padding, border, container)
- Create a `constants/` directory for content data (nav links, features, FAQs, partners, milestones)
- Add `NavLink` component for smooth-scroll anchor behavior with active state
- Type-safe component props with explicit interfaces (not inline)
- Remove unused UI components from `src/components/ui/` to reduce bundle size

### 7. Error Handling and Edge Cases

- Add `ErrorBoundary` wrapper around the app
- 404 page styled to match gBot theme (current NotFound is likely default)
- Loading states / skeleton screens for future dynamic content

### 8. Testing

- Add component tests for key sections (Navbar toggle, FAQ accordion, ComparisonTable rendering)
- Add visual regression baseline
- Lighthouse CI audit target: 95+ on Performance, Accessibility, SEO, Best Practices

### 9. Build and Deploy

- Add proper favicon set (16x16, 32x32, apple-touch-icon, SVG)
- Configure Vite build optimization (chunk splitting, minification)
- Add `preconnect` hints for external resources
- CSP-safe inline styles audit

---

## Implementation Order

| Step | Scope | Effort |
|------|-------|--------|
| 1 | Extract content to constants, shared section wrapper | Small |
| 2 | Font loading optimization + SEO metadata | Small |
| 3 | Accessibility fixes (aria, skip-link, contrast, focus) | Medium |
| 4 | Responsive hardening across all breakpoints | Medium |
| 5 | Add framer-motion scroll animations + micro-interactions | Medium |
| 6 | Hero enhancements (animated bg, counters, typing) | Medium |
| 7 | ErrorBoundary + themed 404 page | Small |
| 8 | NotFound page restyling | Small |
| 9 | Remove unused UI components, bundle audit | Small |
| 10 | Component tests for Navbar, FAQ, ComparisonTable | Medium |
| 11 | Favicon set + manifest.json + sitemap | Small |
| 12 | Lighthouse audit + final polish pass | Small |

Total: ~12 implementation steps across 6 messages.

