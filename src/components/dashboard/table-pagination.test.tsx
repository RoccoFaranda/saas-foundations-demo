import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TablePagination } from "./table-pagination";

describe("TablePagination", () => {
  it("renders a compact page window with ellipsis when page count is high", () => {
    render(
      <TablePagination currentPage={1} totalItems={240} pageSize={5} onPageChange={vi.fn()} />
    );

    expect(screen.getByRole("button", { name: "Go to page 1" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(screen.getByRole("button", { name: "Go to page 5" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go to page 48" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Go to page 6" })).not.toBeInTheDocument();
    expect(screen.getAllByText("...")).toHaveLength(1);
  });

  it("shows both ellipses around the current page when in the middle", () => {
    render(
      <TablePagination currentPage={24} totalItems={240} pageSize={5} onPageChange={vi.fn()} />
    );

    expect(screen.getByRole("button", { name: "Go to page 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go to page 23" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go to page 24" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(screen.getByRole("button", { name: "Go to page 25" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Go to page 48" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Go to page 22" })).not.toBeInTheDocument();
    expect(screen.getAllByText("...")).toHaveLength(2);
  });

  it("routes first/previous/next/last navigation actions", () => {
    const onPageChange = vi.fn();

    render(
      <TablePagination currentPage={24} totalItems={240} pageSize={5} onPageChange={onPageChange} />
    );

    fireEvent.click(screen.getByRole("button", { name: "Go to first page" }));
    fireEvent.click(screen.getByRole("button", { name: "Previous" }));
    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    fireEvent.click(screen.getByRole("button", { name: "Go to last page" }));

    expect(onPageChange.mock.calls).toEqual([[1], [23], [25], [48]]);
  });

  it("disables boundary controls and handles empty result sets", () => {
    const { rerender } = render(
      <TablePagination currentPage={1} totalItems={240} pageSize={5} onPageChange={vi.fn()} />
    );

    expect(screen.getByRole("button", { name: "Go to first page" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Go to last page" })).not.toBeDisabled();

    rerender(
      <TablePagination currentPage={48} totalItems={240} pageSize={5} onPageChange={vi.fn()} />
    );

    expect(screen.getByRole("button", { name: "Go to first page" })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Previous" })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Go to last page" })).toBeDisabled();

    rerender(
      <TablePagination currentPage={1} totalItems={0} pageSize={5} onPageChange={vi.fn()} />
    );

    expect(screen.getByText("No results")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Go to page \d+/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });
});
