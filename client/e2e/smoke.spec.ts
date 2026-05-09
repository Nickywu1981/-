// E2E smoke tests — run with: npx playwright test
// Skipped by vitest (requires @playwright/test + browser)
// vitest client config excludes e2e/**

import { describe, it, expect } from 'vitest';

describe('E2E Smoke Tests (placeholder)', () => {
  it('vitest skips playwright tests — run with npx playwright test', () => {
    expect(true).toBe(true);
  });
});
