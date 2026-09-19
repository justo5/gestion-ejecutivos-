export function money(value: number): string {
  return `$${Math.round(value).toLocaleString('es-AR')}`;
}
