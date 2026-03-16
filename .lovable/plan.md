

## Plan: Add "Deep Research" Skill

A new skill that combines web search + knowledge base search into a single tool call, giving the model comprehensive multi-source results in one step.

### Changes

**1. `src/components/chat/SkillsPanel.tsx`**
- Add `Microscope` (or `FlaskConical`) icon import from lucide-react
- Add a 5th skill entry to `DEFAULT_SKILLS`:
  - `id: "deep_research"`, name "Deep Research", badge "Multi-Source", purple color
  - Description: "Chains web search with knowledge base for comprehensive, multi-source research answers."

**2. `supabase/functions/chat/index.ts`**
- Add a `deep_research` tool definition in `SKILL_TOOLS` with a `query` parameter
- Add `executeDeepResearch(query, userId)` function that:
  1. Runs `executeWebSearch(query)` and `executeKnowledgeSearch(query, userId)` in parallel
  2. Combines results under labeled sections ("Web Results" / "Knowledge Base Results")
  3. Returns the merged string to the model for synthesis
- Register it in `executeTool` switch

**3. `src/pages/Chat.tsx`**
- Add `"deep_research"` to `MODEL_SKILL_COMPAT` for models that support both web_search and knowledge_base (exclude `flash-lite`, `gpt-5-nano`, `zephel-fast`)
- Add `deep_research: "Deep Research"` to `SKILL_LABELS`

### Behavior
- When Deep Research is enabled, the model gets a `deep_research` tool it can call
- The backend executes both web search and knowledge base search in parallel, merges results, and returns them
- The model then synthesizes a comprehensive answer citing both sources
- Models that don't support knowledge_base are greyed out when Deep Research is active

