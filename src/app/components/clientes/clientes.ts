import { Component, OnInit } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { CLIENT_DETAIL_FIELDS, Client, Executive, ExecutivesService } from '../../services/executives';
import { AuthService } from '../../services/auth';
import { ConfigService, PlanConfig, RubroConfig } from '../../services/config';
import { ClientExtrasService } from '../../services/client-extras';
import { ClientViewBuilder } from '../../services/client-view-builder';
import { ClientCardView, ClientStatus, TodoItem } from '../../models/client-view.model';

export interface ClientCardItem {
  client: Client;
  executiveName: string;
  squad: string;
}

type DetailTab = 'resumen' | 'detalle' | 'todo' | 'notas';

interface StatusOption {
  value: ClientStatus;
  label: string;
  color: string;
}

const STATUS_OPTIONS: StatusOption[] = [
  { value: 'active', label: 'Al día', color: 'var(--verde)' },
  { value: 'warning', label: 'Atención', color: 'var(--naranja)' },
  { value: 'critical', label: 'Crítico', color: 'var(--rojo)' },
];

@Component({
  selector: 'app-clientes',
  standalone: false,
  templateUrl: './clientes.html',
  styleUrl: './clientes.scss',
})
export class Clientes implements OnInit {
  rows$!: Observable<ClientCardItem[]>;
  filteredRows$!: Observable<ClientCardItem[]>;

  private searchSubject = new BehaviorSubject<string>('');

  showForm = false;
  formError = '';
  formSuccess = '';
  submitting = false;
  executives: Executive[] = [];
  plans: PlanConfig[] = [];
  rubros: RubroConfig[] = [];

  selectedItem: ClientCardItem | null = null;
  editMode = false;
  editError = '';
  editSuccess = '';
  editSubmitting = false;

  showDeleteConfirm = false;
  deleteSubmitting = false;
  deleteError = '';

  // --- Ficha del cliente: resumen / to do / notas (todo local, sin backend) ---
  readonly statusOptions = STATUS_OPTIONS;
  activeTab: DetailTab = 'resumen';
  statusMenuOpen = false;

  newTodoText = '';
  notesDraft = '';
  notesSaved = false;

  editingLink = false;
  linkDraft = '';

  editClient: {
    name: string;
    fanpage: string;
    plan: string;
    country: string;
    sexo: string;
    edad: number | null;
    collectedBy: string;
    rubro: string;
    active: boolean;
    contactDay: string;
  } = {
    name: '',
    fanpage: '',
    plan: '',
    country: '',
    sexo: '',
    edad: null,
    collectedBy: '',
    rubro: '',
    active: true,
    contactDay: '',
  };

  newClient: {
    executiveId: string;
    name: string;
    fanpage: string;
    plan: string;
    country: string;
    sexo: string;
    edad: number | null;
    collectedBy: string;
    rubro: string;
    active: boolean;
    contactDay: string;
  } = {
    executiveId: '',
    name: '',
    fanpage: '',
    plan: '',
    country: '',
    sexo: '',
    edad: null,
    collectedBy: '',
    rubro: '',
    active: true,
    contactDay: '',
  };

  constructor(
    private executivesService: ExecutivesService,
    private auth: AuthService,
    private configService: ConfigService,
    private extras: ClientExtrasService,
    private viewBuilder: ClientViewBuilder,
  ) {}

  get isAdmin(): boolean {
    return this.auth.isAdmin();
  }

  get canAddClients(): boolean {
    return this.isAdmin || !!this.auth.getUser()?.executiveId;
  }

