# Architecture

**Analysis Date:** 2026-02-19

## Pattern Overview

**Overall:** Multi-Agent Orchestration Framework

GSD (Get Shit Done) is a CLI command framework designed to manage AI-driven project workflows. It implements an orchestrator-subagent architecture where a central command dispatcher spawns specialized agents to handle distinct phases of project execution (planning, researching, executing, verifying).

**Key Characteristics:**
- Command-driven entry points (32+ commands in `.claude/commands/gsd/`)
- Parallel agent execution with context isolation (up to 3 concurrent agents)
- Workflow-based orchestration with gates and checkpoints
- Document-centric state management (ROADMAP.md, STATE.md, PLAN.md files)
- Centralized utility layer (`gsd-tools.cjs`) for cross-cutting concerns
- Phase-based progression with decimal numbering (1.1, 1.2, 2.1, etc.)

## Layers

**Command Layer:**
- Purpose: Parse user intent, load context, validate arguments, route to orchestrator
- Location: `./.claude/commands/gsd/` (32 command definition files)
- Contains: YAML frontmatter (name, description, argument-hint, allowed-tools), orchestrator directives
- Depends on: `./.claude/get-shit-done/bin/gsd-tools.cjs` for initialization and state operations
- Used by: Claude Code CLI execution layer

**Orchestrator Layer:**
- Purpose: Execute workflow processes with gates and verification loops
- Location: `./.claude/get-shit-done/workflows/` (34 workflow definitions)
- Contains: Multi-step processes with conditional branching, parallel task spawning, state mutations
- Key files:
  - `map-codebase.md` - Spawns 4 parallel mapper agents
  - `plan-phase.md` - Research → Plan → Verify loop
  - `execute-phase.md` - Wave-based parallel plan execution
  - `complete-milestone.md` - Milestone archival and transitions
- Depends on: gsd-tools.cjs for phase operations, git for commits
- Used by: Commands (via execution_context references)

**Subagent Layer:**
- Purpose: Specialized work on isolated domains
- Location: `./.claude/agents/` (11 agent definitions)
- Key agents:
  - `gsd-codebase-mapper` - Analyzes codebase, writes STACK/ARCHITECTURE/CONVENTIONS docs
  - `gsd-planner` - Creates detailed PLAN.md from phase requirements
  - `gsd-executor` - Writes code to implement a single plan
  - `gsd-phase-researcher` - Researches domain for a phase
  - `gsd-verifier` - Validates completed work against requirements
  - `gsd-debugger` - Diagnoses and fixes execution failures
- Depends on: Project state (STATE.md, ROADMAP.md, CONTEXT.md)
- Used by: Orchestrator workflows via Task tool with `subagent_type` parameter

**Utility Layer:**
- Purpose: Centralized operations for config, phase management, git, state updates
- Location: `./.claude/get-shit-done/bin/gsd-tools.cjs` (189KB, 5000+ lines)
- Key operations:
  - `state load/update/patch` - STATE.md CRUD
  - `resolve-model <agent-type>` - Model selection based on profile
  - `find-phase <N>` - Locate phase directory
  - `phase add/insert/remove/complete` - Phase lifecycle
  - `commit <message>` - Git commits with optional file list
  - `validate consistency/health` - Health checks
  - `progress [json|table|bar]` - Progress rendering
- Depends on: fs, path, execSync for file ops and git
- Used by: Orchestrators and commands

**Reference Layer:**
- Purpose: Share patterns, formats, and guidelines across agents
- Location: `./.claude/get-shit-done/references/` (14 files)
- Key references:
  - `checkpoints.md` - Resume/checkpoint format specification
  - `continuation-format.md` - Cross-session continuation protocol
  - `model-profile-resolution.md` - How models are chosen
  - `planning-config.md` - Configuration schema
  - `tdd.md` - Test-Driven Development guidelines
  - `verification-patterns.md` - How to verify work
  - `ui-brand.md` - UI/messaging style guide
