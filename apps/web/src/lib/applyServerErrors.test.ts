import { describe, expect, it, vi } from "vitest";
import type { UseFormSetError } from "react-hook-form";
import { applyServerErrors } from "./applyServerErrors";

interface Values {
  amount: string;
  reason: string;
}

const FIELD_MAP = {
  newAmountMinor: "amount",
  new_amount_minor: "amount",
  reason: "reason",
} as const;

function fakeSetError() {
  return vi.fn() as unknown as UseFormSetError<Values> & ReturnType<typeof vi.fn>;
}

describe("applyServerErrors", () => {
  it("sets each mapped server error on its form field and returns true", () => {
    const setError = fakeSetError();

    const allMapped = applyServerErrors(
      { newAmountMinor: "New salary must be greater than zero", reason: "Reason must be at least 3 characters" },
      FIELD_MAP,
      setError,
    );

    expect(allMapped).toBe(true);
    expect(setError).toHaveBeenCalledWith(
      "amount",
      { type: "server", message: "New salary must be greater than zero" },
      { shouldFocus: true },
    );
    expect(setError).toHaveBeenCalledWith(
      "reason",
      { type: "server", message: "Reason must be at least 3 characters" },
      { shouldFocus: false },
    );
  });

  it("focuses only the first mapped field", () => {
    const setError = fakeSetError();

    applyServerErrors({ unknown: "x", reason: "Too short" }, FIELD_MAP, setError);

    expect(setError).toHaveBeenCalledTimes(1);
    expect(setError).toHaveBeenCalledWith("reason", expect.anything(), { shouldFocus: true });
  });

  it("returns false when there are no server errors to place", () => {
    const setError = fakeSetError();

    expect(applyServerErrors({}, FIELD_MAP, setError)).toBe(false);
    expect(setError).not.toHaveBeenCalled();
  });

  it("returns false when any server error has no matching field", () => {
    const setError = fakeSetError();

    const allMapped = applyServerErrors(
      { reason: "Too short", somethingElse: "Unexpected" },
      FIELD_MAP,
      setError,
    );

    expect(allMapped).toBe(false);
    expect(setError).toHaveBeenCalledTimes(1);
  });
});
