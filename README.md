# Overview

Sprtnik is a purely static, client-side SPA for learning with flashcards.

## Features

Sprtnik provides two main views:

- `/`  
  The home page for CRUD cards; filtering by tags; and importing/exporting collections.
- `/learn`  
  The interactive study page that presents filtered flashcards for review.

## Technologies Used

- **TypeScript** for static type safety
- **Vite** for fast bundling
- **npm** for package management
- **@editorjs** for rich card editing (including image embedding)
- **JSZip** for ZIP-based import/export of card collections

## Architecture

- **Routing**  
  Uses a client-side router based on the URL hash to navigate between views without full-page reloads.

- **Storage**

  - **IndexedDB** stores cards and related assets (including embedded images).
  - **Import/Export** uses ZIP files to read/write collections on the local file system, avoiding browser storage limits.
  - **localStorage** tracks learning progress (cards reviewed vs. remaining).

- **Component Tree**  
  Every UI element inherits from an abstract `Component` class, which can render itself to the DOM and clear resources when needed.  
  Pages (the home and learn views) are also components but act as orchestrators — they manage app context (e.g., fetching data from IndexedDB) and compose child components.

## Getting Started

Ensure you have `node` and `npm` installed, then run:

```bash
npm install     # Install dependencies
npm run dev     # Launch development server
npm run build   # Build production bundle
npm run preview # Serve the production build locally
```

## Deployment

Sprtnik is currently deployed via GitHub Pages:

https://kulikvl.github.io/sprtnik

## Screenshots

<img width="553" alt="Screenshot 2025-05-11 at 12 34 07" src="https://github.com/user-attachments/assets/0ec288ec-8021-475d-8d49-c21560d33b22" />

<img width="551" alt="Screenshot 2025-05-11 at 12 34 34" src="https://github.com/user-attachments/assets/d934390e-7768-49a8-81ea-8fce42add0f4" />

