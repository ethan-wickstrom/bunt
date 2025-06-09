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
- **Iterative & Test-Driven:** The development process is iterative. After each code change, run the test suite (`bun test`) to validate the changes and identify regressions. Use failing tests to guide the next implementation step.
- **Problem Solving:** When encountering persistent issues (like the parser implementation), step back and devise a new, more robust strategy rather than attempting repeated small fixes.

## Project Architecture
- **`parser.ts`:** Responsible for converting the template source code into an Abstract Syntax Tree (AST). This involves a tokenizer to create a token stream and a parser to build the tree.
- **`compiler.ts`:** Compiles the AST into an executable TypeScript function string.
- **`runtime.ts`:** Provides a dynamic `render` function that uses the compiler and `Bun.Transpiler` to execute templates at runtime.
- **`types.ts`:** Contains all shared type definitions for the AST nodes, tokens, and public API.
- **`helpers.ts`:** A standard library of helper functions available in all templates.
- **`bunt.test.ts`:** The main test file for the entire engine. All tests must pass before a feature is considered complete.
