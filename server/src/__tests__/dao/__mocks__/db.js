import { vi } from 'vitest';

export const mockExecute = vi.fn().mockResolvedValue([[{ affectedRows: 1 }]]);
export const mockQuery = vi.fn().mockResolvedValue([[], [{ total: 0 }]]);

const mockPool = { execute: mockExecute, query: mockQuery };

export default mockPool;
