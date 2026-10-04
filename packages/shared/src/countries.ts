// The countries Acme employs people in, each with the single currency its
// salaries and pay bands are held in. The seed generator draws from this list
// in order, so reordering it changes the generated data.
export const COUNTRY_CURRENCIES: readonly { countryCode: string; currency: string }[] = [
  { countryCode: "US", currency: "USD" },
  { countryCode: "IN", currency: "INR" },
  { countryCode: "GB", currency: "GBP" },
  { countryCode: "DE", currency: "EUR" },
  { countryCode: "CA", currency: "CAD" },
  { countryCode: "AU", currency: "AUD" },
  { countryCode: "SG", currency: "SGD" },
  { countryCode: "BR", currency: "BRL" },
];
