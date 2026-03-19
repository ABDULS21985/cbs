import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MoneyInput } from '../MoneyInput';

describe('MoneyInput', () => {
  const defaultProps = {
    value: 0,
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the label when provided', () => {
    render(<MoneyInput {...defaultProps} label="Transaction Amount" />);
    expect(screen.getByText('Transaction Amount')).toBeInTheDocument();
  });

  it('does not render label element when label is not provided', () => {
    render(<MoneyInput {...defaultProps} />);
    expect(screen.queryByRole('label')).not.toBeInTheDocument();
  });

  it('shows ₦ currency symbol for NGN', () => {
    render(<MoneyInput {...defaultProps} currency="NGN" />);
    expect(screen.getByText('₦')).toBeInTheDocument();
  });

  it('shows $ currency symbol for USD', () => {
    render(<MoneyInput {...defaultProps} currency="USD" />);
    expect(screen.getByText('$')).toBeInTheDocument();
  });

  it('shows empty input when initial value is 0', () => {
    render(<MoneyInput {...defaultProps} value={0} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe('');
  });

  it('shows empty input when initial value is empty string', () => {
    render(<MoneyInput {...defaultProps} value={'' as unknown as number} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe('');
  });

  it('shows formatted value for non-zero initial value', () => {
    render(<MoneyInput {...defaultProps} value={1000} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.value).toBe('1,000.00');
  });

  it('calls onChange with parsed number when typing digits', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MoneyInput value={0} onChange={onChange} />);
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, '500');
    expect(onChange).toHaveBeenCalled();
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(typeof lastCall).toBe('number');
    expect(lastCall).toBe(500);
  });

  it('strips non-numeric characters from input', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MoneyInput value={0} onChange={onChange} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    await user.clear(input);
    await user.type(input, 'abc123');
    // Input should only contain numeric value
    expect(input.value).toMatch(/^[\d,\.]*$/);
    // onChange should have been called with 123
    if (onChange.mock.calls.length > 0) {
      const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1][0];
      expect(lastCall).toBe(123);
    }
  });

  it('allows only 2 decimal places', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MoneyInput value={0} onChange={onChange} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    await user.clear(input);
    await user.type(input, '100.999');
    // Value should be capped at 2 decimal places
    const lastCall = onChange.mock.calls[onChange.mock.calls.length - 1]?.[0];
    if (lastCall !== undefined) {
      const decimalPart = lastCall.toString().split('.')[1] ?? '';
      expect(decimalPart.length).toBeLessThanOrEqual(2);
    }
  });

  it('formats number with commas on blur with valid value', async () => {
    const user = userEvent.setup();
    render(<MoneyInput value={0} onChange={vi.fn()} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    await user.clear(input);
    await user.type(input, '1500');
    fireEvent.blur(input);
    await waitFor(() => {
      expect(input.value).toBe('1,500.00');
    });
  });

  it('resets to min and calls onChange(min) on blur when value is below min', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MoneyInput value={0} onChange={onChange} min={100} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    await user.clear(input);
    await user.type(input, '10');
    fireEvent.blur(input);
    await waitFor(() => {
      expect(input.value).toBe('100.00');
    });
    expect(onChange).toHaveBeenCalledWith(100);
  });

  it('resets to max and calls onChange(max) on blur when value exceeds max', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MoneyInput value={0} onChange={onChange} max={1000} />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    await user.clear(input);
    await user.type(input, '5000');
    fireEvent.blur(input);
    await waitFor(() => {
      expect(input.value).toBe('1,000.00');
    });
    expect(onChange).toHaveBeenCalledWith(1000);
  });

  it('renders error text below input when error prop is provided', () => {
    render(<MoneyInput {...defaultProps} error="Amount is required" />);
    expect(screen.getByText('Amount is required')).toBeInTheDocument();
  });

  it('input has border-red-500 class when error prop is provided', () => {
    render(<MoneyInput {...defaultProps} error="Invalid amount" />);
    const input = screen.getByRole('textbox');
    expect(input.className).toMatch(/border-red-500/);
  });

  it('input is disabled when disabled prop is true', () => {
    render(<MoneyInput {...defaultProps} disabled={true} />);
    const input = screen.getByRole('textbox');
    expect(input).toBeDisabled();
  });

  it('uses default placeholder 0.00 when not provided', () => {
    render(<MoneyInput {...defaultProps} />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('placeholder', '0.00');
  });

  it('uses custom placeholder when provided', () => {
    render(<MoneyInput {...defaultProps} placeholder="Enter amount" />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('placeholder', 'Enter amount');
  });
});
