# 2L Iteration Plan - MCP Cleanup + Honest Validation

## Project Vision

Improve the reliability and trustworthiness of the 2L autonomous development framework by eliminating broken MCP integrations and introducing honest, confidence-based validation reporting. This iteration transforms validators from binary pass/fail judges into honest assessors who communicate uncertainty, partial progress, and incompleteness.

## Success Criteria

Specific, measurable criteria for iteration completion:

- [ ] Zero references to GitHub MCP in any agent file
- [ ] Zero references to Screenshot MCP in any agent file
- [ ] Exactly 3 working MCPs documented consistently across all 4 MCP-enabled agents
- [ ] 2l-validator.md includes 5-tier status system (PASS/UNCERTAIN/PARTIAL/INCOMPLETE/FAIL)
- [ ] 2l-validator.md includes "Reporting Standards: Honesty Over Optimism" section
- [ ] 2l-validator.md includes 80% confidence rule with decision framework
- [ ] 2l-validator.md includes 5+ examples of honest vs optimistic reporting
- [ ] 2l-ivalidator.md includes "Honesty in Cohesion Assessment" section
- [ ] 2l-ivalidator.md includes gray area handling with new statuses
- [ ] All validation report templates include confidence level fields
- [ ] Grep verification confirms no broken MCP references remain
- [ ] MCP sections are identical across all 4 agent files

## MVP Scope

**In Scope:**

- MCP section standardization (Playwright, Chrome DevTools, Supabase Local)
- Complete removal of GitHub MCP references (2l-explorer.md)
- Complete removal of Screenshot MCP references (2l-validator.md, 2l-builder.md, 2l-healer.md)
- Add "Reporting Standards: Honesty Over Optimism" section to 2l-validator.md
- Add "Honesty in Cohesion Assessment" section to 2l-ivalidator.md
- Update validation report templates with confidence fields
- Add 5-tier status system to both validator agents
- Add 80% confidence rule and decision framework
- Add graceful MCP degradation guidance
- Provide 5+ concrete examples of honest reporting
- Verify consistency and completeness via grep/search

**Out of Scope (Post-MVP):**

- Orchestration updates to handle new statuses (deferred to Iteration 3)
- Dashboard integration for confidence tracking
- Automated confidence calculation formulas
- Agent training on new status usage patterns
- Historical validation report analysis
- MCP availability detection logic

## Development Phases

1. **Exploration** ✅ Complete
2. **Planning** 🔄 Current
3. **Building** ⏳ 2-3 hours (single builder with potential split)
4. **Integration** ⏳ N/A (in-place edits, no integration needed)
5. **Validation** ⏳ 15 minutes (grep verification + manual review)
6. **Deployment** ⏳ Final (copy to ~/.claude/)

## Timeline Estimate

- Exploration: Complete (2 explorers)
- Planning: Complete (this document)
- Building: 2-3 hours
  - Track A (MCP Cleanup): 45 minutes (4 files, straightforward deletions)
  - Track B (Honesty Enhancement): 1.5-2 hours (2 files, template additions)
  - Verification: 15 minutes (grep + manual review)
- Integration: N/A (in-place file edits)
- Validation: 15 minutes (verification only)
- Total: ~2.5-3.5 hours

## Risk Assessment

### High Risks

**None identified.** This is a documentation cleanup and enhancement effort with no code changes or architectural modifications.

### Medium Risks

**Risk: Validators don't adopt honest reporting**
- **Impact:** New statuses available but unused, validators continue binary PASS/FAIL pattern
- **Likelihood:** MEDIUM (cultural change requires clear guidance)
- **Mitigation:** Prominent "Honesty Over Optimism" section at top of prompts, 5+ concrete examples, decision tree for status selection

**Risk: Incomplete MCP reference removal**
- **Impact:** Users still encounter broken MCP errors despite cleanup effort
- **Likelihood:** MEDIUM (easy to miss scattered references)
- **Mitigation:** Comprehensive grep patterns (case-insensitive, multiple search terms), manual review of search results, validation phase confirms zero occurrences

