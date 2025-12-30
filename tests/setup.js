import { vi } from 'vitest';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
global.localStorage = localStorageMock;

// Mock window
global.window = {
  dispatchEvent: vi.fn(),
  addEventListener: vi.fn(),
  location: { href: '', hostname: 'localhost' }
};

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
});
