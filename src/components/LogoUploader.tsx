'use client';

import { useState, useRef, ChangeEvent } from 'react';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { storage, db } from '@/lib/firebase';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];

type LogoUploaderProps = {
  companyId: string;
  currentLogoUrl?: string;
  currentLogoPath?: string;
  onUploadSuccess: (logoUrl: string, logoPath: string) => void;
  onDeleteSuccess: () => void;
};

export default function LogoUploader({
  companyId,
  currentLogoUrl,
  currentLogoPath,
  onUploadSuccess,
  onDeleteSuccess,
}: LogoUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentLogoUrl || null);

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return 'Bitte wählen Sie ein Bild (JPG, PNG, WebP oder SVG).';
    }
    if (file.size > MAX_FILE_SIZE) {
      return 'Datei zu groß. Maximal 2 MB erlaubt.';
    }
    return null;
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);

    // Validacija
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsUploading(true);

    try {
      // Preview takoj (preden gre v Storage)
      const localPreview = URL.createObjectURL(file);
      setPreviewUrl(localPreview);

      // Določi extension (npr. "png", "jpg")
      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const storagePath = `companies/${companyId}/logo.${ext}`;

      // Če obstaja star logo z drugačnim ext, ga pobriši
      if (currentLogoPath && currentLogoPath !== storagePath) {
        try {
          await deleteObject(ref(storage, currentLogoPath));
        } catch {
          // Stara datoteka morda ne obstaja več — ne crashaj
        }
      }

      // Upload nove datoteke
      const storageRef = ref(storage, storagePath);
      await uploadBytes(storageRef, file, {
        contentType: file.type,
      });

      // Pridobi javni URL
      const downloadUrl = await getDownloadURL(storageRef);

      // Shrani v Firestore
      await updateDoc(doc(db, 'companies', companyId), {
        logoUrl: downloadUrl,
        logoStoragePath: storagePath,
      });

      // Obvesti parent
      onUploadSuccess(downloadUrl, storagePath);
      setPreviewUrl(downloadUrl);
    } catch (err) {
      console.error('Upload error:', err);
      const message = err instanceof Error ? err.message : 'Upload fehlgeschlagen.';
      setError(`Upload fehlgeschlagen: ${message}`);
      setPreviewUrl(currentLogoUrl || null);
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async () => {
    if (!currentLogoPath) return;

    const confirmed = window.confirm('Logo wirklich löschen?');
    if (!confirmed) return;

    setIsDeleting(true);
    setError(null);

    try {
      // Pobriši iz Storage
      await deleteObject(ref(storage, currentLogoPath));

      // Pobriši URL v Firestore
      await updateDoc(doc(db, 'companies', companyId), {
        logoUrl: '',
        logoStoragePath: '',
      });

      setPreviewUrl(null);
      onDeleteSuccess();
    } catch (err) {
      console.error('Delete error:', err);
      setError('Löschen fehlgeschlagen.');
    } finally {
      setIsDeleting(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div>
      <label className="block text-sm font-medium mb-2 text-slate-300">
        Firmenlogo
      </label>

      {previewUrl ? (
        // ───── PREVIEW MODE ─────
        <div className="bg-slate-900 border border-slate-700 rounded-md p-4">
          <div className="flex flex-col md:flex-row gap-4 items-start">
            <div className="bg-white rounded-md p-3 flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Firmenlogo"
                className="max-w-[120px] max-h-[120px] object-contain"
              />
            </div>
            <div className="flex-1 space-y-2">
              <p className="text-sm text-slate-300">
                Logo erfolgreich hochgeladen.
              </p>
              <p className="text-xs text-slate-500">
                Es erscheint auf allen PDF-Rechnungen.
              </p>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={triggerFileInput}
                  disabled={isUploading || isDeleting}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-md transition-colors disabled:opacity-50"
                >
                  Ändern
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isUploading || isDeleting}
                  className="px-3 py-1.5 bg-red-900/40 hover:bg-red-900/60 text-red-200 text-sm rounded-md transition-colors disabled:opacity-50"
                >
                  {isDeleting ? 'Wird gelöscht...' : 'Löschen'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // ───── EMPTY STATE / UPLOAD ZONE ─────
        <button
          type="button"
          onClick={triggerFileInput}
          disabled={isUploading}
          className="w-full bg-slate-900 border-2 border-dashed border-slate-700 hover:border-blue-500 rounded-md p-8 text-center transition-colors disabled:opacity-50 cursor-pointer"
        >
          <div className="text-4xl mb-2">🖼️</div>
          <p className="text-sm text-slate-300 font-medium mb-1">
            {isUploading ? 'Wird hochgeladen...' : 'Logo hochladen'}
          </p>
          <p className="text-xs text-slate-500">
            Klicken Sie hier oder ziehen Sie ein Bild herein
          </p>
          <p className="text-xs text-slate-500 mt-2">
            JPG, PNG, WebP oder SVG · max. 2 MB
          </p>
        </button>
      )}

      {/* Skriti file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/svg+xml"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Error */}
      {error && (
        <p className="mt-2 text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}