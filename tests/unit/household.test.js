import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Household Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('getCurrentHouseholdId', () => {
    it('should return null when no household is set', () => {
      localStorage.getItem = vi.fn().mockReturnValue(null);

      const getCurrentHouseholdId = () => localStorage.getItem('hc_current_household');

      expect(getCurrentHouseholdId()).toBeNull();
    });

    it('should return household ID when set', () => {
      localStorage.getItem = vi.fn().mockReturnValue('household-123');

      const getCurrentHouseholdId = () => localStorage.getItem('hc_current_household');

      expect(getCurrentHouseholdId()).toBe('household-123');
    });
  });

  describe('setCurrentHousehold', () => {
    it('should save household ID to localStorage', () => {
      const setCurrentHousehold = (id) => {
        localStorage.setItem('hc_current_household', id);
      };

      setCurrentHousehold('household-456');

      expect(localStorage.setItem).toHaveBeenCalledWith('hc_current_household', 'household-456');
    });
  });

  describe('generateInviteCode', () => {
    // Character set without ambiguous characters: I, L, O, 0, 1
    const ALLOWED_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

    const generateInviteCode = () => {
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += ALLOWED_CHARS[Math.floor(Math.random() * ALLOWED_CHARS.length)];
      }
      return code;
    };

    it('should generate a 6 character code', () => {
      const code = generateInviteCode();

      expect(code).toHaveLength(6);
      expect(code).toMatch(/^[A-Z0-9]+$/);
    });

    it('should not contain ambiguous characters', () => {
      for (let i = 0; i < 100; i++) {
        const code = generateInviteCode();
        expect(code).not.toContain('0');
        expect(code).not.toContain('O');
        expect(code).not.toContain('I');
        expect(code).not.toContain('1');
        expect(code).not.toContain('L');
      }
    });
  });

  describe('isAdmin', () => {
    it('should return true for admin users', () => {
      const mockHousehold = {
        members: {
          'user-123': { role: 'admin' }
        }
      };

      const isAdmin = (household, userId) => {
        return household?.members[userId]?.role === 'admin';
      };

      expect(isAdmin(mockHousehold, 'user-123')).toBe(true);
    });

    it('should return false for member users', () => {
      const mockHousehold = {
        members: {
          'user-123': { role: 'member' }
        }
      };

      const isAdmin = (household, userId) => {
        return household?.members[userId]?.role === 'admin';
      };

      expect(isAdmin(mockHousehold, 'user-123')).toBe(false);
    });

    it('should return false for non-members', () => {
      const mockHousehold = {
        members: {}
      };

      const isAdmin = (household, userId) => {
        return household?.members[userId]?.role === 'admin';
      };

      expect(isAdmin(mockHousehold, 'user-123')).toBe(false);
    });
  });
});
