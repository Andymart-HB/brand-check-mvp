import type { FileValidationResult } from '../types';

export class FileValidator {
  private readonly MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
  private readonly SUPPORTED_TYPES = {
    'application/pdf': {
      extensions: ['pdf'],
      magicBytes: [0x25, 0x50, 0x44, 0x46] // %PDF
    },
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': {
      extensions: ['docx'],
      magicBytes: [0x50, 0x4B, 0x03, 0x04] // PK..
    },
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': {
      extensions: ['pptx'],
      magicBytes: [0x50, 0x4B, 0x03, 0x04] // PK..
    }
  };

  async validate(file: File): Promise<FileValidationResult> {
    // Check file size
    if (file.size > this.MAX_FILE_SIZE) {
      return {
        isValid: false,
        mimeType: file.type,
        magicBytes: false,
        error: `File size exceeds maximum limit of ${this.formatFileSize(this.MAX_FILE_SIZE)}`
      };
    }

    // Check MIME type
    if (!this.SUPPORTED_TYPES[file.type]) {
      const extension = file.name.split('.').pop()?.toLowerCase() || '';
      return {
        isValid: false,
        mimeType: file.type,
        magicBytes: false,
        error: `Unsupported file format: .${extension}. Please use PDF, DOCX, or PPTX files.`
      };
    }

    // Verify magic bytes
    const magicBytesValid = await this.verifyMagicBytes(file);
    if (!magicBytesValid) {
      return {
        isValid: false,
        mimeType: file.type,
        magicBytes: false,
        error: 'File appears to be corrupted or misidentified'
      };
    }

    return {
      isValid: true,
      mimeType: file.type,
      magicBytes: true
    };
  }

  private async verifyMagicBytes(file: File): Promise<boolean> {
    const typeInfo = this.SUPPORTED_TYPES[file.type];
    if (!typeInfo) return false;

    try {
      const buffer = await file.slice(0, typeInfo.magicBytes.length).arrayBuffer();
      const bytes = new Uint8Array(buffer);
      
      return typeInfo.magicBytes.every((byte, index) => bytes[index] === byte);
    } catch {
      return false;
    }
  }

  private formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }
}