import { faker } from "@faker-js/faker";
import { COUNTRY_CURRENCIES } from "shared";
import { levelEnum } from "../schema";

type Level = (typeof levelEnum.enumValues)[number];
type EmployeeStatus = "active" | "inactive";

export interface GeneratedEmployee {
  employeeCode: string;
  fullName: string;
  email: string;
  countryCode: string;
  departmentIndex: number;
  jobTitle: string;
  level: Level;
  status: EmployeeStatus;
  hireDate: Date;
  salaryMinor: number;
  currency: string;
}

export interface GeneratedSalaryChange {
  employeeIndex: number;
  previousAmountMinor: number | null;
  newAmountMinor: number;
  currency: string;
  effectiveDate: Date;
  reason: string;
}

export interface SeedData {
  departments: { name: string }[];
  exchangeRates: { currency: string; rateToUsd: string }[];
  payBands: { level: Level; countryCode: string; minMinor: number; maxMinor: number }[];
  employees: GeneratedEmployee[];
  salaryChanges: GeneratedSalaryChange[];
}

// Fixed so output is reproducible regardless of when the generator runs.
const REFERENCE_DATE = new Date("2026-01-01T00:00:00.000Z");

const DEPARTMENT_NAMES = [
  "Engineering",
  "Sales",
  "Marketing",
  "Finance",
  "Human Resources",
  "Legal",
  "Operations",
  "Product",
  "Customer Support",
  "IT",
];

// Fixed, synthetic rates for deterministic fixture data (see docs/DECISIONS.md).
const RATE_TO_USD: Record<string, number> = {
  USD: 1.0,
  INR: 0.012,
  GBP: 1.27,
  EUR: 1.08,
  CAD: 0.74,
  AUD: 0.66,
  SGD: 0.74,
  BRL: 0.17,
};

const LEVEL_USD_BANDS: Record<Level, { min: number; max: number }> = {
  L1: { min: 45_000, max: 65_000 },
  L2: { min: 65_000, max: 90_000 },
  L3: { min: 90_000, max: 130_000 },
  L4: { min: 130_000, max: 180_000 },
  L5: { min: 180_000, max: 250_000 },
  L6: { min: 250_000, max: 350_000 },
};

// Fewer people at higher levels.
const LEVEL_WEIGHTS: { level: Level; weight: number }[] = [
  { level: "L1", weight: 0.3 },
  { level: "L2", weight: 0.25 },
  { level: "L3", weight: 0.2 },
  { level: "L4", weight: 0.14 },
  { level: "L5", weight: 0.08 },
  { level: "L6", weight: 0.03 },
];

const SALARY_CHANGE_REASONS = [
  "Annual review",
  "Promotion",
  "Market adjustment",
  "Internal transfer",
  "Cost of living adjustment",
];

const OUTLIER_RATE = 0.03;

function buildExchangeRates(): SeedData["exchangeRates"] {
  return COUNTRY_CURRENCIES.map(({ currency }) => ({
    currency,
    rateToUsd: RATE_TO_USD[currency].toFixed(6),
  }));
}

function buildPayBands(): SeedData["payBands"] {
  const bands: SeedData["payBands"] = [];

  for (const level of levelEnum.enumValues) {
    const usdBand = LEVEL_USD_BANDS[level];

    for (const { countryCode, currency } of COUNTRY_CURRENCIES) {
      const rate = RATE_TO_USD[currency];
      const minMinor = Math.round((usdBand.min / rate) * 100);
      const maxMinor = Math.round((usdBand.max / rate) * 100);

      bands.push({ level, countryCode, minMinor, maxMinor });
    }
  }

  return bands;
}

function pickWeightedLevel(): Level {
  const roll = faker.number.float({ min: 0, max: 1 });
  let cumulative = 0;

  for (const { level, weight } of LEVEL_WEIGHTS) {
    cumulative += weight;
    if (roll <= cumulative) {
      return level;
    }
  }

  return LEVEL_WEIGHTS[LEVEL_WEIGHTS.length - 1].level;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "");
}