  ngOnInit(): void {
    this.rows$ = this.executivesService.executives$.pipe(map(executives => this.buildRows(executives)));
    this.executivesService.executives$.subscribe(executives => (this.executives = executives));

    this.filteredRows$ = combineLatest([this.rows$, this.searchSubject]).pipe(
      map(([rows, search]) => {
        const term = search.trim().toLowerCase();
        if (!term) return rows;
        return rows.filter(
          row =>
            row.client.name.toLowerCase().includes(term) ||
            row.executiveName.toLowerCase().includes(term)
        );
      })
    );

    this.configService.plans$.subscribe(plans => (this.plans = plans));
    this.configService.rubros$.subscribe(rubros => (this.rubros = rubros));

    this.executivesService.refresh();
    this.configService.refresh();
  }

  private buildRows(executives: Executive[]): ClientCardItem[] {
    const rows: ClientCardItem[] = [];
    executives.forEach(exec => {
      exec.clients.forEach(client => {
        // Clientes dados de baja (soft delete) siguen viajando desde el
        // backend para que Cobros pueda mostrar su historial, pero no
        // corresponde listarlos acá.
        if (client.deletedAt) return;
        rows.push({ client, executiveName: exec.name, squad: exec.squad });
      });
    });
    return rows;
  }

  get selectedFields(): { label: string; value: unknown }[] {
    if (!this.selectedItem) return [];
    const client = this.selectedItem.client;

    // Campos tipados destacados, en su orden definido.
    const typed = CLIENT_DETAIL_FIELDS.map(field => ({
      label: field.label,
      value: client[field.key],
    }));

    // Resto de columnas crudas del archivo importado (data) que no estén ya cubiertas.
    const known = new Set(
      CLIENT_DETAIL_FIELDS.map(field => String(field.label).toLowerCase()),
    );
    const raw = Object.entries(client.data ?? {})
      .filter(([label]) => !known.has(String(label).toLowerCase()))
      .map(([label, value]) => ({ label, value }));

    return [...typed, ...raw].filter(
      field =>
        field.value !== null &&
        field.value !== undefined &&
        String(field.value).trim() !== '',
    );
  }

  cardName(client: Client): string {
    if (client.fanpage && client.fanpage.trim()) return client.fanpage.trim();

    // Fallback: la fanpage puede venir solo en las columnas crudas importadas.
    const entry = Object.entries(client.data ?? {}).find(([label]) =>
      /fan\s*page/i.test(label),
    );
    const fromData = entry ? String(entry[1] ?? '').trim() : '';
    if (fromData) return fromData;

    return client.name;
  }

  selectItem(item: ClientCardItem): void {
    this.selectedItem = item;
    this.editMode = false;
    this.editError = '';
    this.editSuccess = '';
    this.activeTab = 'resumen';
    this.statusMenuOpen = false;
    this.editingLink = false;
    this.linkDraft = this.extras.get(item.client.id).linkOverride ?? '';
    this.notesDraft = this.extras.get(item.client.id).notes ?? '';
    this.notesSaved = false;
    this.newTodoText = '';
  }

  // --- Vista enriquecida (avatar, estado, salud de pago, historial) ---

  viewFor(item: ClientCardItem): ClientCardView {
    return this.viewBuilder.build(item.client, item.executiveName, item.squad, this.plans);
  }

  pendingTodosFor(clientId: string): number {
    return this.extras.get(clientId).todos.filter(t => !t.done).length;
  }

  onImageChanged(event: { id: string; url: string }): void {
    this.executivesService.updateClientImage(event.id, event.url);
  }