**Risk: Orchestration breaks on new statuses**
- **Impact:** Orchestration expects PASS/FAIL, crashes or behaves unexpectedly with UNCERTAIN/PARTIAL
- **Likelihood:** LOW-MEDIUM (depends on orchestration parsing implementation)
- **Mitigation:** Document orchestration impact for future work, initial behavior treats UNCERTAIN/PARTIAL as "proceed with caution" (safe default), defer orchestration changes to Iteration 3

### Low Risks

**Risk: Report templates become too verbose**
- **Impact:** Validation reports double in length, harder to read
- **Likelihood:** LOW (additions are structured, not verbose)
- **Mitigation:** Keep confidence rationale to 2-3 sentences, use bulleted lists, tripartite reporting is concise

**Risk: Status proliferation confuses users**
- **Impact:** 5 statuses instead of 2 makes results harder to interpret
- **Likelihood:** LOW (statuses are intuitive with clear semantics)
- **Mitigation:** Use emoji markers (✅ ⚠️ ❌), group statuses clearly, include confidence rationale explaining meaning

## Integration Strategy

**No integration phase required.** This iteration modifies agent prompt files in-place. Each file is independent:

- 2l-explorer.md - Self-contained MCP section removal
- 2l-validator.md - Self-contained honesty enhancement + MCP cleanup
- 2l-builder.md - Self-contained MCP cleanup
- 2l-healer.md - Self-contained MCP cleanup
- 2l-ivalidator.md - Self-contained honesty enhancement

**Integration validation:**
- MCP sections must be identical across all 4 files
- Both validator agents must use same status vocabulary
- Report templates must follow same confidence framework

**No shared code or cross-references.** Each agent operates independently with its own prompt.

## Deployment Plan

**Target environment:** `~/.claude/` directory on local machine

**Deployment steps:**

1. **Pre-deployment backup:**
   ```bash
   cp -r ~/.claude/agents ~/.claude/agents.backup-$(date +%Y%m%d)
   ```

2. **Deploy modified files:**
   ```bash
   cp /path/to/iteration-2/build/2l-explorer.md ~/.claude/agents/
   cp /path/to/iteration-2/build/2l-validator.md ~/.claude/agents/
   cp /path/to/iteration-2/build/2l-builder.md ~/.claude/agents/
   cp /path/to/iteration-2/build/2l-healer.md ~/.claude/agents/
   cp /path/to/iteration-2/build/2l-ivalidator.md ~/.claude/agents/
   ```

3. **Verify deployment:**
   ```bash
   # Confirm no broken MCP references
   grep -r "GitHub MCP\|Screenshot MCP" ~/.claude/agents/
   # (Should return nothing)

   # Confirm new statuses present in validators
   grep "UNCERTAIN" ~/.claude/agents/2l-validator.md
   grep "Honesty Over Optimism" ~/.claude/agents/2l-validator.md
   ```

4. **Test validation:**
   - Run /2l-mvp on test project
   - Observe validator behavior with new prompts
   - Verify validation report includes confidence levels

5. **Rollback plan (if needed):**
   ```bash
   cp -r ~/.claude/agents.backup-YYYYMMDD/* ~/.claude/agents/
   ```

**Success indicators:**
- No MCP-related errors during validation
- Validation reports include confidence assessments
- Validators use appropriate status for each scenario
- No breaking changes to orchestration

## Notes

- **Meta-programming:** Using 2L to improve 2L itself (agents modifying agent prompts)
- **Backward compatibility:** New statuses extend existing binary system, don't replace it
- **Cultural change:** This is primarily a guidance/permission structure change, not technical
- **Orchestration impact:** Documented but deferred to Iteration 3 for safety
- **Test-first approach:** Verification phase confirms all changes via automated grep + manual review
- **Single builder approach:** Complexity LOW-MEDIUM, no need for multiple builders
- **Template-based modification:** Additive changes preserve all existing validation logic

---

**Iteration 2 Ready for Building Phase** 🚀