- Depends on: None (reference only)
- Used by: Agents, orchestrators for pattern consistency

**Template Layer:**
- Purpose: Pre-structured formats for planning artifacts
- Location: `./.claude/get-shit-done/templates/` (codebase/ and research-project/ subdirs)
- Key templates:
  - `codebase/*.md` - STACK.md, ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, INTEGRATIONS.md, CONCERNS.md
  - `phase-prompt.md` - Plan narrative structure
  - `milestone.md` - Milestone tracking format
  - `requirements.md` - Requirement tracking
  - `research.md` - Research documentation
- Depends on: None (template only)
- Used by: Agents when creating planning documents

## Data Flow

**Typical Command Execution:**

1. **User invokes command** → `/gsd:execute-phase 1.1`
2. **Command dispatcher** → Reads `.claude/commands/gsd/execute-phase.md`
3. **Init context** → gsd-tools.cjs loads STATE.md, ROADMAP.md, determines phase dir
4. **Spawn orchestrator** → Executes workflow from `.claude/get-shit-done/workflows/execute-phase.md`
5. **Orchestrator spawns agents** → Task tool with `subagent_type="gsd-executor"` (parallel, up to 3)
6. **Agents execute work** → Read PLAN.md, write code/docs, create SUMMARY.md
7. **Orchestrator collects results** → Reads SUMMARY.md files, updates STATE.md, commits changes
8. **Output to user** → Status, metrics, next steps

**State Progression During Phase Execution:**

```
Initial state: STATE.md.current_plan = 1.1.1
↓
Agent 1 executes plan 1.1.1 → writes SUMMARY.md
↓
Orchestrator validates against PLAN.md
↓
gsd-tools updates STATE: current_plan = 1.1.2, completed_plans += 1
↓
Next wave spawns or phase completes
```

**Phase Lifecycle:**

```
1. Phase added to ROADMAP.md
2. Phase directory created at .planning/phases/1.1/
3. CONTEXT.md written (phase requirements)
4. /gsd:plan-phase 1.1 creates PLAN.md with 1+ plans
5. /gsd:execute-phase 1.1 runs plans in waves
6. /gsd:verify-work 1.1 checks quality
7. /gsd:complete-milestone marks phase done (optional archival)
```

## Key Abstractions

**Phase:**
- Purpose: Logical work unit representing a cohesive set of related plans
- Examples: `1.1` (discovery), `1.2` (research), `2.1` (implement backend)
- Pattern: Decimal numbering (X.Y), directory at `.planning/phases/X.Y/`
- Contains: CONTEXT.md, PLAN.md (1+ plans), SUMMARY.md (per plan)

**Plan:**
- Purpose: Executable work unit assigned to a single agent in one wave
- Examples: "Implement user authentication API", "Set up database schema"
- Pattern: PLAN.md files at `.planning/phases/X.Y/plan-M.md`
- Contains: Frontmatter (title, description, type, required_time), tasks, must_haves

**Subagent:**
- Purpose: Specialized Claude instance with fresh context, domain-focused role
- Variants: gsd-executor, gsd-planner, gsd-verifier, gsd-debugger, gsd-*-researcher
- Pattern: Spawned via Task tool with `subagent_type` + `model` parameters
- Lifecycle: Fresh context → execute work → write artifacts → return confirmation

**Wave:**
- Purpose: Group of plans executed in parallel (dependency-safe)
- Pattern: Plans in same wave have no interdependencies
- Execution: gsd-executor spawns agents for all wave-N plans simultaneously
- Dependency: Plans marked with `depends_on: [X.Y.Z]` move to later waves

**Checkpoint:**
- Purpose: Resume point for interrupted sessions
- Format: `continue-here.md` with last completed plan, uncommitted changes
- Pattern: Saved on session pause, restored on `/gsd:resume-work`
- Used by: gsd-executor for crash recovery within phases

