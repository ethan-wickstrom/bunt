# Bunt - A Modern Templating Engine for Bun

Bunt is a modern, type-safe, and performant templating engine designed specifically for the Bun runtime. It offers a familiar Handlebars-like syntax and is optimized for speed and ease of use within the Bun ecosystem.

## Features

- **Type-Safe:** Leverage TypeScript to catch errors at compile time.
- **Performant:** Built for Bun, ensuring maximum speed.
- **Familiar Syntax:** Easy to learn for anyone familiar with Handlebars or Mustache.
- **Bun Plugin:** Seamlessly import `.bnt` template files directly in your Bun projects.
- **Extensible:** Easily add custom helper functions.

## Installation

Install Bunt using your favorite package manager:

```bash
# With Bun
bun add bunt

# With npm
npm install bunt

# With yarn
yarn add bunt
```

## Basic Usage

### API

Create a template file (`template.bnt`):

```handlebars
<h1>Hello, {{name}}!</h1>
<p>This is a Bunt template.</p>
```

Then, use the Bunt API to render it:

```typescript
import { render } from 'bunt';
import template from './template.bnt'; // Requires the Bunt plugin

const context = { name: 'World' };
const output = render(template, context);

console.log(output);
```

### CLI

You can also use the Bunt CLI to compile your templates into TypeScript functions.

```bash
# Compile a single template
bunx bunt template.bnt

# This will generate a template.ts file
```

The generated TypeScript file will contain a compiled template function that you can import and use in your code.

## Bun Plugin

Bunt comes with a Bun plugin that allows you to import `.bnt` files directly into your TypeScript code. To use it, add the following to your `bunfig.toml`:

```toml
[build]
plugins = ["bunt"]
```

With this configuration, Bun's bundler will automatically transform `.bnt` files into renderable modules.

## Advanced Usage

### Helpers

You can extend Bunt with custom helper functions.

```typescript
import { render } from 'bunt';

const template = '{{uppercase "hello"}}';
const options = {
  helpers: {
    uppercase: (str: string) => str.toUpperCase(),
  },
};

const output = render(template, {}, options); // "HELLO"
```

### Control Structures

Bunt supports common control structures like `#if` and `#each`.

**`#if` block:**

```handlebars
{{#if user}}
  <p>Welcome, {{user.name}}!</p>
{{/if}}
```

**`#each` block:**

```handlebars
<ul>
  {{#each items}}
    <li>{{this}}</li>
  {{/each}}
</ul>
```

## Contributing

Contributions are welcome! To get started, please follow these steps:

1.  **Fork and Clone:** Fork the repository and clone it to your local machine.
2.  **Install Dependencies:** Run `bun install` to set up the project.
3.  **Make Changes:** Implement your feature or bug fix.
4.  **Run Tests:** Ensure all tests pass by running `bun test`.
5.  **Lint and Format:** Keep the code style consistent by running `bun run lint` and `bun run format`.
6.  **Submit a Pull Request:** Open a pull request with a clear description of your changes.

Please refer to the `bunt-development-guidelines.md` in the `.clinerules` directory for more details on the project's philosophy and architecture.

## License

Bunt is licensed under the [MIT License](LICENSE).
