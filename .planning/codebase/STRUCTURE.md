# Codebase Structure

**Analysis Date:** 2026-02-19

## Directory Layout

```
TbgRuss28/                          # Project root
├── .claude/                        # Claude Code framework (GSD system)
│   ├── agents/                     # Agent definitions (11 agents)
│   │   ├── gsd-codebase-mapper.md
│   │   ├── gsd-planner.md
│   │   ├── gsd-executor.md
│   │   ├── gsd-verifier.md
│   │   ├── gsd-debugger.md
│   │   ├── gsd-plan-checker.md
│   │   ├── gsd-integration-checker.md
│   │   ├── gsd-phase-researcher.md
│   │   ├── gsd-project-researcher.md
│   │   ├── gsd-research-synthesizer.md
│   │   └── gsd-roadmapper.md
│   ├── commands/                   # User commands (32 commands)
│   │   └── gsd/                    # GSD command definitions
│   │       ├── map-codebase.md
│   │       ├── plan-phase.md
│   │       ├── execute-phase.md
│   │       ├── new-project.md
│   │       ├── new-milestone.md
│   │       ├── verify-work.md
│   │       ├── debug.md
│   │       └── [27 more commands]
│   ├── get-shit-done/              # GSD framework core
│   │   ├── bin/                    # Utilities and tools
│   │   │   ├── gsd-tools.cjs       # Main utility library (5000+ lines)
│   │   │   └── gsd-tools.test.cjs  # Unit tests
│   │   ├── workflows/              # Orchestration processes (34 workflows)
│   │   │   ├── map-codebase.md     # Codebase analysis orchestration
│   │   │   ├── plan-phase.md       # Planning orchestration
│   │   │   ├── execute-phase.md    # Execution orchestration
│   │   │   ├── execute-plan.md     # Single plan execution
│   │   │   ├── discuss-phase.md
│   │   │   ├── new-milestone.md
│   │   │   └── [28 more workflows]
│   │   ├── references/             # Guidelines and patterns (14 files)
│   │   │   ├── checkpoints.md      # Resume/continuation format
│   │   │   ├── planning-config.md  # Configuration schema
│   │   │   ├── model-profiles.md   # Model selection rules
│   │   │   ├── tdd.md              # Testing guidelines
│   │   │   ├── verification-patterns.md
│   │   │   ├── ui-brand.md         # Output style guide
│   │   │   └── [8 more references]
│   │   └── templates/              # Document templates
│   │       ├── codebase/           # Codebase analysis templates (7 docs)
│   │       │   ├── architecture.md
│   │       │   ├── structure.md
│   │       │   ├── stack.md
│   │       │   ├── conventions.md
│   │       │   ├── testing.md
│   │       │   ├── integrations.md
│   │       │   └── concerns.md
│   │       ├── research-project/   # Research documentation templates (5 docs)
│   │       │   ├── ARCHITECTURE.md
│   │       │   ├── STACK.md
│   │       │   ├── FEATURES.md
│   │       │   ├── PITFALLS.md
│   │       │   └── SUMMARY.md
│   │       ├── phase-prompt.md     # Plan narrative template
│   │       ├── milestone.md        # Milestone tracking template
│   │       ├── requirements.md     # Requirement tracking
│   │       ├── research.md         # Research documentation
│   │       ├── roadmap.md          # Project roadmap
│   │       ├── state.md            # Project state
│   │       ├── summary-*.md        # Summary variants (3 files)
│   │       ├── project.md          # Project initialization
│   │       ├── context.md          # Phase context
│   │       └── [more templates]
│   ├── hooks/                      # Git hooks and commands
│   │   ├── gsd-check-update.js     # Check for GSD updates
│   │   └── gsd-statusline.js       # Status line rendering
│   ├── settings.json               # Global settings
│   ├── gsd-file-manifest.json      # Manifest of all GSD files (checksums)
│   └── package.json                # Contains {"type":"commonjs"}
├── .planning/                      # Project planning and state
│   └── codebase/                   # Codebase analysis documents (written by mappers)
│       ├── STACK.md                # Technology stack
│       ├── ARCHITECTURE.md         # System architecture
│       ├── STRUCTURE.md            # This file
│       ├── CONVENTIONS.md          # Code style and patterns
│       ├── TESTING.md              # Testing approach
│       ├── INTEGRATIONS.md         # External integrations
│       └── CONCERNS.md             # Technical debt and issues
├── .git/                           # Git repository
├── Buss2028_Fellesmote_App_PRD.md  # Product requirements (brownfield context)
└── README.md (if exists)
```

## Directory Purposes