**Milestone:**
- Purpose: Group multiple phases into versioned release (v1.0, v1.1, etc.)
- Pattern: Directory at `.planning/milestones/vX.Y/` with archived phases
- Lifecycle: Active phases → archived at milestone completion
- Contains: MILESTONES.md tracking all completed milestones

## Entry Points

**Command Files:**
- Location: `./.claude/commands/gsd/*.md`
- Triggers: User executes `/gsd:<command-name> [args]`
- Responsibilities:
  - Parse arguments from `$ARGUMENTS`
  - Load `.planning/STATE.md` if exists
  - Define execution_context (which workflow to run)
  - Set allowed-tools and agent assignments

**Workflow Files:**
- Location: `./.claude/get-shit-done/workflows/*.md`
- Triggers: Command's execution_context references workflow
- Responsibilities:
  - Multi-step orchestration with named steps
  - Conditional branching (user gates, error handling)
  - Spawning subagents with Task tool
  - Collecting and validating results
  - State mutations via gsd-tools
  - Git commits of planning docs

**Subagent Prompts:**
- Embedded in workflows via Task tool `prompt` parameter
- Triggers: When orchestrator calls Task with `subagent_type`
- Responsibilities:
  - Focused execution on single domain
  - Write output files (PLAN.md, SUMMARY.md, code)
  - Return confirmation only (not full context)

## Error Handling

**Strategy:** Progressive validation with recovery paths

**Patterns:**

1. **Plan Validation (gsd-plan-checker)**
   - Verifies PLAN.md structure before execution
   - Checks: Task format, time estimates, dependencies, frontmatter
   - On failure: gsd-planner re-attempts with feedback loop
   - Retry: Up to 3 iterations before escalation

2. **Execution Validation (gsd-verifier)**
   - Checks completed work against PLAN.md requirements
   - Verifies: must_haves.artifacts exist, tests pass, code quality
   - On failure: Generates gap closure plans for /gsd:verify-work
   - Feedback: VERIFICATION.md with detailed gaps

3. **Crash Recovery (gsd-debugger)**
   - Called when /gsd:execute-phase fails mid-wave
   - Reads continue-here.md to resume from last checkpoint
   - Diagnoses: What failed and why
   - Output: Fix plan (PLAN.md format) for re-execution

4. **Health Checks (gsd-tools validate)**
   - Consistency: Phase numbers sequential, disk matches ROADMAP.md
   - Health: .planning/ structure intact, required files present
   - Repair: Can auto-fix missing directories, renumber phases

## Cross-Cutting Concerns

**Logging:**
- Pattern: Orchestrators log progress via status messages to user
- gsd-tools can output JSON (`--raw` flag) for machine parsing
- Per-agent: Agents return confirmation format with line counts

**Configuration:**
- Source: `.planning/config.json` (created by /gsd:new-project)
- Schema: model_profile, parallelization settings, gates, safety flags
- Runtime: gsd-tools loads and applies profile-based model selection

**Model Resolution:**
- Strategy: Profile-based selection (quality/balanced/budget)
- Table: `MODEL_PROFILES` in gsd-tools.cjs maps agent → {quality:opus, balanced:sonnet, budget:haiku}
- Default: "balanced" profile (Sonnet for most agents, Haiku for mappers)

**Git Integration:**
- Pattern: `gsd-tools.cjs commit` wraps `git add + git commit`
- Commits: Planning docs (.md files) staged, worktree code separate
- Strategy: Planning committed after each phase, code in separate flow
- Branching: Optional (configured via `branching_strategy` in config)

**Session Continuity:**
- Pattern: `continue-here.md` checkpoint saved on pause
- Resume: `/gsd:resume-work` restores STATE.md, plans, checkpoint context
- Cross-session: Agents can read previous sessions via continuation-format.md

---

*Architecture analysis: 2026-02-19*
