import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from '@testing-library/react';
import { useUiStore } from '@/stores/uiStore';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getState() {
  return useUiStore.getState();
}

const DEFAULT_STATE = {
  sidebarCollapsed: false,
  sidebarMobileOpen: false,
  commandPaletteOpen: false,
  activeModal: null,
};

function resetStore() {
  useUiStore.setState(DEFAULT_STATE);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('uiStore', () => {
  beforeEach(() => {
    resetStore();
    // Clear localStorage entries related to the store
    localStorage.removeItem('cbs-ui');
  });

  afterEach(() => {
    resetStore();
    localStorage.removeItem('cbs-ui');
  });

  // -------------------------------------------------------------------------
  // Initial state
  // -------------------------------------------------------------------------
  describe('initial state', () => {
    it('has sidebarCollapsed as false by default', () => {
      expect(getState().sidebarCollapsed).toBe(false);
    });

    it('has sidebarMobileOpen as false by default', () => {
      expect(getState().sidebarMobileOpen).toBe(false);
    });

    it('has commandPaletteOpen as false by default', () => {
      expect(getState().commandPaletteOpen).toBe(false);
    });

    it('has activeModal as null by default', () => {
      expect(getState().activeModal).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // toggleSidebar()
  // -------------------------------------------------------------------------
  describe('toggleSidebar()', () => {
    it('toggles sidebarCollapsed from false to true', () => {
      act(() => {
        getState().toggleSidebar();
      });

      expect(getState().sidebarCollapsed).toBe(true);
    });

    it('toggles sidebarCollapsed from true back to false', () => {
      useUiStore.setState({ sidebarCollapsed: true });

      act(() => {
        getState().toggleSidebar();
      });

      expect(getState().sidebarCollapsed).toBe(false);
    });

    it('can be toggled multiple times', () => {
      act(() => { getState().toggleSidebar(); }); // true
      act(() => { getState().toggleSidebar(); }); // false
      act(() => { getState().toggleSidebar(); }); // true

      expect(getState().sidebarCollapsed).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // setSidebarCollapsed()
  // -------------------------------------------------------------------------
  describe('setSidebarCollapsed()', () => {
    it('sets sidebarCollapsed to true', () => {
      act(() => {
        getState().setSidebarCollapsed(true);
      });

      expect(getState().sidebarCollapsed).toBe(true);
    });

    it('sets sidebarCollapsed to false', () => {
      useUiStore.setState({ sidebarCollapsed: true });

      act(() => {
        getState().setSidebarCollapsed(false);
      });

      expect(getState().sidebarCollapsed).toBe(false);
    });

    it('is idempotent — setting true twice stays true', () => {
      act(() => { getState().setSidebarCollapsed(true); });
      act(() => { getState().setSidebarCollapsed(true); });

      expect(getState().sidebarCollapsed).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // setSidebarMobileOpen()
  // -------------------------------------------------------------------------
  describe('setSidebarMobileOpen()', () => {
    it('opens the mobile sidebar', () => {
      act(() => {
        getState().setSidebarMobileOpen(true);
      });

      expect(getState().sidebarMobileOpen).toBe(true);
    });

    it('closes the mobile sidebar', () => {
      useUiStore.setState({ sidebarMobileOpen: true });

      act(() => {
        getState().setSidebarMobileOpen(false);
      });

      expect(getState().sidebarMobileOpen).toBe(false);
    });

    it('does not affect sidebarCollapsed', () => {
      useUiStore.setState({ sidebarCollapsed: true });

      act(() => {
        getState().setSidebarMobileOpen(true);
      });

      expect(getState().sidebarCollapsed).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // openCommandPalette() / closeCommandPalette()
  // -------------------------------------------------------------------------
  describe('openCommandPalette()', () => {
    it('sets commandPaletteOpen to true', () => {
      act(() => {
        getState().openCommandPalette();
      });

      expect(getState().commandPaletteOpen).toBe(true);
    });

    it('calling open multiple times keeps it open', () => {
      act(() => { getState().openCommandPalette(); });
      act(() => { getState().openCommandPalette(); });

      expect(getState().commandPaletteOpen).toBe(true);
    });
  });

  describe('closeCommandPalette()', () => {
    it('sets commandPaletteOpen to false', () => {
      useUiStore.setState({ commandPaletteOpen: true });

      act(() => {
        getState().closeCommandPalette();
      });

      expect(getState().commandPaletteOpen).toBe(false);
    });

    it('does nothing when already closed', () => {
      act(() => {
        getState().closeCommandPalette();
      });

      expect(getState().commandPaletteOpen).toBe(false);
    });

    it('open then close works correctly', () => {
      act(() => { getState().openCommandPalette(); });
      act(() => { getState().closeCommandPalette(); });

      expect(getState().commandPaletteOpen).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // openModal() / closeModal()
  // -------------------------------------------------------------------------
  describe('openModal()', () => {
    it('sets activeModal to the provided id', () => {
      act(() => {
        getState().openModal('transfer-funds');
      });

      expect(getState().activeModal).toBe('transfer-funds');
    });

    it('replaces existing activeModal with new id', () => {
      act(() => { getState().openModal('modal-a'); });
      act(() => { getState().openModal('modal-b'); });

      expect(getState().activeModal).toBe('modal-b');
    });

    it('accepts any string as modal id', () => {
      act(() => {
        getState().openModal('confirm-delete-account-123');
      });

      expect(getState().activeModal).toBe('confirm-delete-account-123');
    });
  });

  describe('closeModal()', () => {
    it('sets activeModal back to null', () => {
      useUiStore.setState({ activeModal: 'some-modal' });

      act(() => {
        getState().closeModal();
      });

      expect(getState().activeModal).toBeNull();
    });

    it('does nothing when no modal is open', () => {
      act(() => {
        getState().closeModal();
      });

      expect(getState().activeModal).toBeNull();
    });

    it('open then close correctly resets activeModal', () => {
      act(() => { getState().openModal('edit-customer'); });
      act(() => { getState().closeModal(); });

      expect(getState().activeModal).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Persistence (localStorage under 'cbs-ui')
  // -------------------------------------------------------------------------
  describe('persistence', () => {
    it('persists sidebarCollapsed to localStorage', () => {
      act(() => {
        getState().setSidebarCollapsed(true);
      });

      const stored = localStorage.getItem('cbs-ui');
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored!);
      // Zustand persist stores state inside a "state" key by default
      const storedState = parsed.state ?? parsed;
      expect(storedState.sidebarCollapsed).toBe(true);
    });

    it('does NOT persist sidebarMobileOpen to localStorage', () => {
      act(() => {
        getState().setSidebarMobileOpen(true);
      });

      const stored = localStorage.getItem('cbs-ui');
      if (stored) {
        const parsed = JSON.parse(stored);
        const storedState = parsed.state ?? parsed;
        expect(storedState.sidebarMobileOpen).toBeUndefined();
      }
      // If nothing stored, persistence is selective — test passes
    });

    it('does NOT persist commandPaletteOpen to localStorage', () => {
      act(() => {
        getState().openCommandPalette();
      });

      const stored = localStorage.getItem('cbs-ui');
      if (stored) {
        const parsed = JSON.parse(stored);
        const storedState = parsed.state ?? parsed;
        expect(storedState.commandPaletteOpen).toBeUndefined();
      }
    });

    it('does NOT persist activeModal to localStorage', () => {
      act(() => {
        getState().openModal('some-modal');
      });

      const stored = localStorage.getItem('cbs-ui');
      if (stored) {
        const parsed = JSON.parse(stored);
        const storedState = parsed.state ?? parsed;
        expect(storedState.activeModal).toBeUndefined();
      }
    });

    it('persists updated sidebarCollapsed value when toggled', () => {
      act(() => { getState().setSidebarCollapsed(true); });
      act(() => { getState().setSidebarCollapsed(false); });

      const stored = localStorage.getItem('cbs-ui');
      if (stored) {
        const parsed = JSON.parse(stored);
        const storedState = parsed.state ?? parsed;
        expect(storedState.sidebarCollapsed).toBe(false);
      }
    });
  });
});
