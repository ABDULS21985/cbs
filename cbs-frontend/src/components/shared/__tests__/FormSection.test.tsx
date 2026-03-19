import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormSection } from '../FormSection';

describe('FormSection', () => {
  describe('title rendering', () => {
    it('always renders the title', () => {
      render(
        <FormSection title="Personal Details">
          <div>Child content</div>
        </FormSection>
      );
      expect(screen.getByText('Personal Details')).toBeTruthy();
    });
  });

  describe('description rendering', () => {
    it('renders description when provided', () => {
      render(
        <FormSection title="Section" description="Fill in the fields below.">
          <div>Child</div>
        </FormSection>
      );
      expect(screen.getByText('Fill in the fields below.')).toBeTruthy();
    });

    it('does not render a description element when not provided', () => {
      render(
        <FormSection title="Section">
          <div>Child</div>
        </FormSection>
      );
      expect(screen.queryByText(/Fill in/)).toBeNull();
    });
  });

  describe('children rendering (defaultOpen=true)', () => {
    it('renders children by default when defaultOpen is not specified', () => {
      render(
        <FormSection title="Section">
          <div>Child content here</div>
        </FormSection>
      );
      expect(screen.getByText('Child content here')).toBeTruthy();
    });

    it('renders children when defaultOpen=true explicitly', () => {
      render(
        <FormSection title="Section" defaultOpen={true}>
          <div>Visible child</div>
        </FormSection>
      );
      expect(screen.getByText('Visible child')).toBeTruthy();
    });
  });

  describe('non-collapsible behavior (collapsible=false)', () => {
    it('does not render a chevron icon when collapsible=false', () => {
      const { container } = render(
        <FormSection title="Section" collapsible={false}>
          <div>Child</div>
        </FormSection>
      );
      // No SVG chevron should be present in the header area
      // If there's no toggle mechanism, the header area has no icon
      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBe(0);
    });

    it('always shows children when collapsible=false', () => {
      render(
        <FormSection title="Section" collapsible={false}>
          <div>Always visible</div>
        </FormSection>
      );
      expect(screen.getByText('Always visible')).toBeTruthy();
    });

    it('clicking header does not hide children when collapsible=false', () => {
      render(
        <FormSection title="Section" collapsible={false}>
          <div>Stays visible</div>
        </FormSection>
      );
      fireEvent.click(screen.getByText('Section'));
      expect(screen.getByText('Stays visible')).toBeTruthy();
    });
  });

  describe('collapsible behavior (collapsible=true)', () => {
    it('renders a chevron icon when collapsible=true', () => {
      const { container } = render(
        <FormSection title="Section" collapsible={true}>
          <div>Child</div>
        </FormSection>
      );
      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThan(0);
    });

    it('shows children initially when collapsible=true and defaultOpen=true', () => {
      render(
        <FormSection title="Section" collapsible={true} defaultOpen={true}>
          <div>Initially visible</div>
        </FormSection>
      );
      expect(screen.getByText('Initially visible')).toBeTruthy();
    });

    it('hides children initially when collapsible=true and defaultOpen=false', () => {
      render(
        <FormSection title="Section" collapsible={true} defaultOpen={false}>
          <div>Initially hidden</div>
        </FormSection>
      );
      expect(screen.queryByText('Initially hidden')).toBeNull();
    });

    it('toggles children visibility when header is clicked (open → closed)', () => {
      render(
        <FormSection title="Section" collapsible={true} defaultOpen={true}>
          <div>Toggle me</div>
        </FormSection>
      );
      expect(screen.getByText('Toggle me')).toBeTruthy();
      fireEvent.click(screen.getByText('Section'));
      expect(screen.queryByText('Toggle me')).toBeNull();
    });

    it('toggles children visibility when header is clicked (closed → open)', () => {
      render(
        <FormSection title="Section" collapsible={true} defaultOpen={false}>
          <div>Show me</div>
        </FormSection>
      );
      expect(screen.queryByText('Show me')).toBeNull();
      fireEvent.click(screen.getByText('Section'));
      expect(screen.getByText('Show me')).toBeTruthy();
    });

    it('re-hides children on second click (open → closed → open toggle cycle)', () => {
      render(
        <FormSection title="Section" collapsible={true} defaultOpen={true}>
          <div>Toggle content</div>
        </FormSection>
      );
      // First click: hides
      fireEvent.click(screen.getByText('Section'));
      expect(screen.queryByText('Toggle content')).toBeNull();
      // Second click: shows again
      fireEvent.click(screen.getByText('Section'));
      expect(screen.getByText('Toggle content')).toBeTruthy();
    });
  });
});
