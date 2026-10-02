import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppRoutes } from "./AppRoutes";

describe("AppRoutes", () => {
  it("renders the not-found page for an unknown route", () => {
    render(
      <MemoryRouter initialEntries={["/this-route-does-not-exist"]}>
        <AppRoutes />
      </MemoryRouter>,
    );

    expect(screen.getByText(/not found/i)).toBeInTheDocument();
  });
});
