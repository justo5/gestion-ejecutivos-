import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, combineLatest, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import {
  EDITABLE_LEAD_STATUSES,
  LEAD_INVERSION_LABELS,
  LEAD_STATUS_LABELS,
  Lead,
  LeadPatch,
  ExecutiveOption,
  ExecutiveLeadCount,
  LeadStatus,
  LeadsService,
  contactoLink,
  redesLinks,
  whatsappLink,
} from '../../services/leads';
import { ExecutivesService } from '../../services/executives';
import { ConfigService } from '../../services/config';
import { AuthService } from '../../services/auth';
import { httpErrorMessage } from '../../utils/http-error';

// Tarjeta de la franja de ejecutivos que ve el admin arriba de la lista.
interface ExecutiveSummary {
  id: string;
  name: string;
  imageUrl: string | null;
  total: number;
  nuevo: number;
}

// Sección "Solicitudes": lo que entra por el formulario de la landing de
// Vamos Bien. Todos ven y editan estado/notas de sus solicitudes; el admin
// además asigna ejecutivo y las convierte en cliente.
@Component({
  selector: 'app-solicitudes',
  standalone: false,
  templateUrl: './solicitudes.html',
  styleUrl: './solicitudes.scss',
})
export class Solicitudes implements OnInit {
  leads$!: Observable<Lead[]>;
  executives$!: Observable<ExecutiveOption[]>;
  executiveSummary$!: Observable<ExecutiveSummary[]>;

  readonly statusLabels = LEAD_STATUS_LABELS;
  readonly editableStatuses = EDITABLE_LEAD_STATUSES;
  readonly allStatuses = Object.keys(LEAD_STATUS_LABELS) as LeadStatus[];
  readonly isAdmin: boolean;

  statusFilter: LeadStatus | '' = 'nuevo';
  executiveFilter = '';

  // Estado por id de solicitud (no por fila), así el refresh que sigue a cada
  // guardado no pisa lo que se está haciendo en otra fila.
  editingNotesId: string | null = null;
  notesDraft = '';
  editingRedesId: string | null = null;
  redesDraft = '';
  savingId: string | null = null;
  rowErrors: Record<string, string> = {};

  convertingLead: Lead | null = null;

  constructor(
    private leadsService: LeadsService,
    private executivesService: ExecutivesService,
    private configService: ConfigService,
    auth: AuthService,
    private cdr: ChangeDetectorRef,
  ) {
    this.isAdmin = auth.isAdmin();
  }

