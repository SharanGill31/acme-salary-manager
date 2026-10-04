import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

/**
 * Puts server-side field errors (from ApiError.errors) onto React Hook Form
 * fields. `fieldMap` translates server keys (camelCase domain keys from 422s,
 * snake_case body keys from 400s) to form field names. The first mapped
 * field receives focus. Returns true only when at least one error was placed
 * and every error was placed on a form field, so callers know whether a
 * general error is still needed.
 */
export function applyServerErrors<T extends FieldValues>(
  errors: Record<string, string>,
  fieldMap: Readonly<Record<string, Path<T>>>,
  setError: UseFormSetError<T>,
): boolean {
  let allMapped = true;
  let placedAny = false;
  for (const [key, message] of Object.entries(errors)) {
    const field = fieldMap[key];
    if (!field) {
      allMapped = false;
      continue;
    }
    setError(field, { type: "server", message }, { shouldFocus: !placedAny });
    placedAny = true;
  }
  return placedAny && allMapped;
}
