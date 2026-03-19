import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PrintButton } from '../PrintButton';

describe('PrintButton', () => {
  it('renders a button with default label "Print"', () => {
    render(<PrintButton />);
    expect(screen.getByRole('button', { name: /print/i })).toBeTruthy();
  });

  it('renders a button with custom label', () => {
    render(<PrintButton label="Print Statement" />);
    expect(screen.getByRole('button', { name: /print statement/i })).toBeTruthy();
  });

  it('calls window.print when clicked', () => {
    render(<PrintButton />);
    fireEvent.click(screen.getByRole('button', { name: /print/i }));
    expect(window.print).toHaveBeenCalledTimes(1);
  });

  it('calls window.print with custom label', () => {
    render(<PrintButton label="Download PDF" />);
    fireEvent.click(screen.getByRole('button', { name: /download pdf/i }));
    expect(window.print).toHaveBeenCalled();
  });

  it('renders a printer SVG icon', () => {
    const { container } = render(<PrintButton />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('has no-print class to prevent self from printing', () => {
    const { container } = render(<PrintButton />);
    const btn = container.firstChild as HTMLElement;
    expect(btn.className).toContain('no-print');
  });
});
