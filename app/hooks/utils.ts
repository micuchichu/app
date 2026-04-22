import * as Localization from 'expo-localization';

export interface Currency {
  code: string;
  symbol: string;
}

export function getDefaultCurrency() {
  const locales = Localization.getLocales();
  return { code: locales[0]?.currencyCode || 'EUR', symbol: locales[0]?.currencySymbol || '€' };
}