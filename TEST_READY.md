# E2E Test Suite Readiness

The End-to-End (E2E) test suite is ready for execution to validate the website improvements and portfolio features.

## Test Command
Run the test suite using:
```bash
npm.cmd test
```

## 4-Tier Coverage Inventory

### Tier 1: Static Layout & Semantic HTML Validation
- **HTML Integrity**: Validates `index.html` tag syntax, ensures no mismatched/unclosed tags, and checks for unique IDs.
- **Semantic Structure**: Verifies presence of main semantic elements (`header`, `main`, `footer`) and checks that anchors target existing elements.
- **Service Listings**: Checks that all 5 key services (renovations, fencing, building, flooring, installer) are present in the text content.

### Tier 2: API & Integration Checks
- **Contact Form Submission**: Asserts that `POST /api/contact` behaves correctly under normal request payloads.
- **Edge Cases and Payloads**: Validates API response and server robustness when receiving empty strings, spaces, missing fields, invalid emails, SQL injection payloads, XSS payloads, and incorrect field types.

### Tier 3: Dynamic Portfolio Interactions
- **Asset Verification**: Checks that image files from the source `img/` directory copy successfully to `public/img/` and that the page loads them without broken links.
- **Initial View Pagination**: Confirms the initial portfolio grid displays exactly 8 items under "All Projects".
- **Category Filtering**: Validates clicking a category filter button (e.g., 'fencing') updates the visible elements in the grid to display only matching items.
- **Dynamic Paging**: Verifies clicking "Load More" appends 8 more items to the grid dynamically.

### Tier 4: UX & Keyboard Accessibility
- **Lightbox Opening**: Asserts clicking a portfolio card opens the Lightbox modal with the correct image src, title, and description.
- **Keyboard Close Accessibility**: Verifies pressing the Escape key closes the Lightbox modal.
- **Modal Navigation**: Confirms clicking the Next/Prev buttons in the Lightbox updates the displayed image and metadata correctly.
