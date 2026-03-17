

## Scroll-to-Top Button for Mobile

Add a floating "scroll to top" button that appears when the user scrolls down on mobile viewports, with smooth scroll behavior and a fade-in/out animation.

### Implementation

**New component: `src/components/landing/ScrollToTop.tsx`**
- Uses `useIsMobile()` hook to only render on mobile
- Tracks scroll position with `useState` + `useEffect` (show after scrolling 400px)
- Smooth scrolls to top via `window.scrollTo({ top: 0, behavior: "smooth" })`
- Animated with `framer-motion` `AnimatePresence` for fade/slide-in
- Styled as a small circular button with an `ArrowUp` icon, positioned `fixed bottom-14 right-4` (above the existing gClaw badge)
- Uses existing design tokens: `bg-primary text-primary-foreground` with `backdrop-blur` and `shadow-lg`

**Edit: `src/pages/Index.tsx`**
- Import and render `<ScrollToTop />` inside the page, alongside the existing fixed badge

