

## Refactor Chat Response Rendering for Best-in-Class UX

### Problem
The MarkdownRenderer is minimal — it only handles code blocks and inline code. Missing support for: tables (GFM), task lists, links opening in new tabs, headings with proper sizing, blockquotes, horizontal rules, lists with proper spacing, and images. The `prose` Tailwind class provides some defaults but many markdown elements render poorly or inconsistently.

### Changes

#### 1. Install `remark-gfm` plugin
Adds GitHub Flavored Markdown support: tables, strikethrough, task lists, autolinks.

#### 2. Refactor `src/components/chat/MarkdownRenderer.tsx`
- Add `remarkGfm` plugin to ReactMarkdown
- Add custom components for:
  - **Links (`a`)**: Open external links in new tab with `rel="noopener noreferrer"`, styled with primary color
  - **Tables (`table`, `thead`, `th`, `td`)**: Styled with borders, alternating row colors, horizontal scroll wrapper for mobile
  - **Blockquotes (`blockquote`)**: Left border accent, muted background
  - **Lists (`ul`, `ol`, `li`)**: Proper spacing and bullet/number styling
  - **Headings (`h1`-`h4`)**: Proper size hierarchy with bottom borders on h1/h2
  - **Horizontal rules (`hr`)**: Styled divider
  - **Images (`img`)**: Rounded, max-height constrained, clickable to open full-size
  - **Task lists**: Checkbox rendering for `- [x]` / `- [ ]` syntax
- Improve the prose wrapper classes for tighter dark/light mode consistency

#### 3. Update system prompts in `supabase/functions/chat/index.ts`
Enhance `TIER_SYSTEM_PROMPTS` to instruct models to:
- Use markdown formatting consistently (headers, bold, lists, tables where appropriate)
- Structure long responses with clear sections
- Use tables for comparisons and structured data
- Use code blocks with language identifiers
- Use blockquotes for citations/quotes

This ensures models produce well-formatted output that the improved renderer can display properly.

### Files to Change
- `src/components/chat/MarkdownRenderer.tsx` — Full refactor with GFM + custom components
- `supabase/functions/chat/index.ts` — Enhanced system prompts (lines 24-28)
- `package.json` — Add `remark-gfm` dependency

