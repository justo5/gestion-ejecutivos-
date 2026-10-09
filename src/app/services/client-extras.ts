import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ClientStatus } from '../models/client-view.model';
import { ExecutivesService } from './executives';

// Todo lo "extra" que agrega la ficha de cliente (notas, override de estado
// y de link de contacto). Antes vivía solo en localStorage; ahora persiste en
// el backend (tabla clients) para que sea igual en cualquier dispositivo/
// ejecutivo. El To Do de la ficha ahora es el tablero de Tareas (TaskStore).

interface ClientExtras {
  notes: string;
  statusOverride?: ClientStatus;
  linkOverride?: string;
}

const EMPTY: ClientExtras = { notes: '' };

@Injectable({ providedIn: 'root' })
export class ClientExtrasService {
  constructor(private http: HttpClient, private executives: ExecutivesService) {}

  get(clientId: string): ClientExtras {
    const client = this.executives.findClient(clientId);
    if (!client) return EMPTY;
    return {
      notes: client.notes ?? '',
      statusOverride: client.statusOverride ?? undefined,
      linkOverride: client.linkOverride ?? undefined,
    };
  }

  saveNotes(clientId: string, notes: string): void {
    this.http.patch(`/api/clients/${clientId}/extras`, { notes }).subscribe(() => {
      this.executives.patchClientLocal(clientId, (c) => ({ ...c, notes }));
    });
  }

  setStatus(clientId: string, status: ClientStatus | null): void {
    this.http.patch(`/api/clients/${clientId}/extras`, { statusOverride: status }).subscribe(() => {
      this.executives.patchClientLocal(clientId, (c) => ({ ...c, statusOverride: status }));
    });
  }

  setLink(clientId: string, link: string | null): void {
    this.http.patch(`/api/clients/${clientId}/extras`, { linkOverride: link }).subscribe(() => {
      this.executives.patchClientLocal(clientId, (c) => ({ ...c, linkOverride: link }));
    });
  }
}