  onDetailImageSelected(event: Event): void {
    if (!this.selectedItem) return;
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    const clientId = this.selectedItem.client.id;
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      this.executivesService.updateClientImage(clientId, url);
      // rows$/filteredRows$ se refrescan solos vía el observable, pero
      // selectedItem es un campo propio: se actualiza a mano para que el
      // avatar grande de la ficha muestre la foto nueva al toque.
      if (this.selectedItem?.client.id === clientId) {
        this.selectedItem = { ...this.selectedItem, client: { ...this.selectedItem.client, imageUrl: url } };
      }
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  get selectedView(): ClientCardView | null {
    return this.selectedItem ? this.viewFor(this.selectedItem) : null;
  }

  get selectedTodos(): TodoItem[] {
    return this.selectedItem ? this.extras.get(this.selectedItem.client.id).todos : [];
  }

  get selectedDoneTodosCount(): number {
    return this.selectedTodos.filter(t => t.done).length;
  }

  toggleStatusMenu(): void {
    this.statusMenuOpen = !this.statusMenuOpen;
  }

  setStatus(status: ClientStatus): void {
    if (!this.selectedItem || !this.selectedView) return;
    const clear = status === this.selectedView.status;
    this.extras.setStatus(this.selectedItem.client.id, clear ? null : status);
    this.statusMenuOpen = false;
  }

  addTodo(): void {
    if (!this.selectedItem) return;
    this.extras.addTodo(this.selectedItem.client.id, this.newTodoText);
    this.newTodoText = '';
  }

  onTodoKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') this.addTodo();
  }

  toggleTodo(todoId: string): void {
    if (!this.selectedItem) return;
    this.extras.toggleTodo(this.selectedItem.client.id, todoId);
  }

  deleteTodo(todoId: string): void {
    if (!this.selectedItem) return;
    this.extras.deleteTodo(this.selectedItem.client.id, todoId);
  }

  saveNotes(): void {
    if (!this.selectedItem) return;
    this.extras.saveNotes(this.selectedItem.client.id, this.notesDraft);
    this.notesSaved = true;
    setTimeout(() => (this.notesSaved = false), 2000);
  }

  startEditLink(): void {
    if (!this.selectedItem) return;
    this.linkDraft = this.extras.get(this.selectedItem.client.id).linkOverride ?? '';
    this.editingLink = true;
  }

  cancelEditLink(): void {
    this.editingLink = false;
  }

  saveLink(): void {
    if (!this.selectedItem) return;
    const trimmed = this.linkDraft.trim();
    this.extras.setLink(this.selectedItem.client.id, trimmed || null);
    this.editingLink = false;
  }

  onLinkKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') this.saveLink();
    if (event.key === 'Escape') this.cancelEditLink();
  }

  startEdit(): void {
    if (!this.selectedItem) return;
    const c = this.selectedItem.client;
    this.editClient = {
      name: c.name ?? '',
      fanpage: c.fanpage ?? '',
      plan: c.plan ?? '',
      country: c.country ?? '',
      sexo: c.sexo ?? '',
      edad: c.edad ?? null,
      collectedBy: c.collectedBy ?? '',
      rubro: c.rubro ?? '',
      active: c.active,
      contactDay: c.contactDay ?? '',
    };
    this.editMode = true;
    this.editError = '';
    this.editSuccess = '';
  }

  cancelEdit(): void {
    this.editMode = false;
    this.editError = '';
    this.editSuccess = '';
  }

  submitEdit(): void {
    if (!this.selectedItem) return;
    if (!this.editClient.collectedBy) {
      this.editError = 'Quién cobra es obligatorio.';
      return;
    }
    this.editSubmitting = true;
    this.editError = '';
    this.editSuccess = '';

    const trimmed = (value: string): string | null => {
      const v = value.trim();
      return v || null;
    };
    const parsedNumber = (value: string | number | null): number | null => {
      // El input es type="number": Angular entrega un number/null real, no un string.
      if (value === null || value === undefined) return null;
      if (typeof value === 'number') return isNaN(value) ? null : value;
      const v = value.trim();
      if (!v) return null;
      const n = Number(v);
      return isNaN(n) ? null : n;
    };

    const payload = {
      name: this.editClient.name.trim() || this.selectedItem.client.name,
      fanpage: trimmed(this.editClient.fanpage),
      plan: trimmed(this.editClient.plan),
      country: trimmed(this.editClient.country),
      sexo: trimmed(this.editClient.sexo),
      edad: parsedNumber(this.editClient.edad),
      collectedBy: trimmed(this.editClient.collectedBy),
      rubro: trimmed(this.editClient.rubro),
      active: this.editClient.active,
      contactDay: this.editClient.contactDay || null,
    };

    this.executivesService.updateClient(this.selectedItem.client.id, payload).subscribe({
      next: () => {
        this.editSubmitting = false;
        this.editSuccess = 'Cliente actualizado.';
        this.editMode = false;
      },
      error: () => {
        this.editSubmitting = false;
        this.editError = 'No se pudo actualizar el cliente. Intentá de nuevo.';
      },
    });
  }

  openDeleteConfirm(): void {
    this.showDeleteConfirm = true;
    this.deleteError = '';
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
    this.deleteError = '';
  }

  confirmDelete(): void {
    if (!this.selectedItem) return;
    this.deleteSubmitting = true;
    this.deleteError = '';

    this.executivesService.deleteClient(this.selectedItem.client.id).subscribe({
      next: () => {
        this.deleteSubmitting = false;
        this.showDeleteConfirm = false;
        this.closeDetail();
      },
      error: () => {
        this.deleteSubmitting = false;
        this.deleteError = 'No se pudo eliminar el cliente. Intentá de nuevo.';
      },
    });
  }

  closeDetail(): void {
    this.selectedItem = null;
    this.editMode = false;
    this.editError = '';
    this.editSuccess = '';
    this.showDeleteConfirm = false;
    this.deleteError = '';
    this.statusMenuOpen = false;
    this.editingLink = false;
  }

  onDetailBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('detail-backdrop')) {
      this.closeDetail();
    }
  }

  onSearch(value: string): void {
    this.searchSubject.next(value);
  }

  toggleForm(): void {
    this.showForm = !this.showForm;
    this.formError = '';
    this.formSuccess = '';
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.toggleForm();
    }
  }

  submitNewClient(): void {
    const name = this.newClient.name.trim();

    if (!name) {
      this.formError = 'El nombre del cliente es obligatorio.';
      return;
    }
    if (!this.newClient.contactDay) {
      this.formError = 'El día de inicio es obligatorio para que el cliente aparezca en Cobros.';
      return;
    }
    if (!this.newClient.collectedBy) {
      this.formError = 'Quién cobra es obligatorio.';
      return;
    }

    this.submitting = true;
    this.formError = '';
    this.formSuccess = '';

    const trimmed = (value: string): string | null => {
      const v = value.trim();
      return v || null;
    };
    const parsedNumber = (value: string | number | null): number | null => {
      // El input es type="number": Angular entrega un number/null real, no un string.
      if (value === null || value === undefined) return null;
      if (typeof value === 'number') return isNaN(value) ? null : value;
      const v = value.trim();
      if (!v) return null;
      const n = Number(v);
      return isNaN(n) ? null : n;
    };

    const payload = {
      name,
      fanpage: trimmed(this.newClient.fanpage),
      plan: trimmed(this.newClient.plan),
      country: trimmed(this.newClient.country),
      sexo: trimmed(this.newClient.sexo),
      edad: parsedNumber(this.newClient.edad),
      collectedBy: trimmed(this.newClient.collectedBy),
      rubro: trimmed(this.newClient.rubro),
      active: this.newClient.active,
      contactDay: this.newClient.contactDay || null,
    };
    const executiveId = this.isAdmin ? this.newClient.executiveId : undefined;

    this.executivesService.createClient(payload, executiveId).subscribe({
      next: () => {
        this.submitting = false;
        this.formSuccess = 'Cliente agregado.';
        this.newClient = {
          executiveId: '',
          name: '',
          fanpage: '',
          plan: '',
          country: '',
          sexo: '',
          edad: null,
          collectedBy: '',
          rubro: '',
          active: true,
          contactDay: '',
        };
      },
      error: () => {
        this.submitting = false;
        this.formError = 'No se pudo agregar el cliente. Intentá de nuevo.';
      },
    });
  }
}
