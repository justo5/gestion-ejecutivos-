import { Pipe, PipeTransform } from '@angular/core';
import { ClientLike, clientDisplayName } from '../utils/client-display-name';

// Versión de template de clientDisplayName (ver utils/client-display-name.ts):
// muestra la fanpage del cliente y, si no tiene, su nombre.
@Pipe({ name: 'clientDisplayName', standalone: false })
export class ClientDisplayNamePipe implements PipeTransform {
  transform(client: ClientLike | null | undefined): string {
    return clientDisplayName(client);
  }
}
