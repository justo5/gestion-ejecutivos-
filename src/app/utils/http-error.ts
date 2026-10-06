import { HttpErrorResponse } from '@angular/common/http';

// Mensaje legible de un error del backend. Nest devuelve `message` como string
// en los errores de negocio y como array en los del ValidationPipe.
export function httpErrorMessage(err: HttpErrorResponse, fallback: string): string {
  const message = err.error?.message;
  if (typeof message === 'string') return message;
  if (Array.isArray(message) && typeof message[0] === 'string') return message[0];
  return fallback;
}
