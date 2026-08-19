import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ClientStatus, TodoItem } from '../models/client-view.model';
import { ExecutivesService } from './executives';

// Todo lo "extra" que agrega la ficha de cliente (to do, notas, override de
// estado y de link de contacto). Antes vivía solo en localStorage; ahora
// persiste en el backend (tabla clients + client_todos) para que sea igual
// en cualquier dispositivo/ejecutivo. La forma pública del servicio (get/
// addTodo/toggleTodo/deleteTodo/saveNotes/setStatus/setLink) se mantiene
// igual a propósito, así el resto del front no tuvo que cambiar.

interface ClientExtras {
  todos: TodoItem[];
  notes: string;
  statusOverride?: ClientStatus;
  linkOverride?: string;
}

const EMPTY: ClientExtras = { todos: [], notes: '' };

@Injectable({ providedIn: 'root' })
export class ClientExtrasService {
  constructor(private http: HttpClient, private executives: ExecutivesService) {}

  get(clientId: string): ClientExtras {
    const client = this.executives.findClient(clientId);
    if (!client) return EMPTY;
    return {
      todos: client.todos ?? [],
      notes: client.notes ?? '',
      statusOverride: client.statusOverride ?? undefined,
      linkOverride: client.linkOverride ?? undefined,
    };
  }

  addTodo(clientId: string, text: string): void {
    const trimmed = text.trim();
    if (!trimmed) return;
    this.http.post<TodoItem>(`/api/clients/${clientId}/todos`, { text: trimmed }).subscribe((todo) => {
      this.executives.patchClientLocal(clientId, (c) => ({ ...c, todos: [todo, ...(c.todos ?? [])] }));
    });
  }

  toggleTodo(clientId: string, todoId: string): void {
    const current = this.executives.findClient(clientId)?.todos?.find((t) => t.id === todoId);
    if (!current) return;
    const done = !current.done;
    this.http.patch(`/api/clients/${clientId}/todos/${todoId}`, { done }).subscribe(() => {
      this.executives.patchClientLocal(clientId, (c) => ({
        ...c,
        todos: (c.todos ?? []).map((t) => (t.id === todoId ? { ...t, done } : t)),
      }));
    });
  }

  deleteTodo(clientId: string, todoId: string): void {
    this.http.delete(`/api/clients/${clientId}/todos/${todoId}`).subscribe(() => {
      this.executives.patchClientLocal(clientId, (c) => ({
        ...c,
        todos: (c.todos ?? []).filter((t) => t.id !== todoId),
      }));
    });
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
