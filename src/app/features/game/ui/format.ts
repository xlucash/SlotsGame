const formatter = new Intl.NumberFormat('pl-PL', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatPLN(amount: number): string {
  return `${formatter.format(amount)} PLN`;
}

export function formatPlain(amount: number): string {
  return formatter.format(amount);
}
