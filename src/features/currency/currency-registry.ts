/**
 * Central registry of the currencies Money Control supports.
 *
 * GENERATED. Regenerate with scripts/generate-currency-registry.mjs, which reads
 * Frankfurter's active currency list and ICU minor-unit data. Hand edits to the
 * table below are lost; change the generator instead.
 *
 * Every monetary amount is stored as an integer count of the currency's minor
 * units, so `fractionDigits` defines what a stored integer *means*. It is frozen
 * once shipped: changing a currency from 0 to 2 digits silently rescales every
 * existing row by 100. `tests/currency.test.mjs` pins these values for exactly
 * that reason.
 *
 * COP is deliberately `fractionDigits: 0` — whole pesos, not centavos — even
 * though ISO 4217 and ICU say 2. Existing rows are whole pesos.
 *
 * Fraction-digit and formatting rules live here only; screens and repositories
 * must not duplicate them.
 * See docs/decisions/0008-configurable-base-currency.md.
 */

export const supportedCurrencyCodes = ['AED', 'AFN', 'ALL', 'AMD', 'ANG', 'AOA', 'ARS', 'AUD', 'AWG', 'AZN', 'BAM', 'BBD', 'BDT', 'BHD', 'BIF', 'BMD', 'BND', 'BOB', 'BRL', 'BSD', 'BTN', 'BWP', 'BYN', 'BZD', 'CAD', 'CDF', 'CHF', 'CLP', 'CNH', 'CNY', 'COP', 'CRC', 'CUP', 'CVE', 'CZK', 'DJF', 'DKK', 'DOP', 'DZD', 'EGP', 'ERN', 'ETB', 'EUR', 'FJD', 'FKP', 'GBP', 'GEL', 'GGP', 'GHS', 'GIP', 'GMD', 'GNF', 'GTQ', 'GYD', 'HKD', 'HNL', 'HTG', 'HUF', 'IDR', 'ILS', 'IMP', 'INR', 'IQD', 'IRR', 'ISK', 'JEP', 'JMD', 'JOD', 'JPY', 'KES', 'KGS', 'KHR', 'KMF', 'KPW', 'KRW', 'KWD', 'KYD', 'KZT', 'LAK', 'LBP', 'LKR', 'LRD', 'LSL', 'LYD', 'MAD', 'MDL', 'MGA', 'MKD', 'MMK', 'MNT', 'MOP', 'MRO', 'MRU', 'MUR', 'MVR', 'MWK', 'MXN', 'MYR', 'MZN', 'NAD', 'NGN', 'NIO', 'NOK', 'NPR', 'NZD', 'OMR', 'PAB', 'PEN', 'PGK', 'PHP', 'PKR', 'PLN', 'PYG', 'QAR', 'RON', 'RSD', 'RUB', 'RWF', 'SAR', 'SBD', 'SCR', 'SDG', 'SEK', 'SGD', 'SHP', 'SLE', 'SOS', 'SRD', 'SSP', 'STN', 'SVC', 'SYP', 'SZL', 'THB', 'TJS', 'TMT', 'TND', 'TOP', 'TRY', 'TTD', 'TWD', 'TZS', 'UAH', 'UGX', 'USD', 'UYU', 'UZS', 'VES', 'VND', 'VUV', 'WST', 'XAF', 'XCD', 'XCG', 'XOF', 'XPF', 'YER', 'ZAR', 'ZMW', 'ZWG'] as const;

export type CurrencyCode = (typeof supportedCurrencyCodes)[number];

export type CurrencyDefinition = {
  code: CurrencyCode;
  name: string;
  symbol: string;
  fractionDigits: number;
  minorUnitFactor: number;
  locale: string;
  /** Character used between the whole and fractional parts when formatting. */
  decimalSeparator: string;
};

