import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { Client, Executive, ExecutivesService } from '../../services/executives';
import { clientDisplayName } from '../../utils/client-display-name';

export interface BajaItem {
  client: Client;
  executiveName: string;
  deletedAt: string;
}

// Sección "Bajas": clientes dados de baja (soft delete), con su motivo. Desde
// acá se puede cargar/editar el motivo, corregir la fecha de baja y eliminar la
// baja: reactivando al cliente o borrándolo definitivamente del sistema.
@Component({
  selector: 'app-bajas',
  standalone: false,
  templateUrl: './bajas.html',
  styleUrl: './bajas.scss',
})
export class Bajas implements OnInit {
  rows$!: Observable<BajaItem[]>;
  filteredRows$!: Observable<BajaItem[]>;

  private searchSubject = new BehaviorSubject<string>('');

  // Estado de edición/confirmación por id de cliente (no por fila), así el
  // refresh() que sigue a cada guardado no pisa lo que se está haciendo en
  // otra fila.
  editingId: string | null = null;
  editDate = '';
  editReason = '';
  saving = false;
  editError = '';

  confirmRemoveId: string | null = null;
  // 'choose': reactivar o borrar. 'permanent': confirmación del borrado definitivo.
  removeStep: 'choose' | 'permanent' = 'choose';
  removing = false;
  removeError = '';

  // Tope del input de fecha: una baja no puede ser a futuro.
  readonly today = Bajas.toInputDate(new Date());

  constructor(private executivesService: ExecutivesService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.rows$ = this.executivesService.executives$.pipe(map(executives => this.buildRows(executives)));

    this.filteredRows$ = combineLatest([this.rows$, this.searchSubject]).pipe(
      map(([rows, search]) => {
        const term = search.trim().toLowerCase();
        if (!term) return rows;
        return rows.filter(
          row =>
            row.client.name.toLowerCase().includes(term) ||
            clientDisplayName(row.client).toLowerCase().includes(term) ||
            row.executiveName.toLowerCase().includes(term) ||
            (row.client.deletedReason ?? '').toLowerCase().includes(term)
        );
      })
    );

    this.executivesService.refresh();
  }

  // Bajas más recientes primero.
  private buildRows(executives: Executive[]): BajaItem[] {
    const rows: BajaItem[] = [];
    executives.forEach(exec => {
      exec.clients.forEach(client => {
        if (!client.deletedAt) return;
        rows.push({ client, executiveName: exec.name, deletedAt: client.deletedAt });
      });
    });
    return rows.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
  }

  // Date -> 'YYYY-MM-DD' en hora local, el formato que espera <input type="date">.
  private static toInputDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  cardName(client: Client): string {
    return clientDisplayName(client);
  }

  dateLabel(deletedAt: string): string {
    return new Date(deletedAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' }).replace('.', '');
  }

  onSearch(value: string): void {
    this.searchSubject.next(value);
  }

  // --- Editar fecha / motivo ---

  startEdit(item: BajaItem): void {
    this.editingId = item.client.id;
    this.editDate = Bajas.toInputDate(new Date(item.deletedAt));
    this.editReason = item.client.deletedReason ?? '';
    this.editError = '';
    this.confirmRemoveId = null;
  }

  cancelEdit(): void {
    this.editingId = null;
    this.editError = '';
  }

  saveEdit(item: BajaItem): void {
    if (!this.editDate) {
      this.editError = 'La fecha de baja es obligatoria.';
      return;
    }
    if (this.editDate > this.today) {
      this.editError = 'La fecha de baja no puede ser futura.';
      return;
    }
    this.saving = true;
    this.editError = '';
    this.executivesService
      .updateBaja(item.client.id, { deletedAt: this.editDate, deletedReason: this.editReason.trim() || null })
      .subscribe({
        next: () => {
          this.saving = false;
          this.editingId = null;
          this.cdr.markForCheck();
        },
        error: () => {
          this.saving = false;
          this.editError = 'No se pudo guardar la baja. Intentá de nuevo.';
          this.cdr.markForCheck();
        },
      });
  }

  // --- Eliminar la baja: reactivar al cliente o borrarlo definitivamente ---

  askRemove(item: BajaItem): void {
    this.confirmRemoveId = item.client.id;
    this.removeStep = 'choose';
    this.removeError = '';
    this.editingId = null;
  }

  cancelRemove(): void {
    this.confirmRemoveId = null;
    this.removeStep = 'choose';
    this.removeError = '';
  }

  // Pasa a la confirmación del borrado definitivo (irreversible).
  askPermanentRemove(): void {
    this.removeStep = 'permanent';
    this.removeError = '';
  }

  backToChoose(): void {
    this.removeStep = 'choose';
    this.removeError = '';
  }

  // El cliente vuelve a estar activo en Clientes y Cobros.
  confirmRestore(item: BajaItem): void {
    this.runRemoval(this.executivesService.removeBaja(item.client.id), 'No se pudo reactivar el cliente. Intentá de nuevo.');
  }

  // El cliente se borra del sistema junto con su historial de cobros.
  confirmPermanentRemove(item: BajaItem): void {
    this.runRemoval(
      this.executivesService.deleteClientPermanently(item.client.id),
      'No se pudo eliminar el cliente. Intentá de nuevo.',
    );
  }

  private runRemoval(request: Observable<void>, errorMessage: string): void {
    this.removing = true;
    this.removeError = '';
    request.subscribe({
      next: () => {
        this.removing = false;
        this.confirmRemoveId = null;
        this.removeStep = 'choose';
        this.cdr.markForCheck();
      },
      error: () => {
        this.removing = false;
        this.removeError = errorMessage;
        this.cdr.markForCheck();
      },
    });
  }
}
