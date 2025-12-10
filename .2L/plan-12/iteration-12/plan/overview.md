# 2L Iteration Plan - Production Hardening

## Project Vision

Transform 2L from an MVP-building framework into a production-ready application generator. By introducing a new `/2l-prod` command and updating core agents, 2L will output applications with comprehensive test coverage, CI/CD pipelines, and security validation by default.

## Success Criteria

Specific, measurable criteria for MVP completion:

- [ ] `/2l-prod` command exists and enforces production quality gates
- [ ] `/2l-mvp` remains fast for rapid prototyping (no mandatory tests/CI)
- [ ] Builder agents generate tests alongside features in production mode
- [ ] Builder agents generate `.github/workflows/ci.yml` when missing (production mode)
- [ ] Validator enforces 70% coverage threshold in production mode
- [ ] Validator performs security checklist (hardcoded secrets, XSS patterns, SQL injection)
- [ ] Validator verifies CI/CD workflow exists with required stages
- [ ] Planner includes Testing, Security, Error Handling, and CI/CD patterns in patterns.md
- [ ] Healer can fix test failures and security issues as healing categories

## MVP Scope

**In Scope:**
- New `/2l-prod` command with production quality gates
- Minor updates to `/2l-mvp` to maintain explicit mode separation
- Builder agent updates for test generation and CI/CD
- Validator agent updates for coverage and security enforcement
- Planner agent updates for production pattern sections
- Healer agent updates for test and security healing categories

**Out of Scope (Post-MVP):**
- Monitoring/observability templates (Sentry, structured logging)
- Specialized security-validator agent (separate from main validator)
- Performance testing and load testing templates
- E2E test generation (complex, future enhancement)
- Deployment automation beyond CI (Vercel/platform-specific deployment)

## Development Phases

1. **Exploration** - Complete
2. **Planning** - Current
3. **Building** - ~2 hours (4 parallel builders)
4. **Integration** - ~15 minutes
5. **Validation** - ~15 minutes
6. **Deployment** - Final (git commit)

## Timeline Estimate

- Exploration: Complete
- Planning: Complete
- Building: 2 hours (parallel builders)
- Integration: 15 minutes
- Validation: 15 minutes
- Total: ~2.5 hours

## Risk Assessment

### High Risks

- **Pattern Consistency:** New production patterns must integrate seamlessly with existing patterns
  - *Mitigation:* Use proven patterns from wealth/mirror-of-dreams as templates

- **Mode Propagation:** Production vs MVP mode must flow correctly through all agents
  - *Mitigation:* Clear mode context in all spawn_task prompts

### Medium Risks

- **Coverage Threshold Too Strict:** 70% might block legitimate MVPs
  - *Mitigation:* Document as production-mode only; MVP mode bypasses this

- **CI/CD Template Mismatch:** Generated workflow might not match all project types
  - *Mitigation:* Use flexible template from mirror-of-dreams that works for Next.js projects

### Low Risks

- **Security False Positives:** Static analysis might flag safe code
  - *Mitigation:* Focus on high-confidence patterns (hardcoded secrets, dangerous innerHTML)

## Integration Strategy

All builders modify different markdown files:
- Builder-1: `commands/2l-prod.md` (NEW), `commands/2l-mvp.md` (minor)
- Builder-2: `agents/2l-builder.md`
- Builder-3: `agents/2l-validator.md`
- Builder-4: `agents/2l-planner.md`, `agents/2l-healer.md`

**No file conflicts expected.** Integration will:
1. Verify all files exist and are syntactically valid
2. Run consistency check across agent references
3. Verify cross-references between agents align

## Deployment Plan

1. All builder outputs committed to main branch
2. New `/2l-prod` command available immediately
3. Existing `/2l-mvp` continues working (MVP mode)
4. Test on a new project to verify production flow
