import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, Subscription } from 'rxjs';
import { Executive, ExecutivesService } from '../../services/executives';

@Component({
  selector: 'app-executives-list',
  standalone: false,
  templateUrl: './executives-list.html',
  styleUrl: './executives-list.scss',
})
export class ExecutivesList implements OnInit, OnDestroy {
  executives$: Observable<Executive[]>;
  selectedExecutive: Executive | null = null;

  // Alta/edición: showForm abre el modal, formExecutive null = alta.
  showForm = false;
  formExecutive: Executive | null = null;

  executiveToDelete: Executive | null = null;
  deleting = false;
  deleteError = '';

  private sub?: Subscription;

  constructor(private executivesService: ExecutivesService, private cdr: ChangeDetectorRef) {
    this.executives$ = this.executivesService.executives$;
  }

  ngOnInit(): void {
    // Después de un traspaso (o cualquier refresh) el store trae objetos
    // nuevos: se vuelve a resolver el ejecutivo abierto por id para que el
    // modal muestre su cartera actualizada y no la vieja.
    this.sub = this.executives$.subscribe((executives) => {
      if (!this.selectedExecutive) return;
      this.selectedExecutive = executives.find((e) => e.id === this.selectedExecutive!.id) ?? null;
    });
    this.executivesService.refresh();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  onImageChanged(event: { id: string; url: string }): void {
    this.executivesService.updateImage(event.id, event.url);
  }

  openModal(executive: Executive): void {
    this.selectedExecutive = executive;
  }

  closeModal(): void {
    this.selectedExecutive = null;
  }

  openCreate(): void {
    this.formExecutive = null;
    this.showForm = true;
  }

  openEdit(executive: Executive): void {
    this.formExecutive = executive;
    this.showForm = true;
  }

  closeForm(): void {
    this.showForm = false;
    this.formExecutive = null;
  }

  askDelete(executive: Executive): void {
    this.executiveToDelete = executive;
    this.deleteError = '';
  }

  cancelDelete(): void {
    if (this.deleting) return;
    this.executiveToDelete = null;
    this.deleteError = '';
  }

  confirmDelete(): void {
    if (!this.executiveToDelete) return;
    this.deleting = true;
    this.deleteError = '';
    this.executivesService.deleteExecutive(this.executiveToDelete.id).subscribe({
      next: () => {
        this.deleting = false;
        this.executiveToDelete = null;
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.deleting = false;
        this.deleteError =
          typeof err.error?.message === 'string'
            ? err.error.message
            : 'No se pudo eliminar el ejecutivo. Intentá de nuevo.';
        this.cdr.markForCheck();
      },
    });
  }

  onDeleteBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) this.cancelDelete();
  }
}
