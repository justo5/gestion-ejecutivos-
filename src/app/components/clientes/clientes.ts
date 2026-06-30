import { Component, OnInit } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { CLIENT_DETAIL_FIELDS, Client, Executive, ExecutivesService } from '../../services/executives';
import { AuthService } from '../../services/auth';
import { ConfigService, PlanConfig } from '../../services/config';

export interface ClientCardItem {
  client: Client;
  executiveName: string;
  squad: string;
}

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

  selectedItem: ClientCardItem | null = null;

  newClient = {
    executiveId: '',
    name: '',
    fanpage: '',
    adAccount: '',
    plan: '',
    country: '',
    usd: '',
    ars: '',
    collectedBy: '',
    active: true,
    contactDay: null as number | null,
  };

  constructor(
    private executivesService: ExecutivesService,
    private auth: AuthService,
    private configService: ConfigService,
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

    this.executivesService.refresh();
    this.configService.refresh();
  }

  private buildRows(executives: Executive[]): ClientCardItem[] {
    const rows: ClientCardItem[] = [];
    executives.forEach(exec => {
      exec.clients.forEach(client => {
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
  }

  closeDetail(): void {
    this.selectedItem = null;
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

    this.submitting = true;
    this.formError = '';
    this.formSuccess = '';

    const trimmed = (value: string): string | null => {
      const v = value.trim();
      return v || null;
    };

    const payload = {
      name,
      fanpage: trimmed(this.newClient.fanpage),
      adAccount: trimmed(this.newClient.adAccount),
      plan: trimmed(this.newClient.plan),
      country: trimmed(this.newClient.country),
      usd: trimmed(this.newClient.usd),
      ars: trimmed(this.newClient.ars),
      collectedBy: trimmed(this.newClient.collectedBy),
      active: this.newClient.active,
      contactDay: this.newClient.contactDay,
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
          adAccount: '',
          plan: '',
          country: '',
          usd: '',
          ars: '',
          collectedBy: '',
          active: true,
          contactDay: null,
        };
      },
      error: () => {
        this.submitting = false;
        this.formError = 'No se pudo agregar el cliente. Intentá de nuevo.';
      },
    });
  }
}
