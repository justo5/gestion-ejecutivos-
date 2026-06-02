import { NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { provideHttpClient } from '@angular/common/http';

import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { FileUpload } from './components/file-upload/file-upload';
import { ExecutiveCard } from './components/executive-card/executive-card';
import { ExecutivesList } from './components/executives-list/executives-list';
import { ClientModal } from './components/client-modal/client-modal';

@NgModule({
  declarations: [App, FileUpload, ExecutiveCard, ExecutivesList, ClientModal],
  imports: [BrowserModule, AppRoutingModule, FormsModule],
  providers: [provideBrowserGlobalErrorListeners(), provideHttpClient()],
  bootstrap: [App],
})
export class AppModule {}
