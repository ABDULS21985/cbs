import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { DateRangePicker } from '../DateRangePicker';

type DateRange = {
  from?: Date;
  to?: Date;
};

describe('DateRangePicker', () => {
  const defaultOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows "Select dates" when value has no from/to', () => {
    render(<DateRangePicker value={{}} onChange={defaultOnChange} />);
    expect(screen.getByText(/select dates/i)).toBeInTheDocument();
  });

  it('shows formatted range when both from and to are set', () => {
    const value: DateRange = {
      from: new Date('2024-01-15'),
      to: new Date('2024-02-15'),
    };
    render(<DateRangePicker value={value} onChange={defaultOnChange} />);
    // Should display something like "15 Jan — 15 Feb 2024"
    const btn = screen.getByRole('button');
    expect(btn.textContent).toMatch(/15/);
    expect(btn.textContent).toMatch(/Jan|Feb|2024/);
  });

  it('opens dropdown with presets when button is clicked', async () => {
    render(<DateRangePicker value={{}} onChange={defaultOnChange} />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => {
      expect(screen.getByText('Today')).toBeInTheDocument();
    });
  });

  it('renders all expected presets in dropdown', async () => {
    render(<DateRangePicker value={{}} onChange={defaultOnChange} />);
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(screen.getByText('Today')).toBeInTheDocument();
      expect(screen.getByText(/last 7 days/i)).toBeInTheDocument();
      expect(screen.getByText(/last 30 days/i)).toBeInTheDocument();
      expect(screen.getByText(/this month/i)).toBeInTheDocument();
      expect(screen.getByText(/this quarter/i)).toBeInTheDocument();
      expect(screen.getByText(/this year/i)).toBeInTheDocument();
    });
  });

  it('calls onChange with {from: today, to: today} when Today preset is clicked', async () => {
    render(<DateRangePicker value={{}} onChange={defaultOnChange} />);
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(screen.getByText('Today')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Today'));

    expect(defaultOnChange).toHaveBeenCalledTimes(1);
    const callArg = defaultOnChange.mock.calls[0][0] as DateRange;
    const today = new Date();
    expect(callArg.from).toBeDefined();
    expect(callArg.to).toBeDefined();
    // Both from and to should be today (same date)
    expect((callArg.from as Date).toDateString()).toBe(today.toDateString());
    expect((callArg.to as Date).toDateString()).toBe(today.toDateString());
  });

  it('closes dropdown after clicking a preset', async () => {
    render(<DateRangePicker value={{}} onChange={defaultOnChange} />);
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(screen.getByText('Today')).toBeInTheDocument());
    fireEvent.click(screen.getByText('Today'));

    await waitFor(() => {
      expect(screen.queryByText(/last 7 days/i)).not.toBeInTheDocument();
    });
  });

  it('shows manual From date input in dropdown', async () => {
    render(<DateRangePicker value={{}} onChange={defaultOnChange} />);
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      const fromInput =
        screen.queryByLabelText(/from/i) ??
        screen.queryByPlaceholderText(/from/i) ??
        document.querySelector('input[type="date"]:first-of-type');
      expect(fromInput).not.toBeNull();
    });
  });

  it('shows manual To date input in dropdown', async () => {
    render(<DateRangePicker value={{}} onChange={defaultOnChange} />);
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      const toInput =
        screen.queryByLabelText(/to/i) ??
        screen.queryByPlaceholderText(/to/i) ??
        document.querySelector('input[type="date"]:last-of-type');
      expect(toInput).not.toBeNull();
    });
  });

  it('button is disabled when disabled prop is true', () => {
    render(<DateRangePicker value={{}} onChange={defaultOnChange} disabled={true} />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('dropdown does not open when disabled and button is clicked', async () => {
    render(<DateRangePicker value={{}} onChange={defaultOnChange} disabled={true} />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => {
      expect(screen.queryByText('Today')).not.toBeInTheDocument();
    });
  });

  it('closes dropdown on mousedown outside', async () => {
    render(
      <div>
        <div data-testid="outside">Outside</div>
        <DateRangePicker value={{}} onChange={defaultOnChange} />
      </div>,
    );
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(screen.getByText('Today')).toBeInTheDocument());

    // Click outside
    fireEvent.mouseDown(screen.getByTestId('outside'));

    await waitFor(() => {
      expect(screen.queryByText('Today')).not.toBeInTheDocument();
    });
  });

  it('calls onChange with correct range for Last 7 days preset', async () => {
    render(<DateRangePicker value={{}} onChange={defaultOnChange} />);
    fireEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(screen.getByText(/last 7 days/i)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/last 7 days/i));

    expect(defaultOnChange).toHaveBeenCalledTimes(1);
    const callArg = defaultOnChange.mock.calls[0][0] as DateRange;
    expect(callArg.from).toBeDefined();
    expect(callArg.to).toBeDefined();

    const today = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 6);

    expect((callArg.to as Date).toDateString()).toBe(today.toDateString());
    expect((callArg.from as Date).toDateString()).toBe(sevenDaysAgo.toDateString());
  });

  it('shows "Select dates" placeholder text when value.from is undefined', () => {
    render(<DateRangePicker value={{ to: new Date('2024-01-15') }} onChange={defaultOnChange} />);
    expect(screen.getByText(/select dates/i)).toBeInTheDocument();
  });
});
