process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'exactly-32-byte-encryption-key!!';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-at-least-32-chars-long';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret-at-least-32-chars-long';
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
