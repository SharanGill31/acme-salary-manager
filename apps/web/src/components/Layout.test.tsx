import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Layout } from "./Layout";

function renderLayout() {
  render(
    <MemoryRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<div>Page content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("Layout", () => {
  it("renders navigation links to employees and insights", () => {
    renderLayout();

    expect(screen.getByRole("link", { name: /employees/i })).toHaveAttribute(
      "href",
      "/employees",
    );
    expect(screen.getByRole("link", { name: /insights/i })).toHaveAttribute(
      "href",
      "/insights",
    );
  });

  it("renders the skip link as the first focusable element on the page", () => {
    renderLayout();

    const focusable = document.querySelectorAll("a, button");
    expect(focusable.length).toBeGreaterThan(0);
    expect(focusable[0]).toHaveTextContent(/skip to main content/i);
  });
});
