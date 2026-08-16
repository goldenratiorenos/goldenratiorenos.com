const test = require('node:test');
const assert = require('node:assert');
const supertest = require('supertest');
const { startServer, stopServer } = require('./test_helper');

test.describe('Empirical Challenger API Tests', () => {
  let port;
  let request;

  test.before(async () => {
    const proc = await startServer();
    port = proc.port;
    request = supertest(`http://localhost:${port}`);
  });

  test.after(async () => {
    await stopServer();
  });

  const cases = [
    {
      name: "Valid Payload",
      payload: {
        name: "John Doe",
        email: "john@example.com",
        phone: "123-456-7890",
        projectDetails: "Need a kitchen remodel"
      },
      expectedStatus: 200,
      expectedJson: { success: true, message: "Thank you, your request has been received!" }
    },
    {
      name: "Extremely Long String - 10,000 chars",
      payload: {
        name: "A".repeat(10000),
        email: "john@example.com",
        phone: "123-456-7890",
        projectDetails: "Need a kitchen remodel"
      },
      expectedStatus: 200,
      expectedJson: { success: true, message: "Thank you, your request has been received!" }
    },
    {
      name: "Extremely Long String - 500,000 chars (Payload limit)",
      payload: {
        name: "A".repeat(500000),
        email: "john@example.com",
        phone: "123-456-7890",
        projectDetails: "Need a kitchen remodel"
      },
      // Express default limit is 100kb, so a 500kb payload should result in 413 Payload Too Large
      expectedStatus: 413, 
      expectedJson: null
    },
    {
      name: "Empty Name String",
      payload: {
        name: "",
        email: "john@example.com",
        phone: "123-456-7890",
        projectDetails: "Need a kitchen remodel"
      },
      expectedStatus: 400
    },
    {
      name: "Name is whitespace",
      payload: {
        name: "   ",
        email: "john@example.com",
        phone: "123-456-7890",
        projectDetails: "Need a kitchen remodel"
      },
      expectedStatus: 400
    },
    {
      name: "Missing Name",
      payload: {
        email: "john@example.com",
        phone: "123-456-7890",
        projectDetails: "Need a kitchen remodel"
      },
      expectedStatus: 400
    },
    {
      name: "Invalid Email (no @)",
      payload: {
        name: "John Doe",
        email: "john.example.com",
        phone: "123-456-7890",
        projectDetails: "Need a kitchen remodel"
      },
      expectedStatus: 400
    },
    {
      name: "Invalid Email (no domain)",
      payload: {
        name: "John Doe",
        email: "john@",
        phone: "123-456-7890",
        projectDetails: "Need a kitchen remodel"
      },
      expectedStatus: 400
    },
    {
      name: "Invalid Email (no user)",
      payload: {
        name: "John Doe",
        email: "@example.com",
        phone: "123-456-7890",
        projectDetails: "Need a kitchen remodel"
      },
      expectedStatus: 400
    },
    {
      name: "Invalid Email (spaces)",
      payload: {
        name: "John Doe",
        email: "john @example.com",
        phone: "123-456-7890",
        projectDetails: "Need a kitchen remodel"
      },
      expectedStatus: 400
    },
    {
      name: "Empty Email",
      payload: {
        name: "John Doe",
        email: "",
        phone: "123-456-7890",
        projectDetails: "Need a kitchen remodel"
      },
      expectedStatus: 400
    },
    {
      name: "Empty Phone",
      payload: {
        name: "John Doe",
        email: "john@example.com",
        phone: "",
        projectDetails: "Need a kitchen remodel"
      },
      expectedStatus: 400
    },
    {
      name: "Empty Project Details",
      payload: {
        name: "John Doe",
        email: "john@example.com",
        phone: "123-456-7890",
        projectDetails: ""
      },
      expectedStatus: 400
    },
    {
      name: "Unicode and Special Characters",
      payload: {
        name: "𝔍𝔬𝔥𝔫 𝔇𝔬𝔢 🔥",
        email: "john@example.com",
        phone: "123-456-7890",
        projectDetails: "Renovations & Repairs (Cost: < $10k)"
      },
      expectedStatus: 200
    },
    {
      name: "SQL Injection payload in project details",
      payload: {
        name: "John Doe",
        email: "john@example.com",
        phone: "123-456-7890",
        projectDetails: "'; DROP TABLE contacts; --"
      },
      expectedStatus: 200
    },
    {
      name: "SQL Injection payload in name",
      payload: {
        name: "John' OR '1'='1",
        email: "john@example.com",
        phone: "123-456-7890",
        projectDetails: "Kitchen remodel"
      },
      expectedStatus: 200
    },
    {
      name: "Cross-Site Scripting (XSS) payload in name",
      payload: {
        name: "<script>alert('xss')</script>",
        email: "john@example.com",
        phone: "123-456-7890",
        projectDetails: "Kitchen remodel"
      },
      expectedStatus: 200
    },
    {
      name: "XSS payload in project details",
      payload: {
        name: "John Doe",
        email: "john@example.com",
        phone: "123-456-7890",
        projectDetails: "<img src=x onerror=alert(1)>"
      },
      expectedStatus: 200
    },
    {
      name: "Empty JSON Payload",
      payload: {},
      expectedStatus: 400
    },
    {
      name: "Extra Fields in Payload",
      payload: {
        name: "John Doe",
        email: "john@example.com",
        phone: "123-456-7890",
        projectDetails: "Kitchen remodel",
        admin: true,
        role: "root",
        unused_field: "value"
      },
      expectedStatus: 200
    },
    {
      name: "Wrong Field Types (name is integer)",
      payload: {
        name: 123,
        email: "john@example.com",
        phone: "123-456-7890",
        projectDetails: "Kitchen remodel"
      },
      expectedStatus: 400
    },
    {
      name: "Wrong Field Types (email is array)",
      payload: {
        name: "John Doe",
        email: ["john@example.com"],
        phone: "123-456-7890",
        projectDetails: "Kitchen remodel"
      },
      expectedStatus: 400
    },
    {
      name: "Wrong Field Types (phone is object)",
      payload: {
        name: "John Doe",
        email: "john@example.com",
        phone: { mobile: "123-456-7890" },
        projectDetails: "Kitchen remodel"
      },
      expectedStatus: 400
    }
  ];

  cases.forEach((tc) => {
    test(tc.name, async () => {
      const response = await request
        .post('/api/contact')
        .send(tc.payload);

      assert.strictEqual(response.status, tc.expectedStatus);
      if (tc.expectedJson) {
        assert.deepStrictEqual(response.body, tc.expectedJson);
      }
    });
  });

  test('Verify server is still alive and responsive after edge case payloads', async () => {
    const response = await request
      .post('/api/contact')
      .send(cases[0].payload);
    assert.strictEqual(response.status, 200);
  });
});
