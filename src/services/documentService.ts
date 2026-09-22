import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * Document Service
 * Handles file uploads and storage for refund attachments
 * For production, this should integrate with Cloudflare R2, AWS S3, or similar
 */

export interface UploadedFile {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedAt: Date;
}

export interface UploadResult {
  success: boolean;
  file?: UploadedFile;
  error?: string;
}

// Allowed file types for security
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/jpg',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

// Maximum file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes

// Upload directory (in production, use cloud storage)
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

/**
 * Ensure upload directory exists
 */
const ensureUploadDir = async (): Promise<void> => {
  try {
    await fs.access(UPLOAD_DIR);
  } catch {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  }
};

/**
 * Generate secure filename
 */
const generateSecureFilename = (originalName: string): string => {
  const ext = path.extname(originalName);
  const basename = path.basename(originalName, ext);
  const timestamp = Date.now();
  const random = crypto.randomBytes(8).toString('hex');
  return `${basename}-${timestamp}-${random}${ext}`;
};

/**
 * Validate file type and size
 */
const validateFile = (file: File): { valid: boolean; error?: string } => {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return { valid: false, error: `Invalid file type: ${file.type}. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}` };
  }
  
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: `File size exceeds limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB` };
  }
  
  return { valid: true };
};

/**
 * Upload file to local storage (for development)
 * In production, replace with cloud storage (R2, S3, etc.)
 */
export const uploadFile = async (file: File): Promise<UploadResult> => {
  try {
    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    // Ensure upload directory exists
    await ensureUploadDir();

    // Generate secure filename
    const secureFilename = generateSecureFilename(file.name);
    const filePath = path.join(UPLOAD_DIR, secureFilename);

    // Convert File to Buffer and save
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(filePath, buffer);

    // Generate file URL (in production, this would be cloud storage URL)
    const fileUrl = `/uploads/${secureFilename}`;

    const uploadedFile: UploadedFile = {
      filename: secureFilename,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      url: fileUrl,
      uploadedAt: new Date(),
    };

    return { success: true, file: uploadedFile };
  } catch (error) {
    console.error('File upload error:', error);
    return { success: false, error: 'Failed to upload file' };
  }
};

/**
 * Delete file from storage
 */
export const deleteFile = async (filename: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const filePath = path.join(UPLOAD_DIR, filename);
    await fs.unlink(filePath);
    return { success: true };
  } catch (error) {
    console.error('File deletion error:', error);
    return { success: false, error: 'Failed to delete file' };
  }
};

/**
 * Get file info
 */
export const getFileInfo = async (filename: string): Promise<UploadedFile | null> => {
  try {
    const filePath = path.join(UPLOAD_DIR, filename);
    const stats = await fs.stat(filePath);
    
    return {
      filename,
      originalName: filename, // Would need to store original name separately in production
      mimeType: 'application/octet-stream', // Would need to store mime type
      size: stats.size,
      url: `/uploads/${filename}`,
      uploadedAt: stats.mtime,
    };
  } catch (error) {
    console.error('Get file info error:', error);
    return null;
  }
};

/**
 * Upload multiple files
 */
export const uploadMultipleFiles = async (files: File[]): Promise<UploadResult[]> => {
  const results = await Promise.all(files.map(file => uploadFile(file)));
  return results;
};

/**
 * For production: Cloud storage integration example
 * This is a template for integrating with Cloudflare R2 or AWS S3
 */
export const uploadToCloudStorage = async (file: File): Promise<UploadResult> => {
  try {
    // Example Cloudflare R2 integration (commented out):
    // const r2 = new R2Bucket({
    //   accountId: process.env.R2_ACCOUNT_ID,
    //   accessKeyId: process.env.R2_ACCESS_KEY_ID,
    //   secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    // });
    // 
    // const secureFilename = generateSecureFilename(file.name);
    // const arrayBuffer = await file.arrayBuffer();
    // 
    // await r2.put(process.env.R2_BUCKET_NAME, secureFilename, arrayBuffer);
    // 
    // return {
    //   success: true,
    //   file: {
    //     filename: secureFilename,
    //     originalName: file.name,
    //     mimeType: file.type,
    //     size: file.size,
    //     url: `https://${process.env.R2_PUBLIC_DOMAIN}/${secureFilename}`,
    //     uploadedAt: new Date(),
    //   }
    // };

    return { success: false, error: 'Cloud storage not configured' };
  } catch (error) {
    console.error('Cloud storage upload error:', error);
    return { success: false, error: 'Failed to upload to cloud storage' };
  }
};