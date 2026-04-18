export function currencySymbol() {
  const locale = Intl.NumberFormat().resolvedOptions().locale;
  const currency = Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' }).formatToParts(0).find(part => part.type === 'currency');
  return currency ? currency.value : '$';
}