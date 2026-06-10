import { Injectable, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import * as XLSX from 'xlsx';
import { BehaviorSubject, forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

export interface Executive {
  name: string;
  imageUrl: string;
  squad: string;
  clientCount: number;
  activeCount: number;
  clients: any[];
}

const SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/1_MJf38cfLyzz7PyVYfK8Y8EntrpQ8wCGaNXvGYxddeI/export?format=csv';

const IMAGES_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/1DgsNhUycGp_-sZBioKlBOP9gZ-RZ_Efwxz-T7nc0f0A/export?format=csv';

@Injectable({
  providedIn: 'root',
})
export class ExecutivesService {
  private executivesSubject = new BehaviorSubject<Executive[]>([]);
  executives$ = this.executivesSubject.asObservable();

  private columnOptionsSubject = new BehaviorSubject<string[]>([]);
  columnOptions$ = this.columnOptionsSubject.asObservable();

  constructor(private zone: NgZone, private http: HttpClient) {}

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

  loadFromGoogleSheets(): void {
    forkJoin({
      csv: this.http.get(SHEET_CSV_URL, { responseType: 'text' }),
      images: this.loadImagesMap(),
    }).subscribe(({ csv, images }) => {
      this.zone.run(() => {
        const workbook = XLSX.read(csv, { type: 'string' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet);
        if (rows.length === 0) return;

        const headers = Object.keys(rows[0]);
        const nameCol =
          headers.find(h => /ejecutivo|responsable|asesor/i.test(h)) ?? headers[0];
        const squadCol = headers.find(h => /squad/i.test(h));
        const estadoCol = headers.find(h => /estado|status/i.test(h));

        const grouped = new Map<string, any[]>();
        rows.forEach(row => {
          const name = String(row[nameCol] ?? '').trim();
          if (!name) return;
          if (!grouped.has(name)) grouped.set(name, []);
          grouped.get(name)!.push(row);
        });

        const executives: Executive[] = [];
        grouped.forEach((groupRows, name) => {
          const squads = squadCol
            ? [...new Set(groupRows.map(r => String(r[squadCol] ?? '').trim()).filter(Boolean))]
            : [];
          const activeCount = estadoCol
            ? groupRows.filter(r => /activo|active/i.test(String(r[estadoCol]))).length
            : groupRows.length;

          executives.push({
            name,
            imageUrl: this.resolveImage(name, images),
            squad: squads.join(' / '),
            clientCount: groupRows.length,
            activeCount,
            clients: groupRows,
          });
        });

        this.executivesSubject.next(executives);
      });
    });
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

  extractExecutives(file: File, nameColumn: string): void {
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      const data = new Uint8Array(e.target!.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet);

      const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
      const squadCol = headers.find(h => /squad/i.test(h));
      const estadoCol = headers.find(h => /estado|status/i.test(h));

      const grouped = new Map<string, any[]>();
      rows.forEach(row => {
        const name = String(row[nameColumn] ?? '').trim();
        if (!name) return;
        if (!grouped.has(name)) grouped.set(name, []);
        grouped.get(name)!.push(row);
      });

      const executives: Executive[] = [];
      grouped.forEach((groupRows, name) => {
        const squads = squadCol
          ? [...new Set(groupRows.map(r => String(r[squadCol] ?? '').trim()).filter(Boolean))]
          : [];
        const activeCount = estadoCol
          ? groupRows.filter(r => /activo|active/i.test(String(r[estadoCol]))).length
          : groupRows.length;

        executives.push({
          name,
          imageUrl: '',
          squad: squads.join(' / '),
          clientCount: groupRows.length,
          activeCount,
          clients: groupRows,
        });
      });

      this.loadImagesMap().subscribe(images => {
        this.zone.run(() => {
          this.executivesSubject.next(
            executives.map(exec => ({ ...exec, imageUrl: this.resolveImage(exec.name, images) }))
          );
        });
      });
    };
    reader.readAsArrayBuffer(file);
  }

  updateImage(index: number, imageUrl: string): void {
    const current = [...this.executivesSubject.value];
    current[index] = { ...current[index], imageUrl };
    this.executivesSubject.next(current);
  }

  clear(): void {
    this.executivesSubject.next([]);
    this.columnOptionsSubject.next([]);
  }
}
