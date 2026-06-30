import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from '../../services/auth';
import { CLIENT_DETAIL_FIELDS, Client, Executive, ExecutivesService } from '../../services/executives';

@Component({
  selector: 'app-ejecutivos-page',
  standalone: false,
  templateUrl: './ejecutivos-page.html',
  styleUrl: './ejecutivos-page.scss',
})
export class EjecutivosPage implements OnInit {
  executive$!: Observable<Executive | null>;
  selectedClient: Client | null = null;

  constructor(private auth: AuthService, private executivesService: ExecutivesService) {}

  get isAdmin(): boolean {
    return this.auth.isAdmin();
  }

  ngOnInit(): void {
    if (!this.isAdmin) {
      const executiveId = this.auth.getUser()?.executiveId ?? null;
      this.executive$ = this.executivesService.executives$.pipe(
        map(executives => executives.find(exec => exec.id === executiveId) ?? null)
      );
      this.executivesService.refresh();
    }
  }

  get selectedFields(): { label: string; value: unknown }[] {
    if (!this.selectedClient) return [];
    const client = this.selectedClient;
    return CLIENT_DETAIL_FIELDS.map(field => ({
      label: field.label,
      value: client[field.key],
    })).filter(field => field.value !== null && field.value !== undefined && field.value !== '');
  }

  selectClient(client: Client): void {
    this.selectedClient = client;
  }

  closeDetail(): void {
    this.selectedClient = null;
  }

  onDetailBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('detail-backdrop')) {
      this.closeDetail();
    }
  }
}