  ngOnInit(): void {
    this.leads$ = this.leadsService.leads$;
    this.executives$ = this.executivesService.executives$.pipe(
      map(executives =>
        executives
          .map(e => ({ id: e.id, name: e.name }))
          .sort((a, b) => a.name.localeCompare(b.name, 'es')),
      ),
    );

    if (this.isAdmin) {
      // Los contadores se vuelven a pedir cada vez que cambia la lista (filtro,
      // asignación, conversión), así quedan al día sin otro refresh aparte.
      const counts$ = this.leads$.pipe(
        switchMap(() => this.leadsService.countByExecutive().pipe(catchError(() => of([] as ExecutiveLeadCount[])))),
      );
      this.executiveSummary$ = combineLatest([this.executivesService.executives$, counts$]).pipe(
        map(([executives, counts]) => {
          const byId = new Map(counts.map(c => [c.executiveId, c]));
          return executives
            .map(e => ({
              id: e.id,
              name: e.name,
              imageUrl: e.imageUrl || null,
              total: byId.get(e.id)?.total ?? 0,
              nuevo: byId.get(e.id)?.nuevo ?? 0,
            }))
            .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'es'));
        }),
      );
    }

    this.applyFilters();
    if (this.isAdmin) {
      // Para los desplegables de ejecutivo, plan y rubro (asignar / convertir).
      this.executivesService.refresh();
      this.configService.refresh();
    }
  }

  selectStatus(status: LeadStatus | ''): void {
    if (this.statusFilter === status) return;
    this.statusFilter = status;
    this.applyFilters();
  }

  // Click en una tarjeta de la franja: filtra por ese ejecutivo (otro click lo quita).
  toggleExecutiveFilter(executiveId: string): void {
    this.executiveFilter = this.executiveFilter === executiveId ? '' : executiveId;
    this.applyFilters();
  }

  initials(name: string): string {
    return name
      .split(' ')
      .slice(0, 2)
      .map(w => w[0]?.toUpperCase() ?? '')
      .join('');
  }

  trackByExecutive(_: number, exec: ExecutiveSummary): string {
    return exec.id;
  }

  applyFilters(): void {
    this.leadsService.refresh({
      status: this.statusFilter,
      executiveId: this.isAdmin ? this.executiveFilter : undefined,
    });
  }

  fullName(lead: Lead): string {
    return `${lead.nombre} ${lead.apellido}`;
  }

  dateLabel(iso: string): string {
    return new Date(iso)
      .toLocaleString('es-AR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      .replace('.', '');
  }

  inversionLabel(lead: Lead): string {
    return LEAD_INVERSION_LABELS[lead.inversion] ?? lead.inversion;
  }

  whatsappHref(lead: Lead): string | null {
    return whatsappLink(lead.whatsapp);
  }

  contactoHref(lead: Lead): string | null {
    return contactoLink(lead.contacto);
  }

  // Muchos completan "contacto" con el mismo teléfono que el WhatsApp; en ese
  // caso no se repite. Se comparan solo dígitos y por sufijo, así "+54 9 11…"
  // y "11…" cuentan como el mismo número.
  showContacto(lead: Lead): boolean {
    const contacto = lead.contacto.trim();
    if (!/^[\d\s()+.-]+$/.test(contacto)) return true;
    const c = contacto.replace(/\D/g, '');
    const w = lead.whatsapp.replace(/\D/g, '');
    return !(c && w && (c.endsWith(w) || w.endsWith(c)));
  }

  redesItems(lead: Lead): { text: string; href: string | null }[] {
    return redesLinks(lead.redes);
  }

  // --- Edición en línea ---

  onStatusChange(lead: Lead, status: LeadStatus): void {
    this.save(lead, { status });
  }

  onExecutiveChange(lead: Lead, executiveId: string): void {
    this.save(lead, { executiveId: executiveId || null });
  }

  startNotes(lead: Lead): void {
    this.editingNotesId = lead.id;
    this.notesDraft = lead.notes ?? '';
    delete this.rowErrors[lead.id];
  }

  cancelNotes(): void {
    this.editingNotesId = null;
  }

  saveNotes(lead: Lead): void {
    this.save(lead, { notes: this.notesDraft.trim() || null }, () => (this.editingNotesId = null));
  }

  startRedes(lead: Lead): void {
    this.editingRedesId = lead.id;
    this.redesDraft = lead.redes ?? '';
    delete this.rowErrors[lead.id];
  }

  cancelRedes(): void {
    this.editingRedesId = null;
  }

  saveRedes(lead: Lead): void {
    this.save(lead, { redes: this.redesDraft.trim() || null }, () => (this.editingRedesId = null));
  }

  private save(lead: Lead, patch: LeadPatch, onDone?: () => void): void {
    this.savingId = lead.id;
    delete this.rowErrors[lead.id];
    this.leadsService.update(lead.id, patch).subscribe({
      next: () => {
        this.savingId = null;
        onDone?.();
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.savingId = null;
        this.rowErrors[lead.id] = httpErrorMessage(err, 'No se pudo guardar. Intentá de nuevo.');
        // Vuelve a traer la lista para que los selects muestren el valor real.
        this.leadsService.refresh();
        this.cdr.markForCheck();
      },
    });
  }

  // --- Convertir en cliente ---

  openConvert(lead: Lead): void {
    this.convertingLead = lead;
  }

  closeConvert(): void {
    this.convertingLead = null;
  }

  trackById(_: number, lead: Lead): string {
    return lead.id;
  }
}
