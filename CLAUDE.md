# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start Vite dev server
npm run build     # Type-check (tsc) then bundle for production
npm run lint      # Run ESLint
npm run preview   # Preview production build locally
```

Use `npm i` (not `npm install`) when installing packages.

There are no tests in this project.

## Architecture

SaitamaRide is a single-page React + TypeScript flashcard app for Japanese motorcycle license (普通自動二輪) exam prep. It has 500 practice questions across 5 tests.

**Data**: Static image files at `public/data/{test}/{question}/{q.png,a.png}` — 5 tests × 100 questions each. No backend.

**App structure**: Almost all logic lives in [src/App.tsx](src/App.tsx) (single component, ~225 lines). Two screens:
- **Home**: Mode selection (`all-random`, `test-sorted`, `test-random`)
- **Study**: Flashcard display — click to flip between question/answer images, navigate with prev/next buttons, progress bar

**State**: Client-side only with React hooks. Shuffling uses Fisher-Yates. No routing library — screen switching is a `useState` flag.

**Styling**: Tailwind CSS v4 (via `@tailwindcss/vite` plugin), dark theme.
