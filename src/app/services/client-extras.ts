import { Injectable } from '@angular/core';
import { ClientStatus, TodoItem } from '../models/client-view.model';

// Todo lo "extra" que agrega la ficha de cliente (to do, notas, override de
// estado y de link de contacto) vive solo en el navegador: no hay backend ni
// Supabase para esto, es contenido local por ejecutivo/dispositivo.

interface ClientExtras {
  todos: TodoItem[];
  notes: string;
  statusOverride?: ClientStatus;
  linkOverride?: string;
}

const EMPTY: ClientExtras = { todos: [], notes: '' };

@Injectable({ providedIn: 'root' })
export class ClientExtrasService {
  private readonly KEY = 'gc_client_extras_v1';
  private store: Record<string, ClientExtras> = this.load();

  private load(): Record<string, ClientExtras> {
    try {
      const raw = localStorage.getItem(this.KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(this.KEY, JSON.stringify(this.store));
    } catch {
      /* almacenamiento lleno o no disponible: se pierde la persistencia, no la sesión */
    }
  }

  private getOrInit(clientId: string): ClientExtras {
    return this.store[clientId] ?? EMPTY;
  }

  get(clientId: string): ClientExtras {
    return this.getOrInit(clientId);
  }

  addTodo(clientId: string, text: string): void {
    const trimmed = text.trim();
    if (!trimmed) return;
    const extras = this.getOrInit(clientId);
    const todo: TodoItem = { id: crypto.randomUUID(), text: trimmed, done: false };
    this.store = { ...this.store, [clientId]: { ...extras, todos: [todo, ...extras.todos] } };
    this.persist();
  }

  toggleTodo(clientId: string, todoId: string): void {
    const extras = this.getOrInit(clientId);
    this.store = {
      ...this.store,
      [clientId]: { ...extras, todos: extras.todos.map(t => (t.id === todoId ? { ...t, done: !t.done } : t)) },
    };
    this.persist();
  }

  deleteTodo(clientId: string, todoId: string): void {
    const extras = this.getOrInit(clientId);
    this.store = { ...this.store, [clientId]: { ...extras, todos: extras.todos.filter(t => t.id !== todoId) } };
    this.persist();
  }

  saveNotes(clientId: string, notes: string): void {
    const extras = this.getOrInit(clientId);
    this.store = { ...this.store, [clientId]: { ...extras, notes } };
    this.persist();
  }

  setStatus(clientId: string, status: ClientStatus | null): void {
    const extras = this.getOrInit(clientId);
    const { statusOverride: _drop, ...rest } = extras;
    this.store = { ...this.store, [clientId]: status ? { ...rest, statusOverride: status } : rest };
    this.persist();
  }

  setLink(clientId: string, link: string | null): void {
    const extras = this.getOrInit(clientId);
    const { linkOverride: _drop, ...rest } = extras;
    this.store = { ...this.store, [clientId]: link ? { ...rest, linkOverride: link } : rest };
    this.persist();
  }
}