**.claude/**
- Purpose: Claude Code configuration and GSD framework
- Contains: Agent definitions, command definitions, workflows, templates, utilities
- Key files: `agents/*.md`, `commands/gsd/*.md`, `get-shit-done/bin/gsd-tools.cjs`
- Committed: Yes (framework templates and definitions)

**.claude/agents/**
- Purpose: Agent role definitions used by Task tool (subagent_type parameter)
- Contains: YAML frontmatter + role + process + tools sections
- Key agents: gsd-executor, gsd-planner, gsd-verifier, gsd-debugger
- Naming: `gsd-<domain>.md` (e.g., gsd-codebase-mapper.md)
- Modified: Rarely (pre-built framework)

**.claude/commands/gsd/**
- Purpose: User command definitions (entry points for CLI)
- Contains: YAML frontmatter (name, description, argument-hint), execution_context reference
- Naming: `<verb>[-<noun>].md` (map-codebase, execute-phase, complete-milestone)
- Examples:
  - `map-codebase.md` - Analyze existing codebase
  - `plan-phase.md` - Create detailed phase plan
  - `execute-phase.md` - Execute all plans in a phase
  - `new-project.md` - Initialize new project
  - `verify-work.md` - Validate completed work
- Modified: Only to adjust command parameters or workflows

**.claude/get-shit-done/bin/**
- Purpose: Utility implementations
- Key file: `gsd-tools.cjs` (189KB, 5000+ lines)
  - Exports: 50+ commands (state management, phase operations, git, validation)
  - Model profiles for agent selection
  - Phase numbering logic
  - Progress rendering
  - Health checks and repairs
- Used by: Every command and workflow via `node gsd-tools.cjs <command>`

**.claude/get-shit-done/workflows/**
- Purpose: Orchestration logic for complex commands
- Pattern: Multi-step processes with conditional branching
- Examples:
  - `map-codebase.md` - Spawns 4 parallel mapper agents, verifies output
  - `plan-phase.md` - Research → Plan → Verify loop with iterations
  - `execute-phase.md` - Wave-based parallel plan execution with checkpoints
  - `new-project.md` - Discovery → Roadmapping → Initialization
- Naming: `<verb>[-<noun>].md` matching command names
- Modified: To adjust workflow steps or add verification gates

**.claude/get-shit-done/references/**
- Purpose: Shared patterns and guidelines across all agents
- Content: Format specifications, naming conventions, verification patterns, style guide
- Examples:
  - `checkpoints.md` - Resume point format for session continuity
  - `continuation-format.md` - Cross-session context transfer protocol
  - `tdd.md` - Test-driven development guidelines for agents
  - `verification-patterns.md` - How to verify work against requirements
  - `planning-config.md` - Configuration schema for `.planning/config.json`
- Modified: To update shared patterns

**.claude/get-shit-done/templates/**
- Purpose: Pre-structured document formats
- Subdirs:
  - `codebase/` - Codebase analysis templates (7 documents for /gsd:map-codebase)
  - `research-project/` - Research documentation templates
  - Individual templates: phase-prompt.md, requirements.md, milestone.md, roadmap.md, state.md
- Modified: To adjust template fields or sections

**.planning/**
- Purpose: Project-specific planning and state
- Created by: /gsd:new-project (greenfield) or manually (brownfield)
- Contains:
  - `STATE.md` - Current project state (phase, plan counters, milestones, metrics)
  - `ROADMAP.md` - Phase breakdown and summary
  - `REQUIREMENTS.md` - Tracked requirements (greenfield only)
  - `config.json` - Project-specific configuration
  - `phases/X.Y/` - Phase directories with PLAN.md, SUMMARY.md, CONTEXT.md
  - `milestones/vX.Y/` - Completed phase archives
  - `codebase/` - Analysis documents (STACK.md, ARCHITECTURE.md, etc.)
- Committed: Yes (planning is source of truth)

## Key File Locations

**Entry Points:**

- `./.claude/commands/gsd/*.md` - User command definitions, entry point for /gsd commands
- `./.claude/get-shit-done/workflows/*.md` - Orchestration logic, contains multi-step processes
- `./.claude/agents/gsd-*.md` - Subagent role definitions, spawned via Task tool

**Configuration:**

- `./.claude/settings.json` - Global hooks and status line configuration
- `./.planning/config.json` - Per-project configuration (model profile, gates, parallelization)
- `./.claude/get-shit-done/bin/gsd-tools.cjs` - Centralized utility configuration loading (loadConfig function)

**Utilities:**

- `./.claude/get-shit-done/bin/gsd-tools.cjs` - All cross-cutting operations (state, phases, git, validation)
- `./.claude/get-shit-done/bin/gsd-tools.test.cjs` - Unit tests for gsd-tools

**References & Guidelines:**

- `./.claude/get-shit-done/references/*.md` - Shared patterns (checkpoints, verification, TDD, config schema)
- `./.claude/get-shit-done/templates/*.md` - Document formats and structure

**Project State (created by new-project, updated by phases):**

- `./.planning/STATE.md` - Current phase, plan counters, metrics, decisions
- `./.planning/ROADMAP.md` - Phase descriptions and summary table
- `./.planning/phases/X.Y/CONTEXT.md` - Phase requirements and scope
- `./.planning/phases/X.Y/PLAN.md` - Executable tasks (created by /gsd:plan-phase)
- `./.planning/phases/X.Y/plan-N.md` - Individual plans (multiple per phase)
- `./.planning/phases/X.Y/SUMMARY.md` - Execution summary per plan

**Codebase Analysis (created by /gsd:map-codebase):**

- `./.planning/codebase/STACK.md` - Technologies, languages, frameworks
- `./.planning/codebase/ARCHITECTURE.md` - System design, patterns, layers
- `./.planning/codebase/STRUCTURE.md` - Directory layout (this file)
- `./.planning/codebase/CONVENTIONS.md` - Code style and naming
- `./.planning/codebase/TESTING.md` - Testing framework and patterns
- `./.planning/codebase/INTEGRATIONS.md` - External APIs and services
- `./.planning/codebase/CONCERNS.md` - Technical debt and risks

## Naming Conventions

**Files:**

- Commands: `<verb>[-<noun>].md` (map-codebase, execute-phase, complete-milestone)
- Agents: `gsd-<domain>.md` (gsd-executor, gsd-planner, gsd-debugger)
- Workflows: `<verb>[-<noun>].md` matching command name
- State files: UPPERCASE.md (STATE.md, ROADMAP.md, CONTEXT.md, PLAN.md, SUMMARY.md)
- Analysis files: UPPERCASE.md (STACK.md, ARCHITECTURE.md, STRUCTURE.md, etc.)
- Phase docs: Numeric suffix for multiple plans (plan-1.md, plan-2.md)

**Directories:**

- `.claude/` - Framework configuration (hidden)
- `.planning/` - Project planning (hidden)
- `phases/X.Y/` - Phase directories use decimal notation (1.1, 1.2, 2.1)
- `milestones/vX.Y/` - Milestone directories use semantic versioning

**Phase Numbering:**

- Format: `X.Y` (decimal notation)
- X = milestone/stage (1 = discovery, 2 = core features)
- Y = phase within milestone (1 = first phase, 2 = second phase)
- Examples: 1.1, 1.2, 2.1, 2.2, 3.1

## Where to Add New Code

**New GSD Command:**

When adding a new user command to the system:

1. Create file: `./.claude/commands/gsd/<verb>[-<noun>].md`
2. YAML frontmatter: name (gsd:<command>), description, argument-hint, allowed-tools
3. Add `<objective>` section describing purpose
4. Add `<execution_context>` referencing workflow: `@./.claude/get-shit-done/workflows/<name>.md`
5. Add `<process>` section outlining steps
6. Create matching workflow: `./.claude/get-shit-done/workflows/<verb>[-<noun>].md`

Example command structure:
```
---
name: gsd:custom-command
description: What this command does
argument-hint: "[args]"
allowed-tools:
  - Read
  - Bash
  - Write
---

<objective>
High-level purpose...
</objective>

<execution_context>
@./.claude/get-shit-done/workflows/custom-workflow.md
</execution_context>

<context>
...context variables...
</context>

<process>
...orchestrator steps...
</process>
```

**New Subagent:**

When creating a specialized agent:

1. Create file: `./.claude/agents/gsd-<domain>.md`
2. Add role definition with focused responsibilities
3. Define tools available to agent
4. Add process section with steps
5. Add to MODEL_PROFILES in gsd-tools.cjs to enable model selection

**New Workflow:**

When implementing orchestration logic:

1. Create file: `./.claude/get-shit-done/workflows/<name>.md`
2. Define `<purpose>` section
3. Add `<process>` with named steps
4. Use `<step name="X" priority="first/last">` for ordering
5. Each step: description, actions, conditional routing
6. Use gsd-tools commands for state mutations
7. Use Task tool for agent spawning with `run_in_background=true` for parallelization
8. Reference from command's execution_context

**New Utility Function:**

Add to `./.claude/get-shit-done/bin/gsd-tools.cjs`:

1. Add function in appropriate section (state operations, phase operations, etc.)
2. Export via `cmd === '<command-name>'` switch statement
3. Output JSON (unless --raw flag) for consistency
4. Document in file header comments

**Testing Utilities:**

Tests for gsd-tools go in `./.claude/get-shit-done/bin/gsd-tools.test.cjs`

## Special Directories

**.claude/ (Framework)**
- Purpose: GSD system definition and configuration
- Generated: No (all pre-built)
- Committed: Yes (framework is tracked)
- Modified: Only to adjust command/workflow definitions or add new commands

**.planning/ (Project State)**
- Purpose: Current project status and planning
- Generated: Yes (created by /gsd:new-project, updated by phase execution)
- Committed: Yes (planning is source of truth)
- Structure: Created as-needed by commands and workflows
- Key subdirs:
  - `phases/X.Y/` - One per phase
  - `milestones/vX.Y/` - One per completed milestone
  - `codebase/` - Codebase analysis documents

**.git/**
- Purpose: Version control
- Generated: Yes (git init)
- Committed: Yes (always)
- Special: GSD commits to this with gsd-tools.cjs

**gsd-file-manifest.json**
- Purpose: Integrity checking for GSD framework files
- Content: SHA256 hashes of all critical files
- Updated: During /gsd:update command
- Purpose: Detect modifications or corruption in framework files

---

*Structure analysis: 2026-02-19*
