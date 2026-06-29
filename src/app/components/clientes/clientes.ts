import { Component, OnInit } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { Executive, ExecutivesService } from '../../services/executives';
import { AuthService } from '../../services/auth';

export interface ClientRow {
  executiveName: string;
  squad: string;
  clientName: string;
  active: boolean;
}

@Component({
  selector: 'app-clientes',
  standalone: false,
  templateUrl: './clientes.html',
  styleUrl: './clientes.scss',
})
export class Clientes implements OnInit {
  rows$!: Observable<ClientRow[]>;
  filteredRows$!: Observable<ClientRow[]>;

  private searchSubject = new BehaviorSubject<string>('');

  showForm = false;
  formError = '';
  formSuccess = '';
  submitting = false;
  executives: Executive[] = [];

  newClient = {
    executiveId: '',
    name: '',
    active: true,
    contactDay: null as number | null,
  };

  constructor(private executivesService: ExecutivesService, private auth: AuthService) {}

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
            row.clientName.toLowerCase().includes(term) || row.executiveName.toLowerCase().includes(term)
        );
      })
    );

    this.executivesService.refresh();
  }

  private buildRows(executives: Executive[]): ClientRow[] {
    const rows: ClientRow[] = [];
    executives.forEach(exec => {
      exec.clients.forEach(client => {
        rows.push({ executiveName: exec.name, squad: exec.squad, clientName: client.name, active: client.active });
      });
    });
    return rows;
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

    const payload = { name, active: this.newClient.active, contactDay: this.newClient.contactDay };
    const executiveId = this.isAdmin ? this.newClient.executiveId : undefined;

    this.executivesService.createClient(payload, executiveId).subscribe({
      next: () => {
        this.submitting = false;
        this.formSuccess = 'Cliente agregado.';
        this.newClient = { executiveId: '', name: '', active: true, contactDay: null };
      },
      error: () => {
        this.submitting = false;
        this.formError = 'No se pudo agregar el cliente. Intentá de nuevo.';
      },
    });
  }
}
