import { Injectable } from '@angular/core';

// App ID de la app de Meta for Developers (Configuración básica > Identificador de la app).
// No es un secreto: es público y viaja en el HTML del sitio.
const FACEBOOK_APP_ID = '1760896674940471';
const FACEBOOK_SDK_VERSION = 'v21.0';

declare global {
  interface Window {
    fbAsyncInit?: () => void;
    FB?: any;
  }
}

@Injectable({ providedIn: 'root' })
export class FacebookAuthService {
  private sdkReady: Promise<void> | null = null;

  private loadSdk(): Promise<void> {
    if (this.sdkReady) return this.sdkReady;

    this.sdkReady = new Promise((resolve) => {
      window.fbAsyncInit = () => {
        window.FB!.init({
          appId: FACEBOOK_APP_ID,
          cookie: true,
          xfbml: false,
          version: FACEBOOK_SDK_VERSION,
        });
        resolve();
      };

      if (document.getElementById('facebook-jssdk')) return;
      const script = document.createElement('script');
      script.id = 'facebook-jssdk';
      script.src = 'https://connect.facebook.net/es_LA/sdk.js';
      script.async = true;
      script.defer = true;
      document.body.appendChild(script);
    });

    return this.sdkReady;
  }

  /** Abre el popup de login de Facebook y devuelve el access token del usuario. */
  async login(): Promise<string> {
    return this.doLogin('email', false);
  }

  /**
   * Abre el popup de login de Facebook pidiendo el permiso ads_read, para
   * poder traer las campañas de las cuentas publicitarias a las que el
   * usuario tiene acceso. Es un paso aparte del login normal: no hace falta
   * haber entrado con Meta para poder conectar esto.
   */
  async connectAds(): Promise<string> {
    return this.doLogin('ads_read', true);
  }

  private async doLogin(scope: string, rerequest: boolean): Promise<string> {
    await this.loadSdk();

    return new Promise((resolve, reject) => {
      const options: any = { scope, return_scopes: true };
      // Fuerza a mostrar el diálogo de permisos aunque el usuario ya haya
      // pasado por acá antes y en su momento no haya aceptado ads_read.
      if (rerequest) options.auth_type = 'rerequest';

      window.FB!.login((response: any) => {
        if (response.authResponse?.accessToken) {
          resolve(response.authResponse.accessToken);
        } else {
          reject(new Error('El usuario canceló el login con Facebook.'));
        }
      }, options);
    });
  }
}
