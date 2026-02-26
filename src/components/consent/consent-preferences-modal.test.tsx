import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ConsentCategories } from "@/src/lib/consent/types";
import { ConsentPreferencesModal } from "./consent-preferences-modal";

const BASE_CATEGORIES: ConsentCategories = {
  necessary: true,
  functional: false,
  analytics: false,
  marketing: false,
};

describe("ConsentPreferencesModal", () => {
  it("does not overwrite in-progress toggles while modal is open", async () => {
    const user = userEvent.setup();

    const { rerender } = render(
      <ConsentPreferencesModal
        isOpen
        isSaving={false}
        isActionsDisabled={false}
        gpcLocked={false}
        initialCategories={{ ...BASE_CATEGORIES }}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );

    const analyticsCheckbox = screen.getByLabelText("Analytics cookies");
    expect(analyticsCheckbox).not.toBeChecked();

    await user.click(analyticsCheckbox);
    expect(analyticsCheckbox).toBeChecked();

    rerender(
      <ConsentPreferencesModal
        isOpen
        isSaving={false}
        isActionsDisabled={false}
        gpcLocked={false}
        initialCategories={{ ...BASE_CATEGORIES }}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );

    expect(screen.getByLabelText("Analytics cookies")).toBeChecked();
  });

  it("refreshes toggles from latest props when reopened", async () => {
    const user = userEvent.setup();

    const { rerender } = render(
      <ConsentPreferencesModal
        isOpen
        isSaving={false}
        isActionsDisabled={false}
        gpcLocked={false}
        initialCategories={{ ...BASE_CATEGORIES }}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );

    const analyticsCheckbox = screen.getByLabelText("Analytics cookies");
    await user.click(analyticsCheckbox);
    expect(analyticsCheckbox).toBeChecked();

    rerender(
      <ConsentPreferencesModal
        isOpen={false}
        isSaving={false}
        isActionsDisabled={false}
        gpcLocked={false}
        initialCategories={{ ...BASE_CATEGORIES }}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );

    rerender(
      <ConsentPreferencesModal
        isOpen
        isSaving={false}
        isActionsDisabled={false}
        gpcLocked={false}
        initialCategories={{ ...BASE_CATEGORIES }}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );

    expect(screen.getByLabelText("Analytics cookies")).not.toBeChecked();
  });

  it("includes Necessary cookie details summary in keyboard tab order", async () => {
    const user = userEvent.setup();

    render(
      <ConsentPreferencesModal
        isOpen
        isSaving={false}
        isActionsDisabled={false}
        gpcLocked={false}
        initialCategories={{ ...BASE_CATEGORIES }}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );

    const saveButton = screen.getByRole("button", { name: "Save preferences" });
    expect(saveButton).toHaveFocus();

    await user.tab();

    const necessarySummaryText = screen.getByText("View Necessary cookie details");
    const necessarySummary = necessarySummaryText.closest("summary");
    expect(necessarySummary).not.toBeNull();
    expect(necessarySummary as HTMLElement).toHaveFocus();
  });
});
