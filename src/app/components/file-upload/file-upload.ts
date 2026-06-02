import { Component } from '@angular/core';
import { Observable } from 'rxjs';
import { ExecutivesService } from '../../services/executives';

@Component({
  selector: 'app-file-upload',
  standalone: false,
  templateUrl: './file-upload.html',
  styleUrl: './file-upload.scss',
})
export class FileUpload {
  fileName = '';
  selectedColumn = '';
  columnOptions$: Observable<string[]>;
  private currentFile: File | null = null;

  constructor(private executivesService: ExecutivesService) {
    this.columnOptions$ = this.executivesService.columnOptions$;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    this.currentFile = input.files[0];
    this.fileName = this.currentFile.name;
    this.selectedColumn = '';
    this.executivesService.clear();
    this.executivesService.parseFile(this.currentFile);
  }

  onColumnChange(col: string): void {
    this.selectedColumn = col;
  }

  onLoad(): void {
    if (!this.currentFile || !this.selectedColumn) return;
    this.executivesService.extractExecutives(this.currentFile, this.selectedColumn);
  }

  onClear(): void {
    this.currentFile = null;
    this.fileName = '';
    this.selectedColumn = '';
    this.executivesService.clear();
  }
}
