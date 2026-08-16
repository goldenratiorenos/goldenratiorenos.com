# Test Infrastructure Documentation

This document outlines the End-to-End (E2E) testing infrastructure for the Ali Madani Contractor website.

## Test Runner
The project uses the built-in **Node.js Test Runner** (`node:test` framework) introduced in Node.js 18+. This removes the need for external test runners like Jest or Mocha, keeping the setup lightweight, fast, and dependency-free at the runner level.

## Directory Layout
The testing files are structured as follows:

```
ali_madani_contractor/
├── tests/
│   ├── test_helper.js         # Starts/stops the server on ephemeral ports and handles child process lifecycles
│   └── verify_infra.test.js   # E2E integration verification using supertest and puppeteer-core
├── TEST_INFRA.md              # Infrastructure and inventory documentation
└── package.json               # Defines "npm test" run script and E2E devDependencies
```

## Feature Inventory
The E2E test suite covers the following application components:

1. **Static Content Hosting**
   - Main page load (returns HTTP 200).
   - Validation of key DOM elements (header, services, contact form layout).
   - Verified via: Chrome automation (`puppeteer-core`).

2. **API Integrations**
   - Contact Form endpoint: `POST /api/contact`.
   - Positive Flow: Correct payload returns `success: true` and the appropriate thank you message.
   - Negative Flow: Missing fields or invalid email returns HTTP 400 with validation errors.
   - Verified via: `supertest`.

3. **Client-Side Form Validation & UX Flow**
   - Attempting to submit empty fields triggers HTML5 validation or JavaScript error states.
   - Submitting valid details displays a success notification/message on the interface.
   - Verified via: Puppeteer page manipulation and form submission.

4. **Infrastructure Resilience**
   - Ephemeral port assignment to prevent port collision during concurrent test runs.
   - Safe process teardown (browser closure and Express server SIGTERM signals).
