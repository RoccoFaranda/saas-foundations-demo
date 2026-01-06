import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HelloWorld } from "./HelloWorld";

describe("HelloWorld", () => {
  it("renders default greeting", () => {
    render(<HelloWorld />);
    expect(screen.getByRole("heading")).toHaveTextContent("Hello, World!");
  });

  it("renders custom greeting with name prop", () => {
    render(<HelloWorld name="Vitest" />);
    expect(screen.getByRole("heading")).toHaveTextContent("Hello, Vitest!");
  });
});
