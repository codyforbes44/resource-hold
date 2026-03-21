

## Remove All Taskade Exposure from Users

### What
Remove all Taskade-related UI, chat skills, and tool definitions so no user can access Taskade resources. Keep the backend edge function and database tables intact (no data loss), but remove all user-facing entry points.

### Changes

#### 1. `src/components/chat/SkillsPanel.tsx`
- Remove the Taskade skill entry from the `DEFAULT_SKILLS` array (lines 82-90)
- Remove the `CheckSquare` import if no longer used

#### 2. `src/pages/Admin.tsx`
- Remove the Taskade tab trigger (line 193-195)
- Remove the Taskade tab content (lines 329-332)
- Remove the `TaskadeTab` import (line 15)
- Remove `CheckSquare` from lucide imports if unused

#### 3. `supabase/functions/chat/index.ts`
- Remove 4 Taskade tool definitions from `SKILL_TOOLS`: `taskade_create_task`, `taskade_list_tasks`, `taskade_create_project`, `taskade_prompt_agent`
- Remove the 4 Taskade executor functions: `taskadeApiCall`, `executeTaskadeCreateTask`, `executeTaskadeListTasks`, `executeTaskadeCreateProject`, `executeTaskadePromptAgent`
- Remove Taskade cases from the `executeTool` switch
- Remove the `if (enabledSkills.includes("taskade"))` block that adds Taskade tools
- Remove the 4 Taskade status messages from the streaming section
- Remove `TASKADE_BASE` constant

#### 4. Files NOT changed (preserved)
- `supabase/functions/taskade/index.ts` — edge function stays (admin backend)
- `src/integrations/taskade/` — service layer stays (unused but harmless)
- `src/hooks/useTaskade.ts` — stays (unused but harmless)
- `src/components/admin/TaskadeTab.tsx` — stays on disk but unreachable (no route to it)
- Database tables `taskade_configs`, `taskade_sync_log` — preserved

### Files Modified
| File | Action |
|------|--------|
| `src/components/chat/SkillsPanel.tsx` | Remove Taskade skill |
| `src/pages/Admin.tsx` | Remove Taskade tab |
| `supabase/functions/chat/index.ts` | Remove all Taskade tools, executors, and references |

