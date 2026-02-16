import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TableFilters } from "./table-filters";

describe("TableFilters", () => {
  it("keeps story glow and highlight ring on separate wrappers", () => {
    render(
      <TableFilters
        search="das"
        onSearchChange={vi.fn()}
        status="all"
        onStatusChange={vi.fn()}
        tag="all"
        onTagChange={vi.fn()}
        sortField="updatedAt"
        sortDirection="desc"
        onSortChange={vi.fn()}
        highlightSearch
        searchWrapperClassName="story-focus-glow"
      />
    );

    const searchInput = screen.getByPlaceholderText("Search by name...");
    const ringWrapper = searchInput.parentElement;
    const glowWrapper = ringWrapper?.parentElement;

    expect(ringWrapper?.className).toContain("ring-2");
    expect(glowWrapper?.className).toContain("story-focus-glow");
  });
});
