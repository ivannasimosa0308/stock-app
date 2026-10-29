import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class StorageService {
  private authService = inject(AuthService);
  private readonly BUCKET_NAME = 'stockflow-media';

  /**
   * Sube una imagen (de producto o avatar de empleado) al Bucket de Supabase Storage.
   * Si el bucket aún no tiene políticas públicas activas en la cuenta de Supabase,
   * devuelve automáticamente un DataURL persistido localmente para garantizar
   * que la demostración visual funcione sin fallos en cualquier entorno.
   */
  async uploadImage(file: File, folder: 'products' | 'employees'): Promise<string> {
    const fileExt = file.name.split('.').pop() || 'png';
    const safeName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

    try {
      const { data, error } = await this.authService.client.storage
        .from(this.BUCKET_NAME)
        .upload(safeName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (!error && data) {
        const { data: publicUrlData } = this.authService.client.storage
          .from(this.BUCKET_NAME)
          .getPublicUrl(data.path);

        if (publicUrlData?.publicUrl) {
          return publicUrlData.publicUrl;
        }
      }
    } catch (err) {
      console.warn('Usando respaldo visual local para la imagen subida:', err);
    }

    // Fallback instantáneo como DataURL Base64 para modo Demo o sin bucket configurado
    return this.fileToDataUrl(file);
  }

  private fileToDataUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }
}
