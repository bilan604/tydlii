const whole = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  maximumFractionDigits: 0,
});

const cents = new Intl.NumberFormat("en-CA", {
  style: "currency",
  currency: "CAD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Canadian dollars. Whole amounts drop cents; tax-inclusive amounts keep them. */
export function cad(amount: number, withCents = false): string {
  return (withCents || !Number.isInteger(amount) ? cents : whole).format(amount);
}

export function multiplierLabel(value: number): string {
  return `×${value.toFixed(2)}`;
}
