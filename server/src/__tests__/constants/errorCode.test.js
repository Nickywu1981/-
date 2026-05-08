import { describe, it, expect } from 'vitest';
import { ERROR_CODE, ERROR_MSG } from '../../constants/errorCode.js';

describe('ERROR_CODE', () => {
  it('所有通用错误码值正确', () => {
    expect(ERROR_CODE.SUCCESS).toBe(200);
    expect(ERROR_CODE.BAD_REQUEST).toBe(400);
    expect(ERROR_CODE.UNAUTHORIZED).toBe(401);
    expect(ERROR_CODE.FORBIDDEN).toBe(403);
    expect(ERROR_CODE.NOT_FOUND).toBe(404);
    expect(ERROR_CODE.INTERNAL_ERROR).toBe(500);
  });

  it('ERROR_MSG 覆盖主要错误码', () => {
    const keys = [400, 401, 403, 404, 500, 4001, 4201, 4202];
    for (const code of keys) {
      expect(ERROR_MSG[code]).toBeDefined();
    }
  });
});
