import { useRef, useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { Modal } from "./modal";

function ModalHarness() {
  const [isOpen, setIsOpen] = useState(false);
  const initialFocusRef = useRef<HTMLButtonElement>(null);

  return (
    <div data-testid="app-content">
      <button type="button" data-testid="open-modal" onClick={() => setIsOpen(true)}>
        Open Modal
      </button>
      <button type="button" data-testid="outside-button">
        Outside Button
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        ariaLabelledBy="test-modal-title"
        initialFocusRef={initialFocusRef}
        backdropTestId="test-modal-backdrop"
      >
        <div data-testid="test-modal-panel">
          <h2 id="test-modal-title">Test Modal</h2>
          <button type="button" data-testid="first-focus" ref={initialFocusRef}>
            First Focus
          </button>
          <button type="button" data-testid="second-focus">
            Second Focus
          </button>
        </div>
      </Modal>
    </div>
  );
}

describe("Modal", () => {
  it("traps focus within modal controls", async () => {
    const user = userEvent.setup();
    render(<ModalHarness />);

    await user.click(screen.getByTestId("open-modal"));

    const firstFocus = screen.getByTestId("first-focus");
    const secondFocus = screen.getByTestId("second-focus");

    expect(firstFocus).toHaveFocus();

    await user.tab();
    expect(secondFocus).toHaveFocus();

    await user.tab();
    expect(firstFocus).toHaveFocus();
  });

  it("closes on Escape and restores focus to trigger", async () => {
    const user = userEvent.setup();
    render(<ModalHarness />);

    const openButton = screen.getByTestId("open-modal");
    await user.click(openButton);

    expect(screen.getByTestId("test-modal-panel")).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(screen.queryByTestId("test-modal-panel")).not.toBeInTheDocument();
    expect(openButton).toHaveFocus();
  });

  it("marks background as inert while open and restores it on close", async () => {
    const user = userEvent.setup();
    render(<ModalHarness />);

    const appContainer = screen.getByTestId("app-content").parentElement;
    if (!appContainer) {
      throw new Error("Expected app container to exist");
    }

    expect(appContainer).not.toHaveAttribute("inert");

    await user.click(screen.getByTestId("open-modal"));
    expect(appContainer).toHaveAttribute("inert");

    await user.keyboard("{Escape}");
    expect(appContainer).not.toHaveAttribute("inert");
  });
});
