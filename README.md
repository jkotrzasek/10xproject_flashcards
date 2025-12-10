# 10xproject_flashcards

A web application designed to streamline the process of creating educational flashcards using artificial intelligence. This app automatically generates flashcard sets from user-provided text, significantly reducing the time and effort required to create study materials.

## Table of Contents

- [Project Description](#project-description)
- [Tech Stack](#tech-stack)
- [Getting Started Locally](#getting-started-locally)
- [Available Scripts](#available-scripts)
- [Testing](#testing)
- [Project Scope](#project-scope)
- [Project Status](#project-status)
- [License](#license)

## Project Description

10xproject_flashcards addresses the common problem of manual flashcard creation being too time-consuming. Many students and self-learners are discouraged from using the effective spaced repetition learning method because of the tedious process of creating high-quality flashcards from extensive materials like lecture notes or articles.

This application solves that problem by allowing users to simply paste their text and have a set of flashcards generated automatically by AI, ready for studying.

## Tech Stack

The project is built with:

- **Framework**: [Astro 5](https://astro.build/)
- **UI Library**: [React 19](https://react.dev/)
- **Language**: [TypeScript 5](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **UI Components**: [Shadcn/ui](https://ui.shadcn.com/)
- **Unit Testing**: [Vitest](https://vitest.dev/) + [React Testing Library](https://testing-library.com/react)
- **E2E Testing**: [Playwright](https://playwright.dev/)

## Getting Started Locally

To run the project on your local machine, please follow these steps.

### Prerequisites

- **Node.js**: Version **`22.14.0`**. We recommend using [nvm](https://github.com/nvm-sh/nvm) (Node Version Manager) to manage Node.js versions.
- **Package Manager**: `npm`, `yarn`, or `pnpm`. The following instructions will use `npm`.

### Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/jkotrzasek/10xproject_flashcards.git
    cd 10xproject_flashcards
    ```

2.  **Set the Node.js version:**
    If you are using `nvm`, run this command in the project root to use the correct Node.js version:

    ```bash
    nvm use
    ```

3.  **Install dependencies:**

    ```bash
    npm install
    ```

4.  **Set up environment variables:**
    Create a `.env` file in the root of the project by copying the example file:

    ```bash
    cp .env.example .env
    ```

    Now, fill in the necessary environment variables in the `.env` file (e.g., database connection strings, API keys).

5.  **Run the development server:**
    ```bash
    npm run dev
    ```

The application should now be running on [http://localhost:4321](http://localhost:4321).

## Available Scripts

The following scripts are available in the `package.json`:

### Development

- `npm run dev`: Runs the application in development mode with hot-reloading.
- `npm run build`: Builds the application for production.
- `npm run preview`: Starts a local server to preview the production build.

### Code Quality

- `npm run lint`: Lints the code using ESLint to check for code quality and style issues.
- `npm run lint:fix`: Automatically fixes linting issues where possible.
- `npm run format`: Formats all files using Prettier to ensure consistent code style.

### Testing

- `npm test`: Runs unit tests with Vitest.
- `npm run test:watch`: Runs unit tests in watch mode during development.
- `npm run test:ui`: Opens Vitest UI for visual test navigation and debugging.
- `npm run test:coverage`: Runs unit tests with code coverage report.
- `npm run test:e2e`: Runs end-to-end tests with Playwright (headless).
- `npm run test:e2e:ui`: Runs E2E tests in Playwright's interactive UI mode.
- `npm run test:e2e:headed`: Runs E2E tests with visible browser.
- `npm run test:e2e:debug`: Runs E2E tests in debug mode with step-by-step execution.
- `npm run test:all`: Runs all tests (unit with coverage + E2E).

## Testing

The project uses a comprehensive testing setup following best practices:

### Unit & Integration Tests (Vitest)

- **Framework**: Vitest with jsdom environment for DOM/React testing
- **Testing Library**: React Testing Library for component tests
- **API Mocking**: MSW (Mock Service Worker) for network request mocking
- **Coverage**: Configured with thresholds (80% lines, functions, statements)

Unit tests are located in the `tests/` directory. Run them with `npm test` or use `npm run test:ui` for visual debugging.

### E2E Tests (Playwright)

- **Browser**: Chromium (Desktop Chrome configuration)
- **Accessibility**: Automated WCAG checks with @axe-core/playwright
- **Pattern**: Page Object Model for maintainable test structure
- **Parallelization**: Enabled for faster test execution

E2E tests are located in the `e2e/` directory. The dev server starts automatically when running E2E tests.

For detailed testing documentation and examples, see `tests/README.md`.

## Project Scope

### Included in MVP

The current scope of the project (MVP) includes the following features:

- **User Authentication**: Secure user registration and login via email and password.
- **Deck Management**: Full CRUD (Create, Read, Update, Delete) functionality for flashcard decks.
- **AI Flashcard Generation**: Generate flashcards automatically from pasted text (1,000-10,000 characters). Users can review, approve, or discard generated cards. A daily limit of 10 generations per user is in place.
- **Manual Flashcard Management**: Full CRUD functionality for individual flashcards within a deck.
- **Learning System**: A simple spaced repetition system where users can self-assess their knowledge ("I knew it" / "I didn't know").
- **Basic Statistics**: View the total number of flashcards in each deck and the number of cards reviewed daily.

## Project Status

**Status**: In active development.

The project is currently focused on delivering the core features defined in the MVP scope.

## License

This project is licensed under the MIT License.
