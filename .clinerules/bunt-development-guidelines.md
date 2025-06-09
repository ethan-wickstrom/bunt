## Brief overview
These are project-specific guidelines for developing the "Bunt" templating engine. The goal is to create a modern, type-strict, and performant TypeScript templating engine optimized for the Bun runtime.

## Core Philosophy & Principles
- **First-Principles Reasoning:** All development decisions should be grounded in fundamental truths, avoiding reliance on convention or analogy. The process involves clarifying the problem, challenging assumptions, seeking evidence, and exploring alternatives.
- **Reduce Complexity First:** The primary goal is to simplify. The best code is often no code.
- **Code Quality:** Code must compile, run, and pass all tests. It should follow best practices for orthogonality, modularity, and have maximum cohesion with minimum coupling.
- **Immutability and Functional Style:** Prefer functional programming paradigms, using pure functions and immutable data structures. Think in transformations, not mutations.
- **Type-Driven Design:**
  - Use types to make illegal states unrepresentable.
  - Prefer many small, composable Algebraic Data Types (ADTs).
  - Use `type` declarations instead of `interface`.
  - Leverage exhaustiveness checking as a form of testing.
  - "Parse, don't validate": Convert uncertain data into certain types at the boundaries of the system.

## Technical Stack & Conventions
- **Language:** TypeScript
- **Runtime:** Bun (leverage Bun-specific APIs like `Bun.Transpiler` and `Bun.file` where appropriate).
- **Error Handling:** Use the `neverthrow` library for robust and explicit error handling.
- **Pattern Matching:** Use the `ts-pattern` library for exhaustive pattern matching.
- **Linting/Formatting:** The project uses Biome. Adhere to its rules to maintain code quality.

## Development Workflow
- **Plan, Then Act:** Begin with a clear, comprehensive, and well-reasoned plan before writing code. The user will approve the plan before switching to "Act Mode".
- **Type-First Implementation:** When adding or modifying features, consider the full impact on the type system first. If a change requires modifying a function signature, update the relevant types and function signatures across all affected files *before* implementing the new logic. This proactive approach minimizes cascading type errors.
- **Iterative & Test-Driven:** The development process is iterative. After each code change, run the test suite (`bun test`) to validate the changes and identify regressions. Use failing tests to guide the next implementation step.
- **Problem Solving:** When encountering persistent issues (like the parser implementation), step back and devise a new, more robust strategy rather than attempting repeated small fixes.

## Architectural Analysis
- **Start with Types:** Begin by analyzing `types.ts` to understand the core data structures and domain model of the system. The types are the foundation of the architecture.
- **Follow the Data Flow:** Trace the flow of data through the system. For Bunt, this means following the compilation pipeline: `Tokenizer` -> `Parser` -> `Compiler` -> `Runtime`.
- **Identify Core Components:** For each stage of the pipeline, identify the key classes and functions and understand their single responsibility.
- **Consult Tests:** Use the test files (e.g., `bunt.test.ts`, `tokenizer.test.ts`) to understand the expected inputs and outputs of each component.
