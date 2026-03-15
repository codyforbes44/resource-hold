

**Task:** Add a "Perfect" version badge to the bottom-right corner of the landing page, visible on all device types.

**Implementation:**

1. **Create a fixed VersionBadge component** - A small, fixed-position badge that displays in the bottom-right corner of the viewport.

2. **Styling approach:**
   - Position: `fixed bottom-4 right-4 z-50` (fixed position, above other content)
   - Use the existing Badge component from shadcn/ui for consistent styling
   - Apply a subtle glow and border to match the site's terminal aesthetic
   - Make it compact with small padding and text

3. **Add to Index.tsx** - Insert the badge component near the end of the page (before or after Footer), so it appears fixed on all sections.

**Design details:**
- Display text: "PERFECT" or similar indicator
- Use `glow-brand` or `border-glow` classes for the terminal aesthetic
- Ensure it doesn't interfere with scroll or content
- Responsive: Same placement on mobile (bottom-right, maybe slightly smaller)

**Files to modify:**
- `src/pages/Index.tsx` - Add the VersionBadge component