const DEFINITIONS: Record<CurrencyCode, CurrencyDefinition> = {
  AED: { code: 'AED', name: "United Arab Emirates Dirham", symbol: "د.إ", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  AFN: { code: 'AFN', name: "Afghan Afghani", symbol: "؋", fractionDigits: 0, minorUnitFactor: 1, locale: 'en-US', decimalSeparator: '.' },
  ALL: { code: 'ALL', name: "Albanian Lek", symbol: "L", fractionDigits: 0, minorUnitFactor: 1, locale: 'en-US', decimalSeparator: '.' },
  AMD: { code: 'AMD', name: "Armenian Dram", symbol: "֏", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  ANG: { code: 'ANG', name: "Netherlands Antillean Gulden", symbol: "ƒ", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  AOA: { code: 'AOA', name: "Angolan Kwanza", symbol: "Kz", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  ARS: { code: 'ARS', name: "Argentine Peso", symbol: "$", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  AUD: { code: 'AUD', name: "Australian Dollar", symbol: "$", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  AWG: { code: 'AWG', name: "Aruban Florin", symbol: "ƒ", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  AZN: { code: 'AZN', name: "Azerbaijani Manat", symbol: "₼", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  BAM: { code: 'BAM', name: "Bosnia and Herzegovina Convertible Mark", symbol: "КМ", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  BBD: { code: 'BBD', name: "Barbadian Dollar", symbol: "$", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  BDT: { code: 'BDT', name: "Bangladeshi Taka", symbol: "৳", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  BHD: { code: 'BHD', name: "Bahraini Dinar", symbol: "د.ب", fractionDigits: 3, minorUnitFactor: 1000, locale: 'en-US', decimalSeparator: '.' },
  BIF: { code: 'BIF', name: "Burundian Franc", symbol: "Fr", fractionDigits: 0, minorUnitFactor: 1, locale: 'en-US', decimalSeparator: '.' },
  BMD: { code: 'BMD', name: "Bermudian Dollar", symbol: "$", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  BND: { code: 'BND', name: "Brunei Dollar", symbol: "$", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  BOB: { code: 'BOB', name: "Bolivian Boliviano", symbol: "Bs.", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  BRL: { code: 'BRL', name: "Brazilian Real", symbol: "R$", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  BSD: { code: 'BSD', name: "Bahamian Dollar", symbol: "$", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  BTN: { code: 'BTN', name: "Bhutanese Ngultrum", symbol: "Nu.", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  BWP: { code: 'BWP', name: "Botswana Pula", symbol: "P", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  BYN: { code: 'BYN', name: "Belarusian Ruble", symbol: "Br", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  BZD: { code: 'BZD', name: "Belize Dollar", symbol: "$", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  CAD: { code: 'CAD', name: "Canadian Dollar", symbol: "$", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  CDF: { code: 'CDF', name: "Congolese Franc", symbol: "Fr", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  CHF: { code: 'CHF', name: "Swiss Franc", symbol: "CHF", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  CLP: { code: 'CLP', name: "Chilean Peso", symbol: "$", fractionDigits: 0, minorUnitFactor: 1, locale: 'en-US', decimalSeparator: '.' },
  CNH: { code: 'CNH', name: "Chinese Renminbi Yuan Offshore", symbol: "¥", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  CNY: { code: 'CNY', name: "Chinese Renminbi Yuan", symbol: "¥", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  COP: { code: 'COP', name: "Colombian peso", symbol: "$", fractionDigits: 0, minorUnitFactor: 1, locale: 'es-CO', decimalSeparator: ',' },
  CRC: { code: 'CRC', name: "Costa Rican Colón", symbol: "₡", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  CUP: { code: 'CUP', name: "Cuban Peso", symbol: "$", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  CVE: { code: 'CVE', name: "Cape Verdean Escudo", symbol: "$", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  CZK: { code: 'CZK', name: "Czech Koruna", symbol: "Kč", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  DJF: { code: 'DJF', name: "Djiboutian Franc", symbol: "Fdj", fractionDigits: 0, minorUnitFactor: 1, locale: 'en-US', decimalSeparator: '.' },
  DKK: { code: 'DKK', name: "Danish Krone", symbol: "kr.", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  DOP: { code: 'DOP', name: "Dominican Peso", symbol: "$", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  DZD: { code: 'DZD', name: "Algerian Dinar", symbol: "د.ج", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  EGP: { code: 'EGP', name: "Egyptian Pound", symbol: "ج.م", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  ERN: { code: 'ERN', name: "Eritrean Nakfa", symbol: "Nfk", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  ETB: { code: 'ETB', name: "Ethiopian Birr", symbol: "Br", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  EUR: { code: 'EUR', name: "Euro", symbol: "€", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  FJD: { code: 'FJD', name: "Fijian Dollar", symbol: "$", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  FKP: { code: 'FKP', name: "Falkland Pound", symbol: "£", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  GBP: { code: 'GBP', name: "British Pound", symbol: "£", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  GEL: { code: 'GEL', name: "Georgian Lari", symbol: "₾", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  GGP: { code: 'GGP', name: "Guernsey Pound", symbol: "£", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  GHS: { code: 'GHS', name: "Ghanaian Cedi", symbol: "₵", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  GIP: { code: 'GIP', name: "Gibraltar Pound", symbol: "£", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  GMD: { code: 'GMD', name: "Gambian Dalasi", symbol: "D", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  GNF: { code: 'GNF', name: "Guinean Franc", symbol: "Fr", fractionDigits: 0, minorUnitFactor: 1, locale: 'en-US', decimalSeparator: '.' },
  GTQ: { code: 'GTQ', name: "Guatemalan Quetzal", symbol: "Q", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  GYD: { code: 'GYD', name: "Guyanese Dollar", symbol: "$", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  HKD: { code: 'HKD', name: "Hong Kong Dollar", symbol: "$", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  HNL: { code: 'HNL', name: "Honduran Lempira", symbol: "L", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  HTG: { code: 'HTG', name: "Haitian Gourde", symbol: "G", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  HUF: { code: 'HUF', name: "Hungarian Forint", symbol: "Ft", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  IDR: { code: 'IDR', name: "Indonesian Rupiah", symbol: "Rp", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  ILS: { code: 'ILS', name: "Israeli New Shekel", symbol: "₪", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  IMP: { code: 'IMP', name: "Isle of Man Pound", symbol: "£", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  INR: { code: 'INR', name: "Indian Rupee", symbol: "₹", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  IQD: { code: 'IQD', name: "Iraqi Dinar", symbol: "ع.د", fractionDigits: 0, minorUnitFactor: 1, locale: 'en-US', decimalSeparator: '.' },
  IRR: { code: 'IRR', name: "Iranian Rial", symbol: "﷼", fractionDigits: 0, minorUnitFactor: 1, locale: 'en-US', decimalSeparator: '.' },
  ISK: { code: 'ISK', name: "Icelandic Króna", symbol: "kr.", fractionDigits: 0, minorUnitFactor: 1, locale: 'en-US', decimalSeparator: '.' },
  JEP: { code: 'JEP', name: "Jersey Pound", symbol: "£", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  JMD: { code: 'JMD', name: "Jamaican Dollar", symbol: "$", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  JOD: { code: 'JOD', name: "Jordanian Dinar", symbol: "د.ا", fractionDigits: 3, minorUnitFactor: 1000, locale: 'en-US', decimalSeparator: '.' },
  JPY: { code: 'JPY', name: "Japanese Yen", symbol: "¥", fractionDigits: 0, minorUnitFactor: 1, locale: 'en-US', decimalSeparator: '.' },
  KES: { code: 'KES', name: "Kenyan Shilling", symbol: "KSh", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  KGS: { code: 'KGS', name: "Kyrgyzstani Som", symbol: "som", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  KHR: { code: 'KHR', name: "Cambodian Riel", symbol: "៛", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  KMF: { code: 'KMF', name: "Comorian Franc", symbol: "Fr", fractionDigits: 0, minorUnitFactor: 1, locale: 'en-US', decimalSeparator: '.' },
  KPW: { code: 'KPW', name: "North Korean Won", symbol: "₩", fractionDigits: 0, minorUnitFactor: 1, locale: 'en-US', decimalSeparator: '.' },
  KRW: { code: 'KRW', name: "South Korean Won", symbol: "₩", fractionDigits: 0, minorUnitFactor: 1, locale: 'en-US', decimalSeparator: '.' },
  KWD: { code: 'KWD', name: "Kuwaiti Dinar", symbol: "د.ك", fractionDigits: 3, minorUnitFactor: 1000, locale: 'en-US', decimalSeparator: '.' },
  KYD: { code: 'KYD', name: "Cayman Islands Dollar", symbol: "$", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  KZT: { code: 'KZT', name: "Kazakhstani Tenge", symbol: "₸", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  LAK: { code: 'LAK', name: "Lao Kip", symbol: "₭", fractionDigits: 0, minorUnitFactor: 1, locale: 'en-US', decimalSeparator: '.' },
  LBP: { code: 'LBP', name: "Lebanese Pound", symbol: "ل.ل", fractionDigits: 0, minorUnitFactor: 1, locale: 'en-US', decimalSeparator: '.' },
  LKR: { code: 'LKR', name: "Sri Lankan Rupee", symbol: "₨", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  LRD: { code: 'LRD', name: "Liberian Dollar", symbol: "$", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  LSL: { code: 'LSL', name: "Lesotho Loti", symbol: "L", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  LYD: { code: 'LYD', name: "Libyan Dinar", symbol: "ل.د", fractionDigits: 3, minorUnitFactor: 1000, locale: 'en-US', decimalSeparator: '.' },
  MAD: { code: 'MAD', name: "Moroccan Dirham", symbol: "د.م.", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  MDL: { code: 'MDL', name: "Moldovan Leu", symbol: "L", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  MGA: { code: 'MGA', name: "Malagasy Ariary", symbol: "Ar", fractionDigits: 0, minorUnitFactor: 1, locale: 'en-US', decimalSeparator: '.' },
  MKD: { code: 'MKD', name: "Macedonian Denar", symbol: "ден", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  MMK: { code: 'MMK', name: "Myanmar Kyat", symbol: "K", fractionDigits: 0, minorUnitFactor: 1, locale: 'en-US', decimalSeparator: '.' },
  MNT: { code: 'MNT', name: "Mongolian Tögrög", symbol: "₮", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  MOP: { code: 'MOP', name: "Macanese Pataca", symbol: "P", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  MRO: { code: 'MRO', name: "Mauritanian Ouguiya", symbol: "UM", fractionDigits: 0, minorUnitFactor: 1, locale: 'en-US', decimalSeparator: '.' },
  MRU: { code: 'MRU', name: "Mauritanian Ouguiya", symbol: "UM", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  MUR: { code: 'MUR', name: "Mauritian Rupee", symbol: "₨", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  MVR: { code: 'MVR', name: "Maldivian Rufiyaa", symbol: "MVR", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  MWK: { code: 'MWK', name: "Malawian Kwacha", symbol: "MK", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  MXN: { code: 'MXN', name: "Mexican Peso", symbol: "$", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  MYR: { code: 'MYR', name: "Malaysian Ringgit", symbol: "RM", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  MZN: { code: 'MZN', name: "Mozambican Metical", symbol: "MTn", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  NAD: { code: 'NAD', name: "Namibian Dollar", symbol: "$", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  NGN: { code: 'NGN', name: "Nigerian Naira", symbol: "₦", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  NIO: { code: 'NIO', name: "Nicaraguan Córdoba", symbol: "C$", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  NOK: { code: 'NOK', name: "Norwegian Krone", symbol: "kr", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  NPR: { code: 'NPR', name: "Nepalese Rupee", symbol: "Rs.", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  NZD: { code: 'NZD', name: "New Zealand Dollar", symbol: "$", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  OMR: { code: 'OMR', name: "Omani Rial", symbol: "ر.ع.", fractionDigits: 3, minorUnitFactor: 1000, locale: 'en-US', decimalSeparator: '.' },
  PAB: { code: 'PAB', name: "Panamanian Balboa", symbol: "B/.", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  PEN: { code: 'PEN', name: "Peruvian Sol", symbol: "S/", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  PGK: { code: 'PGK', name: "Papua New Guinean Kina", symbol: "K", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  PHP: { code: 'PHP', name: "Philippine Peso", symbol: "₱", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  PKR: { code: 'PKR', name: "Pakistani Rupee", symbol: "₨", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  PLN: { code: 'PLN', name: "Polish Złoty", symbol: "zł", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  PYG: { code: 'PYG', name: "Paraguayan Guaraní", symbol: "₲", fractionDigits: 0, minorUnitFactor: 1, locale: 'en-US', decimalSeparator: '.' },
  QAR: { code: 'QAR', name: "Qatari Riyal", symbol: "ر.ق", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  RON: { code: 'RON', name: "Romanian Leu", symbol: "Lei", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  RSD: { code: 'RSD', name: "Serbian Dinar", symbol: "RSD", fractionDigits: 0, minorUnitFactor: 1, locale: 'en-US', decimalSeparator: '.' },
  RUB: { code: 'RUB', name: "Russian Ruble", symbol: "₽", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  RWF: { code: 'RWF', name: "Rwandan Franc", symbol: "FRw", fractionDigits: 0, minorUnitFactor: 1, locale: 'en-US', decimalSeparator: '.' },
  SAR: { code: 'SAR', name: "Saudi Riyal", symbol: "ر.س", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  SBD: { code: 'SBD', name: "Solomon Islands Dollar", symbol: "$", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  SCR: { code: 'SCR', name: "Seychellois Rupee", symbol: "₨", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  SDG: { code: 'SDG', name: "Sudanese Pound", symbol: "£", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  SEK: { code: 'SEK', name: "Swedish Krona", symbol: "kr", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  SGD: { code: 'SGD', name: "Singapore Dollar", symbol: "$", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  SHP: { code: 'SHP', name: "Saint Helenian Pound", symbol: "£", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  SLE: { code: 'SLE', name: "New Leone", symbol: "Le", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  SOS: { code: 'SOS', name: "Somali Shilling", symbol: "Sh", fractionDigits: 0, minorUnitFactor: 1, locale: 'en-US', decimalSeparator: '.' },
  SRD: { code: 'SRD', name: "Surinamese Dollar", symbol: "$", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  SSP: { code: 'SSP', name: "South Sudanese Pound", symbol: "£", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  STN: { code: 'STN', name: "São Tomé and Príncipe Second Dobra", symbol: "Db", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  SVC: { code: 'SVC', name: "Salvadoran Colón", symbol: "₡", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  SYP: { code: 'SYP', name: "Syrian Pound", symbol: "£S", fractionDigits: 0, minorUnitFactor: 1, locale: 'en-US', decimalSeparator: '.' },
  SZL: { code: 'SZL', name: "Swazi Lilangeni", symbol: "E", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  THB: { code: 'THB', name: "Thai Baht", symbol: "฿", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  TJS: { code: 'TJS', name: "Tajikistani Somoni", symbol: "ЅМ", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  TMT: { code: 'TMT', name: "Turkmenistani Manat", symbol: "m", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  TND: { code: 'TND', name: "Tunisian Dinar", symbol: "د.ت", fractionDigits: 3, minorUnitFactor: 1000, locale: 'en-US', decimalSeparator: '.' },
  TOP: { code: 'TOP', name: "Tongan Paʻanga", symbol: "T$", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  TRY: { code: 'TRY', name: "Turkish Lira", symbol: "₺", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  TTD: { code: 'TTD', name: "Trinidad and Tobago Dollar", symbol: "$", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  TWD: { code: 'TWD', name: "New Taiwan Dollar", symbol: "$", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  TZS: { code: 'TZS', name: "Tanzanian Shilling", symbol: "Sh", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  UAH: { code: 'UAH', name: "Ukrainian Hryvnia", symbol: "₴", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  UGX: { code: 'UGX', name: "Ugandan Shilling", symbol: "USh", fractionDigits: 0, minorUnitFactor: 1, locale: 'en-US', decimalSeparator: '.' },
  USD: { code: 'USD', name: "US dollar", symbol: "US$", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  UYU: { code: 'UYU', name: "Uruguayan Peso", symbol: "$U", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  UZS: { code: 'UZS', name: "Uzbekistan Som", symbol: "so'm", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  VES: { code: 'VES', name: "Venezuelan Bolívar Soberano", symbol: "Bs", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  VND: { code: 'VND', name: "Vietnamese Đồng", symbol: "₫", fractionDigits: 0, minorUnitFactor: 1, locale: 'en-US', decimalSeparator: '.' },
  VUV: { code: 'VUV', name: "Vanuatu Vatu", symbol: "Vt", fractionDigits: 0, minorUnitFactor: 1, locale: 'en-US', decimalSeparator: '.' },
  WST: { code: 'WST', name: "Samoan Tala", symbol: "T", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  XAF: { code: 'XAF', name: "Central African CFA Franc", symbol: "CFA", fractionDigits: 0, minorUnitFactor: 1, locale: 'en-US', decimalSeparator: '.' },
  XCD: { code: 'XCD', name: "East Caribbean Dollar", symbol: "$", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  XCG: { code: 'XCG', name: "Caribbean Guilder", symbol: "Cg", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  XOF: { code: 'XOF', name: "West African CFA Franc", symbol: "Fr", fractionDigits: 0, minorUnitFactor: 1, locale: 'en-US', decimalSeparator: '.' },
  XPF: { code: 'XPF', name: "CFP Franc", symbol: "Fr", fractionDigits: 0, minorUnitFactor: 1, locale: 'en-US', decimalSeparator: '.' },
  YER: { code: 'YER', name: "Yemeni Rial", symbol: "﷼", fractionDigits: 0, minorUnitFactor: 1, locale: 'en-US', decimalSeparator: '.' },
  ZAR: { code: 'ZAR', name: "South African Rand", symbol: "R", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  ZMW: { code: 'ZMW', name: "Zambian Kwacha", symbol: "K", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
  ZWG: { code: 'ZWG', name: "Zimbabwe Gold", symbol: "ZiG", fractionDigits: 2, minorUnitFactor: 100, locale: 'en-US', decimalSeparator: '.' },
};

export function isSupportedCurrency(value: unknown): value is CurrencyCode {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(DEFINITIONS, value);
}

export function getCurrency(code: CurrencyCode): CurrencyDefinition {
  const definition = DEFINITIONS[code];
  if (!definition) throw new Error(`Unsupported currency code: ${String(code)}`);
  return definition;
}

export function listCurrencies(): CurrencyDefinition[] {
  return supportedCurrencyCodes.map((code) => DEFINITIONS[code]);
}
