import { vi } from 'vitest';

export const mockExecute = vi.fn();

const mockPool = { execute: mockExecute };

export default mockPool;
