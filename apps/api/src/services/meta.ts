import { LEVELS, type Level } from "shared";

export interface MetaRepository {
  findDistinctCountryCodes(): Promise<string[]>;
  findAllDepartments(): Promise<{ id: number; name: string }[]>;
}

export interface MetaResult {
  countries: string[];
  departments: { id: number; name: string }[];
  levels: readonly Level[];
}

export async function getMeta(repo: MetaRepository): Promise<MetaResult> {
  const [countries, departments] = await Promise.all([
    repo.findDistinctCountryCodes(),
    repo.findAllDepartments(),
  ]);

  return { countries, departments, levels: LEVELS };
}
