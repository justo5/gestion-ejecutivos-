import { Injectable, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as XLSX from 'xlsx';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { CollectedBy } from './cobros';

const IMAGES_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/1DgsNhUycGp_-sZBioKlBOP9gZ-RZ_Efwxz-T7nc0f0A/export?format=csv';

export interface CobroInfo {
  planId: number | null;
  collectedBy?: CollectedBy | null;
  collectedByMonth?: Record<string, CollectedBy>;
  paidMonths: string[];
}

export interface Client {
  id: string;
  name: string;
  fanpage: string | null;
  adAccount: string | null;
  plan: string | null;
  country: string | null;
  usd: string | null;
  ars: string | null;
  collectedBy: string | null;
  rubro: string | null;
  active: boolean;
  contactDay: string | null;
  data: Record<string, unknown>;
  cobro: CobroInfo | null;
}

// Campos estáticos del cliente que se muestran en el modal de detalle, en el
// orden en que se renderizan. Cada uno mapea a una columna tipada de la tabla.
export const CLIENT_DETAIL_FIELDS: { key: keyof Client; label: string }[] = [
  { key: 'adAccount', label: 'Cuenta publicitaria' },
  { key: 'fanpage', label: 'Fan page' },
  { key: 'plan', label: 'Plan' },
  { key: 'country', label: 'País' },
  { key: 'usd', label: 'USD' },
  { key: 'ars', label: 'ARS' },
  { key: 'collectedBy', label: 'Quién cobra' },
  { key: 'rubro', label: 'Rubro' },
  { key: 'contactDay', label: 'Día de contacto' },
];

export interface Executive {
  id: string;
  name: string;
  imageUrl: string;
  squad: string;
  clientCount: number;
  activeCount: number;
  clients: Client[];
}

interface ImportClientPayload {
  name: string;
  fanpage: string | null;
  adAccount: string | null;
  plan: string | null;
  country: string | null;
  usd: string | null;
  ars: string | null;
  collectedBy: string | null;
  active: boolean;
  contactDay: string | null;
  data: Record<string, unknown>;
}

interface ImportExecutivePayload {
  name: string;
  imageUrl?: string;
  squad?: string;
  clients: ImportClientPayload[];
}

@Injectable({
  providedIn: 'root',
})
export class ExecutivesService {
  private executivesSubject = new BehaviorSubject<Executive[]>([]);
  executives$ = this.executivesSubject.asObservable();

  private columnOptionsSubject = new BehaviorSubject<string[]>([]);
  columnOptions$ = this.columnOptionsSubject.asObservable();

  constructor(private zone: NgZone, private http: HttpClient) {}

  refresh(): void {
    this.http.get<Executive[]>('/api/executives').subscribe((executives) => {
      this.executivesSubject.next(executives);
    });
  }

  private loadImagesMap() {
    return this.http.get(IMAGES_SHEET_URL, { responseType: 'text' }).pipe(
      map(csvText => {
        const wb = XLSX.read(csvText, { type: 'string' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet);
        const result = new Map<string, string>();
        rows.forEach(row => {
          const keys = Object.keys(row);
          const nameKey = keys.find(k => /ejecutivo|responsable|nombre|name/i.test(k)) ?? keys[0];
          const urlKey = keys.find(k => /url|imagen|image|foto|photo/i.test(k)) ?? keys[1];
          const name = String(row[nameKey] ?? '').trim().toLowerCase();
          const url = String(row[urlKey] ?? '').trim();
          if (name && url) result.set(name, url);
        });
        return result;
      }),
      catchError(() => of(new Map<string, string>()))
    );
  }

  private resolveImage(executiveName: string, imagesMap: Map<string, string>): string {
    const lower = executiveName.toLowerCase();
    const words = lower.split(/\s+/);
    for (const [key, url] of imagesMap) {
      if (lower === key || words.some(w => w === key) || lower.startsWith(key + ' ')) {
        return url;
      }
    }
    return '';
  }

  private rowsToClients(rows: any[]): ImportClientPayload[] {
    if (rows.length === 0) return [];
    const headers = Object.keys(rows[0]);
    const estadoCol = headers.find(h => /estado|status/i.test(h));
    const diaCol = headers.find(h => /^dia$|^d[íi]a$/i.test(h.trim()));
    const fanpageCol = headers.find(h => /fan\s*page/i.test(h));
    const adAccountCol = headers.find(h => /cuenta\s*public|ad\s*account/i.test(h));
    const planCol = headers.find(h => /plan|observaci[óo]n/i.test(h));
    const countryCol = headers.find(h => /pa[íi]s|country/i.test(h));
    const usdCol = headers.find(h => /usd|d[óo]lar/i.test(h));
    const arsCol = headers.find(h => /ars|peso/i.test(h));
    const collectedByCol = headers.find(h => /qui[ée]n\s*cobra|cobra/i.test(h));
    const businessNameCol =
      headers.find(h => /negocio|empresa|business|razón|razon|nombre|cliente/i.test(h)) ??
      fanpageCol ??
      headers[0];

    const text = (row: any, col: string | undefined): string | null => {
      if (!col) return null;
      const value = String(row[col] ?? '').trim();
      return value || null;
    };

    return rows.map((row, idx) => {
      const rawName = String(row[businessNameCol] ?? '').trim();
      const active = estadoCol ? /activo|active/i.test(String(row[estadoCol] ?? '')) : false;
      const diaRaw = diaCol ? String(row[diaCol] ?? '').trim() : '';
      let contactDay: string | null = null;
      if (diaRaw) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(diaRaw)) {
          contactDay = diaRaw;
        } else {
          const dayNum = parseInt(diaRaw, 10);
          if (dayNum >= 1 && dayNum <= 31) {
            const now = new Date();
            const y = now.getFullYear();
            const m = String(now.getMonth() + 1).padStart(2, '0');
            const d = String(dayNum).padStart(2, '0');
            contactDay = `${y}-${m}-${d}`;
          }
        }
      }
      return {
        name: rawName || `Cliente ${idx + 1}`,
        fanpage: text(row, fanpageCol),
        adAccount: text(row, adAccountCol),
        plan: text(row, planCol),
        country: text(row, countryCol),
        usd: text(row, usdCol),
        ars: text(row, arsCol),
        collectedBy: text(row, collectedByCol),
        active,
        contactDay,
        data: row,
      };
    });
  }

  private groupRows(rows: any[], nameColumn: string): ImportExecutivePayload[] {
    if (rows.length === 0) return [];
    const headers = Object.keys(rows[0]);
    const squadCol = headers.find(h => /squad/i.test(h));

    const grouped = new Map<string, any[]>();
    rows.forEach(row => {
      const name = String(row[nameColumn] ?? '').trim();
      if (!name) return;
      if (!grouped.has(name)) grouped.set(name, []);
      grouped.get(name)!.push(row);
    });

    const executives: ImportExecutivePayload[] = [];
    grouped.forEach((groupRows, name) => {
      const squads = squadCol
        ? [...new Set(groupRows.map(r => String(r[squadCol] ?? '').trim()).filter(Boolean))]
        : [];

      executives.push({ name, squad: squads.join(' / '), clients: this.rowsToClients(groupRows) });
    });

    return executives;
  }

  parseFile(file: File): void {
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      this.zone.run(() => {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        if (rows.length === 0) return;
        const headers: string[] = rows[0].map((h: any) => String(h).trim());
        this.columnOptionsSubject.next(headers);
      });
    };
    reader.readAsArrayBuffer(file);
  }

  importFromFile(file: File, nameColumn: string): void {
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      const data = new Uint8Array(e.target!.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet);
      const executives = this.groupRows(rows, nameColumn);

      this.loadImagesMap().subscribe(images => {
        const withImages = executives.map(exec => ({
          ...exec,
          imageUrl: this.resolveImage(exec.name, images),
        }));
        this.http.post('/api/executives/import', { executives: withImages }).subscribe(() => {
          this.zone.run(() => this.refresh());
        });
      });
    };
    reader.readAsArrayBuffer(file);
  }

  createClient(
    payload: {
      name: string;
      fanpage: string | null;
      adAccount: string | null;
      plan: string | null;
      country: string | null;
      usd: string | null;
      ars: string | null;
      collectedBy: string | null;
      rubro: string | null;
      active: boolean;
      contactDay: string | null;
    },
    executiveId?: string,
  ): Observable<Client> {
    const body = executiveId ? { ...payload, executiveId } : payload;
    return this.http.post<Client>('/api/clients', body).pipe(tap(() => this.refresh()));
  }

  updateClient(
    clientId: string,
    payload: {
      name: string;
      fanpage: string | null;
      adAccount: string | null;
      plan: string | null;
      country: string | null;
      usd: string | null;
      ars: string | null;
      collectedBy: string | null;
      rubro: string | null;
      active: boolean;
      contactDay: string | null;
    },
  ): Observable<Client> {
    return this.http.patch<Client>(`/api/clients/${clientId}`, payload).pipe(tap(() => this.refresh()));
  }

  deleteClient(clientId: string): Observable<void> {
    return this.http.delete<void>(`/api/clients/${clientId}`).pipe(tap(() => this.refresh()));
  }

  updateImage(executiveId: string, imageUrl: string): void {
    this.http.patch(`/api/executives/${executiveId}/image`, { imageUrl }).subscribe(() => {
      const current = this.executivesSubject.value.map(exec =>
        exec.id === executiveId ? { ...exec, imageUrl } : exec
      );
      this.executivesSubject.next(current);
    });
  }

  clear(): void {
    this.columnOptionsSubject.next([]);
  }
}
