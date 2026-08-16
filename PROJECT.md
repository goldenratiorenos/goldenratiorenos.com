# Project: Ali Madani Contractor Website

## Architecture
- Technology Stack: HTML5, CSS3, JavaScript (ES6+), Node.js (Express server for hosting and test runner)
- Code Structure:
  - `public/index.html` (Main layout)
  - `public/css/style.css` (Premium style sheet)
  - `public/js/main.js` (Form validation & interactive logic)
  - `server.js` (Simple Express server)
  - `package.json` (Dependency definition and run scripts)
- Test Structure:
  - `tests/` (E2E test cases)
  - `TEST_INFRA.md` (Test documentation)
  - `TEST_READY.md` (Testing status signal)

## Milestones
| # | Name | Scope | Dependencies | Status | Conv ID |
|---|------|-------|-------------|--------|---------|
| M1 | Project Setup & Exploration | Check environment, initialize project structure, create server | None | DONE | 0196d1a0-f151-4885-8f1c-e09d401d9367 |
| M2 | Semantic HTML & Content | Build basic structure with 5 services and contact form | M1 | DONE | 0196d1a0-f151-4885-8f1c-e09d401d9367 |
| M3 | Image Integration & Portfolio CSS | Copy real images, map to services, build responsive CSS for portfolio grid and lightbox modal | M2 | DONE | 1fdff796-b456-41b6-a829-8844d4d061cd |
| M4 | JS Interactions & Lightbox | Implement portfolio filters, Load More paging, and lightbox modal (ESC close, nav buttons) | M3 | DONE | 1fdff796-b456-41b6-a829-8844d4d061cd |
| M5 | Final E2E Pass & Hardening | Run all E2E tests, run forensic audit checks, pass 100% | M4, TEST_READY | DONE | cd0fdc7d-1491-4e85-9046-789318c9c29a |

## E2E Testing Milestones
| # | Name | Scope | Dependencies | Status | Conv ID |
|---|------|-------|-------------|--------|---------|
| T1 | Test Infra Setup | Design test runner, feature inventory | None | DONE | e63e8d16-4fe0-4f89-a217-bfe4d54922ae |
| T2 | Improvement E2E Tests | Implement E2E tests for image loading, filtering, Load More, and lightbox keyboard interactions | T1 | DONE | 04a22013-30ed-4135-b21d-443a55eed189 |
| T3 | Combinatorial & Workload | Implement cross-feature interaction E2E tests | T2 | DONE | 04a22013-30ed-4135-b21d-443a55eed189 |
| T4 | Publish & Support | Publish TEST_READY.md and support implementation validation | T3 | DONE | 04a22013-30ed-4135-b21d-443a55eed189 |

## Interface Contracts
### Client ↔ Server
- Contact Form Submit: `POST /api/contact`
  - Payload: `{ name: string, email: string, phone: string, projectDetails: string }`
  - Response: `{ success: true, message: "Thank you, your request has been received!" }`
- Static hosting: `GET /` -> serves `public/index.html`
- Static assets: `GET /css/*`, `GET /js/*`

## Code Layout
- `C:\Ali Baba\ali_madani_contractor\`
  - `public/`
    - `index.html`
    - `css/style.css`
    - `js/main.js`
  - `tests/`
    - `e2e_spec.js` (or similar)
  - `server.js`
  - `package.json`
