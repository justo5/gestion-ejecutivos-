import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { PlanConfig } from './config';

export type LeadStatus = 'nuevo' | 'contactado' | 'convertido' | 'descartado';
export type LeadInversion = 'cero' | 'menos-300' | '300-700' | '700-1500' | 'mas-1500';

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  nuevo: 'Nuevo',
  contactado: 'Contactado',
  convertido: 'Convertido',
  descartado: 'Descartado',
};

// Estados que se pueden elegir a mano: "convertido" solo se alcanza con
// "Convertir en cliente", que además crea el cliente.
export const EDITABLE_LEAD_STATUSES: LeadStatus[] = ['nuevo', 'contactado', 'descartado'];

export const LEAD_INVERSION_LABELS: Record<LeadInversion, string> = {
  cero: 'Nada',
  'menos-300': 'Menos de USD 300',
  '300-700': 'USD 300 a 700',
  '700-1500': 'USD 700 a 1.500',
  'mas-1500': 'Más de USD 1.500',
};

// Solicitud del formulario público de la landing (llega por webhook al
// backend). Todos los textos los escribió una persona cualquiera: se muestran
// siempre con interpolación de Angular, nunca con innerHTML.
export interface Lead {
  id: string;
  externalId: number;
  source: string;
  nombre: string;
  apellido: string;
  contacto: string;
  whatsapp: string;
  rubro: string;
  inversion: LeadInversion;
  planName: string;
  planId: number | null;
  plan: PlanConfig | null;
  consentimientoAt: string;
  status: LeadStatus;
  executiveId: string | null;
  executive: { id: string; name: string } | null;
  clientId: string | null;
  notes: string | null;
  externalCreatedAt: string;
  createdAt: string;
}

// Ejecutivo reducido a lo que necesitan los desplegables de Solicitudes.
export interface ExecutiveOption {
  id: string;
  name: string;
}

export interface LeadFilters {
  status?: LeadStatus | '';
  executiveId?: string;
}

export interface LeadPatch {
  status?: LeadStatus;
  notes?: string | null;
  executiveId?: string | null;
  planId?: number | null;
}

export interface ConvertLeadPayload {
  executiveId?: string;
  planId?: number;
  rubro?: string;
}

@Injectable({
  providedIn: 'root',
})
export class LeadsService {
  private leadsSubject = new BehaviorSubject<Lead[]>([]);
  leads$ = this.leadsSubject.asObservable();

  // Solicitudes en estado "nuevo" visibles para el usuario: alimenta el
  // contador del menú, que se ve desde cualquier página.
  private newCountSubject = new BehaviorSubject<number>(0);
  newCount$ = this.newCountSubject.asObservable();

  // Últimos filtros usados, para que cada refresh tras editar respete lo que
  // el usuario está mirando.
  private filters: LeadFilters = {};

  constructor(private http: HttpClient) {}

  refresh(filters: LeadFilters = this.filters): void {
    this.filters = filters;
    let params = new HttpParams();
    if (filters.status) params = params.set('status', filters.status);
    if (filters.executiveId) params = params.set('executiveId', filters.executiveId);
    this.http.get<Lead[]>('/api/leads', { params }).subscribe(leads => this.leadsSubject.next(leads));
    this.refreshNewCount();
  }

  refreshNewCount(): void {
    this.http
      .get<{ count: number }>('/api/leads/count-new')
      .subscribe(({ count }) => this.newCountSubject.next(count));
  }

  update(leadId: string, patch: LeadPatch): Observable<Lead> {
    return this.http.patch<Lead>(`/api/leads/${leadId}`, patch).pipe(tap(() => this.refresh()));
  }

  convert(leadId: string, payload: ConvertLeadPayload): Observable<unknown> {
    return this.http.post(`/api/leads/${leadId}/convert`, payload).pipe(tap(() => this.refresh()));
  }
}

// Link de WhatsApp: wa.me solo acepta los dígitos (con código de país).
export function whatsappLink(whatsapp: string): string | null {
  const digits = whatsapp.replace(/\D/g, '');
  return digits ? `https://wa.me/${digits}` : null;
}

// Link del "contacto" (web o Instagram). Solo se arman URLs http(s) a partir
// de patrones conocidos; cualquier otra cosa se muestra como texto sin link.
export function contactoLink(contacto: string): string | null {
  const value = contacto.trim();
  if (/^https?:\/\/\S+$/i.test(value)) return value;
  const handle = value.match(/^@([A-Za-z0-9._]{1,30})$/);
  if (handle) return `https://instagram.com/${handle[1]}`;
  if (/^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i.test(value)) return `https://${value}`;
  return null;
}
