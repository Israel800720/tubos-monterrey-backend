import { v2 as cloudinary } from 'cloudinary';
import config from '@/config';
import { CloudinaryUploadResult } from '@/types';

// Configurar Cloudinary
cloudinary.config(config.cloudinary);

export class CloudinaryService {
  // Subir archivo desde buffer
  static async uploadFile(
    buffer: Buffer,
    options: {
      folder?: string;
      public_id?: string;
      resource_type?: 'image' | 'pdf' | 'auto';
      format?: string;
      transformation?: any;
    } = {}
  ): Promise<CloudinaryUploadResult> {
    try {
      const uploadOptions = {
        folder: options.folder || 'tubos-monterrey/solicitudes',
        resource_type: options.resource_type || 'auto',
        use_filename: true,
        unique_filename: true,
        overwrite: false,
        ...options
      };

      return new Promise((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) {
              console.error('Error subiendo archivo a Cloudinary:', error);
              reject(new Error(`Error subiendo archivo: ${error.message}`));
            } else if (result) {
              resolve({
                public_id: result.public_id,
                secure_url: result.secure_url,
                resource_type: result.resource_type,
                format: result.format,
                bytes: result.bytes
              });
            } else {
              reject(new Error('Error desconocido subiendo archivo'));
            }
          }
        ).end(buffer);
      });
    } catch (error) {
      console.error('Error en uploadFile:', error);
      throw new Error('Error interno subiendo archivo');
    }
  }

  // Subir múltiples archivos
  static async uploadMultipleFiles(
    files: { buffer: Buffer; originalName: string; mimeType: string }[],
    folderPrefix: string = 'solicitudes'
  ): Promise<CloudinaryUploadResult[]> {
    const uploadPromises = files.map((file, index) => {
      const folder = `tubos-monterrey/${folderPrefix}`;
      const public_id = `${Date.now()}_${index}_${file.originalName.replace(/\.[^/.]+$/, '')}`;
      
      return this.uploadFile(file.buffer, {
        folder,
        public_id,
        resource_type: file.mimeType.startsWith('image/') ? 'image' : 'auto'
      });
    });

    try {
      return await Promise.all(uploadPromises);
    } catch (error) {
      console.error('Error subiendo múltiples archivos:', error);
      throw new Error('Error subiendo algunos archivos');
    }
  }

  // Subir PDF generado
  static async uploadPDF(
    pdfBuffer: Buffer,
    filename: string,
    folder: string = 'pdfs'
  ): Promise<CloudinaryUploadResult> {
    return this.uploadFile(pdfBuffer, {
      folder: `tubos-monterrey/${folder}`,
      public_id: filename.replace('.pdf', ''),
      resource_type: 'image', // Cloudinary maneja PDFs como imágenes
      format: 'pdf'
    });
  }

  // Eliminar archivo
  static async deleteFile(publicId: string): Promise<boolean> {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result.result === 'ok';
    } catch (error) {
      console.error('Error eliminando archivo de Cloudinary:', error);
      return false;
    }
  }

  // Eliminar múltiples archivos
  static async deleteMultipleFiles(publicIds: string[]): Promise<{
    deleted: string[];
    failed: string[];
  }> {
    const deleted: string[] = [];
    const failed: string[] = [];

    const deletePromises = publicIds.map(async (publicId) => {
      try {
        const success = await this.deleteFile(publicId);
        if (success) {
          deleted.push(publicId);
        } else {
          failed.push(publicId);
        }
      } catch (error) {
        failed.push(publicId);
      }
    });

    await Promise.all(deletePromises);
    
    return { deleted, failed };
  }

  // Obtener información de archivo
  static async getFileInfo(publicId: string): Promise<any> {
    try {
      return await cloudinary.api.resource(publicId);
    } catch (error) {
      console.error('Error obteniendo información de archivo:', error);
      return null;
    }
  }

  // Generar URL firmada para descarga
  static generateDownloadUrl(
    publicId: string,
    options: {
      expires?: number; // Timestamp de expiración
      transformation?: any;
    } = {}
  ): string {
    const defaultOptions = {
      sign_url: true,
      expires_at: options.expires || Math.floor(Date.now() / 1000) + (60 * 60 * 24), // 24 horas
      ...options
    };

    return cloudinary.url(publicId, defaultOptions);
  }

  // Optimizar imagen
  static generateOptimizedImageUrl(
    publicId: string,
    options: {
      width?: number;
      height?: number;
      quality?: string | number;
      format?: string;
    } = {}
  ): string {
    const transformation = {
      fetch_format: 'auto',
      quality: 'auto',
      ...options
    };

    return cloudinary.url(publicId, { transformation });
  }

  // Crear ZIP de archivos para descarga
  static async createArchiveDownload(
    publicIds: string[],
    archiveName: string = 'archivos_solicitud'
  ): Promise<string> {
    try {
      const result = await cloudinary.utils.archive_params({
        type: 'upload',
        target_format: 'zip',
        public_ids: publicIds,
        flatten_folders: true,
        skip_transformation_name: true,
        allow_missing: true
      });

      // Generar URL del archivo ZIP
      return cloudinary.utils.finalize_source_url(
        `${archiveName}.zip`,
        result
      );
    } catch (error) {
      console.error('Error creando archivo ZIP:', error);
      throw new Error('Error creando archivo de descarga');
    }
  }

  // Validar tipo de archivo
  static validateFileType(mimeType: string): boolean {
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'application/pdf'
    ];

    return allowedTypes.includes(mimeType);
  }

  // Validar tamaño de archivo
  static validateFileSize(sizeInBytes: number, maxSizeMB: number = 10): boolean {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    return sizeInBytes <= maxSizeBytes;
  }

  // Obtener estadísticas de uso
  static async getUsageStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    byResourceType: Record<string, number>;
  }> {
    try {
      const result = await cloudinary.api.resources({
        type: 'upload',
        prefix: 'tubos-monterrey/',
        max_results: 500
      });

      const stats = {
        totalFiles: result.resources.length,
        totalSize: result.resources.reduce((sum: number, resource: any) => sum + (resource.bytes || 0), 0),
        byResourceType: result.resources.reduce((acc: Record<string, number>, resource: any) => {
          acc[resource.resource_type] = (acc[resource.resource_type] || 0) + 1;
          return acc;
        }, {})
      };

      return stats;
    } catch (error) {
      console.error('Error obteniendo estadísticas de Cloudinary:', error);
      return {
        totalFiles: 0,
        totalSize: 0,
        byResourceType: {}
      };
    }
  }

  // Limpiar archivos antiguos
  static async cleanupOldFiles(daysOld: number = 30): Promise<{
    deleted: number;
    errors: number;
  }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await cloudinary.api.resources({
        type: 'upload',
        prefix: 'tubos-monterrey/',
        created_at: { lte: cutoffDate.toISOString() },
        max_results: 100
      });

      const publicIds = result.resources.map((resource: any) => resource.public_id);
      
      if (publicIds.length === 0) {
        return { deleted: 0, errors: 0 };
      }

      const deleteResult = await this.deleteMultipleFiles(publicIds);
      
      return {
        deleted: deleteResult.deleted.length,
        errors: deleteResult.failed.length
      };
    } catch (error) {
      console.error('Error limpiando archivos antiguos:', error);
      return { deleted: 0, errors: 1 };
    }
  }
}

export default CloudinaryService;
