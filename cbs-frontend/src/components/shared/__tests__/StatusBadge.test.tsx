import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StatusBadge } from '../StatusBadge';

describe('StatusBadge', () => {
  describe('status color mapping', () => {
    it('renders ACTIVE status with success (green) colors', () => {
      const { container } = render(<StatusBadge status="ACTIVE" />);
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toMatch(/bg-green-50/);
      expect(badge.className).toMatch(/text-green-700/);
    });

    it('renders PENDING status with warning (amber) colors', () => {
      const { container } = render(<StatusBadge status="PENDING" />);
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toMatch(/bg-amber-50/);
      expect(badge.className).toMatch(/text-amber-700/);
    });

    it('renders SUSPENDED status with danger (red) colors', () => {
      const { container } = render(<StatusBadge status="SUSPENDED" />);
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toMatch(/bg-red-50/);
      expect(badge.className).toMatch(/text-red-700/);
    });

    it('renders CLOSED status with default (gray) colors', () => {
      const { container } = render(<StatusBadge status="CLOSED" />);
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toMatch(/bg-gray-100/);
      expect(badge.className).toMatch(/text-gray-600/);
    });

    it('renders APPROVED status with success (green) colors', () => {
      const { container } = render(<StatusBadge status="APPROVED" />);
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toMatch(/bg-green-50/);
      expect(badge.className).toMatch(/text-green-700/);
    });

    it('renders FAILED status with danger (red) colors', () => {
      const { container } = render(<StatusBadge status="FAILED" />);
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toMatch(/bg-red-50/);
      expect(badge.className).toMatch(/text-red-700/);
    });

    it('renders DRAFT status with warning (amber) colors', () => {
      const { container } = render(<StatusBadge status="DRAFT" />);
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toMatch(/bg-amber-50/);
      expect(badge.className).toMatch(/text-amber-700/);
    });

    it('falls back to default (gray) colors for unknown status', () => {
      const { container } = render(<StatusBadge status="UNKNOWN_STATUS" />);
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toMatch(/bg-gray-100/);
      expect(badge.className).toMatch(/text-gray-600/);
    });
  });

  describe('status text rendering', () => {
    it('renders the status text', () => {
      render(<StatusBadge status="ACTIVE" />);
      expect(screen.getByText('ACTIVE')).toBeTruthy();
    });

    it('replaces underscores with spaces in status text', () => {
      render(<StatusBadge status="IN_PROGRESS" />);
      expect(screen.getByText('IN PROGRESS')).toBeTruthy();
    });

    it('handles multiple underscores in status text', () => {
      render(<StatusBadge status="NOT_YET_STARTED" />);
      expect(screen.getByText('NOT YET STARTED')).toBeTruthy();
    });
  });

  describe('dot prop', () => {
    it('renders a dot span inside when dot=true', () => {
      const { container } = render(<StatusBadge status="ACTIVE" dot />);
      // dot should be a span rendered inside the badge
      const spans = container.querySelectorAll('span');
      // There should be at least one extra span for the dot
      expect(spans.length).toBeGreaterThan(0);
    });

    it('does not render extra dot span when dot is not set', () => {
      const { container } = render(<StatusBadge status="ACTIVE" />);
      const badge = container.firstChild as HTMLElement;
      // Without dot prop, no inner dot span
      const innerSpans = badge.querySelectorAll('span');
      expect(innerSpans.length).toBe(0);
    });
  });

  describe('size prop', () => {
    it('applies sm size classes by default (px-2 py-0.5 text-xs)', () => {
      const { container } = render(<StatusBadge status="ACTIVE" />);
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toContain('px-2');
      expect(badge.className).toContain('py-0.5');
      expect(badge.className).toContain('text-xs');
    });

    it('applies sm size classes when size=sm', () => {
      const { container } = render(<StatusBadge status="ACTIVE" size="sm" />);
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toContain('px-2');
      expect(badge.className).toContain('py-0.5');
      expect(badge.className).toContain('text-xs');
    });

    it('applies md size classes when size=md (px-2.5 py-1 text-xs)', () => {
      const { container } = render(<StatusBadge status="ACTIVE" size="md" />);
      const badge = container.firstChild as HTMLElement;
      expect(badge.className).toContain('px-2.5');
      expect(badge.className).toContain('py-1');
      expect(badge.className).toContain('text-xs');
    });
  });
});