function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
}

function buildEmployee(index: number, bandByKey: Map<string, SeedData["payBands"][number]>): GeneratedEmployee {
  const fullName = faker.person.fullName();
  const country = faker.helpers.arrayElement(COUNTRY_CURRENCIES);
  const level = pickWeightedLevel();
  const band = bandByKey.get(`${level}:${country.countryCode}`)!;

  const isOutlier = faker.number.float({ min: 0, max: 1 }) < OUTLIER_RATE;
  let salaryMinor: number;

  if (isOutlier) {
    const belowBand = faker.datatype.boolean();
    const margin = faker.number.float({ min: 0.1, max: 0.3 });
    salaryMinor = belowBand
      ? Math.round(band.minMinor * (1 - margin))
      : Math.round(band.maxMinor * (1 + margin));
  } else {
    salaryMinor = faker.number.int({ min: band.minMinor, max: band.maxMinor });
  }

  const hireDate = new Date(
    REFERENCE_DATE.getTime() - faker.number.int({ min: 30, max: 15 * 365 }) * 24 * 60 * 60 * 1000,
  );

  return {
    employeeCode: `EMP${String(index + 1).padStart(6, "0")}`,
    fullName,
    email: `${slugify(fullName)}.${String(index + 1).padStart(5, "0")}@acme.example`,
    countryCode: country.countryCode,
    departmentIndex: faker.number.int({ min: 0, max: DEPARTMENT_NAMES.length - 1 }),
    jobTitle: faker.person.jobTitle(),
    level,
    status: faker.number.float({ min: 0, max: 1 }) < 0.08 ? "inactive" : "active",
    hireDate,
    salaryMinor,
    currency: country.currency,
  };
}

function buildSalaryHistory(employeeIndex: number, employee: GeneratedEmployee): GeneratedSalaryChange[] {
  const changeCount = faker.number.int({ min: 1, max: 4 });

  const amounts: number[] = new Array(changeCount);
  amounts[changeCount - 1] = employee.salaryMinor;
  for (let i = changeCount - 2; i >= 0; i -= 1) {
    const growthFactor = faker.number.float({ min: 1.03, max: 1.15 });
    amounts[i] = Math.max(1, Math.round(amounts[i + 1] / growthFactor));
  }

  const effectiveDates: Date[] = [employee.hireDate];
  for (let i = 1; i < changeCount; i += 1) {
    const span = daysBetween(employee.hireDate, REFERENCE_DATE);
    const offsetDays = Math.round((span / changeCount) * i);
    effectiveDates.push(
      new Date(employee.hireDate.getTime() + offsetDays * 24 * 60 * 60 * 1000),
    );
  }

  return amounts.map((newAmountMinor, i) => ({
    employeeIndex,
    previousAmountMinor: i === 0 ? null : amounts[i - 1],
    newAmountMinor,
    currency: employee.currency,
    effectiveDate: effectiveDates[i],
    reason: i === 0 ? "Hire" : faker.helpers.arrayElement(SALARY_CHANGE_REASONS),
  }));
}

export function generateSeedData(seed: number, count: number): SeedData {
  faker.seed(seed);

  const departments = DEPARTMENT_NAMES.map((name) => ({ name }));
  const exchangeRates = buildExchangeRates();
  const payBands = buildPayBands();
  const bandByKey = new Map(payBands.map((b) => [`${b.level}:${b.countryCode}`, b]));

  const employees: GeneratedEmployee[] = [];
  const salaryChanges: GeneratedSalaryChange[] = [];

  for (let index = 0; index < count; index += 1) {
    const employee = buildEmployee(index, bandByKey);
    employees.push(employee);
    salaryChanges.push(...buildSalaryHistory(index, employee));
  }

  return { departments, exchangeRates, payBands, employees, salaryChanges };
}
