import { expect, vi } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend expect with jest-dom matchers
expect.extend(matchers as any);

// Mock Next.js headers
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
  })),
  headers: vi.fn(() => ({
    get: vi.fn(),
  })),
}));

// Mock @supabase/server
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(() => ({
        data: {
          user: {
            id: 'test-user-id',
            email: 'test@example.com',
          },
        },
      })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => ({ data: null, error: null })),
          ilike: vi.fn(() => ({
            order: vi.fn(() => ({
              range: vi.fn(() => ({ data: [], count: 0, error: null })),
              limit: vi.fn(() => ({ data: [], error: null })),
            })),
          })),
          or: vi.fn(() => ({
            order: vi.fn(() => ({
              range: vi.fn(() => ({ data: [], count: 0, error: null })),
            })),
          })),
          order: vi.fn(() => ({
            range: vi.fn(() => ({ data: [], count: 0, error: null })),
            limit: vi.fn(() => ({ data: [], error: null })),
          })),
          range: vi.fn(() => ({ data: [], count: 0, error: null })),
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({ data: null, error: null })),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => ({ data: null, error: null })),
            })),
          })),
        })),
        delete: vi.fn(() => ({
          eq: vi.fn(() => ({ error: null })),
        })),
      })),
    })),
  })),
}));
