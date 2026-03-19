import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmptyState } from '../EmptyState';

describe('EmptyState', () => {
  describe('title rendering', () => {
    it('always renders the title', () => {
      render(<EmptyState title="No records found" />);
      expect(screen.getByText('No records found')).toBeTruthy();
    });

    it('renders different title text correctly', () => {
      render(<EmptyState title="Nothing here yet" />);
      expect(screen.getByText('Nothing here yet')).toBeTruthy();
    });
  });

  describe('description rendering', () => {
    it('renders description when provided', () => {
      render(<EmptyState title="Empty" description="Try adding some items." />);
      expect(screen.getByText('Try adding some items.')).toBeTruthy();
    });

    it('does not render description when not provided', () => {
      render(<EmptyState title="Empty" />);
      // There should be no extra paragraph text
      expect(screen.queryByText(/Try adding/)).toBeNull();
    });
  });

  describe('icon rendering', () => {
    it('renders a default SVG icon (Inbox) when no icon is provided', () => {
      const { container } = render(<EmptyState title="Empty" />);
      const svg = container.querySelector('svg');
      expect(svg).toBeTruthy();
    });

    it('renders a custom icon when provided', () => {
      const CustomIcon = () => <svg data-testid="custom-icon" />;
      render(<EmptyState title="Empty" icon={<CustomIcon />} />);
      expect(screen.getByTestId('custom-icon')).toBeTruthy();
    });

    it('does not render the default icon when a custom icon is provided', () => {
      const CustomIcon = () => <svg data-testid="custom-icon" />;
      const { container } = render(<EmptyState title="Empty" icon={<CustomIcon />} />);
      // Only one SVG — our custom icon
      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBe(1);
      expect(svgs[0].getAttribute('data-testid')).toBe('custom-icon');
    });
  });

  describe('action rendering', () => {
    it('renders a button with action.label text when action is provided', () => {
      render(
        <EmptyState
          title="Empty"
          action={{ label: 'Add Item', onClick: vi.fn() }}
        />
      );
      expect(screen.getByRole('button', { name: 'Add Item' })).toBeTruthy();
    });

    it('fires action.onClick when the action button is clicked', async () => {
      const handleClick = vi.fn();
      render(
        <EmptyState
          title="Empty"
          action={{ label: 'Add Item', onClick: handleClick }}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: 'Add Item' }));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('does not render an action button when action is not provided', () => {
      render(<EmptyState title="Empty" />);
      expect(screen.queryByRole('button')).toBeNull();
    });

    it('renders action.icon inside the action button when provided', () => {
      const ActionIcon = () => <svg data-testid="action-icon" />;
      render(
        <EmptyState
          title="Empty"
          action={{
            label: 'Create',
            onClick: vi.fn(),
            icon: <ActionIcon />,
          }}
        />
      );
      expect(screen.getByTestId('action-icon')).toBeTruthy();
    });
  });

  describe('className prop', () => {
    it('applies custom className to the outer div', () => {
      const { container } = render(
        <EmptyState title="Empty" className="my-empty-state" />
      );
      const outerDiv = container.firstChild as HTMLElement;
      expect(outerDiv.className).toContain('my-empty-state');
    });

    it('applies multiple className values correctly', () => {
      const { container } = render(
        <EmptyState title="Empty" className="mt-8 px-4" />
      );
      const outerDiv = container.firstChild as HTMLElement;
      expect(outerDiv.className).toContain('mt-8');
      expect(outerDiv.className).toContain('px-4');
    });
  });
});
