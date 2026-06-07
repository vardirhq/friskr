import 'dotenv/config';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-only-secret';

if (!process.env.TEST_DATABASE_URL) {
  throw new Error('TEST_DATABASE_URL is required; tests delete application data');
}
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
