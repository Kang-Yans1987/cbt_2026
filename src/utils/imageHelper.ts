const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB input limit before compression
const SHEETS_CELL_SAFE_LENGTH = 45000;

export async function compressImageFileToDataUrl(
  file: File,
  options: { maxDimension: number; quality?: number; preserveTransparency?: boolean }
): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('File harus berupa gambar (PNG, JPG, WebP, atau SVG).');
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error('Ukuran file gambar terlalu besar (maksimal 10 MB).');
  }

  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.readAsDataURL(file);
  });

  // Load into an Image element to resize cleanly
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () =>
      reject(new Error('Format gambar rusak atau tidak didukung oleh browser.'));
    el.src = rawDataUrl;
  });

  const maxDim = options.maxDimension;
  let width = img.naturalWidth || img.width;
  let height = img.naturalHeight || img.height;

  if (width > maxDim || height > maxDim) {
    if (width >= height) {
      height = Math.round((height / width) * maxDim);
      width = maxDim;
    } else {
      width = Math.round((width / height) * maxDim);
      height = maxDim;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, width);
  canvas.height = Math.max(1, height);
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Browser tidak mendukung pemrosesan gambar kanvas.');
  }

  if (!options.preserveTransparency) {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  const mime = options.preserveTransparency ? 'image/png' : 'image/jpeg';
  let quality = options.quality ?? 0.82;
  let result = canvas.toDataURL(mime, quality);

  // If still too large for a Google Sheets cell, progressively compress as JPEG
  while (result.length > SHEETS_CELL_SAFE_LENGTH && quality > 0.35) {
    quality -= 0.12;
    result = canvas.toDataURL('image/jpeg', quality);
  }

  if (result.length > SHEETS_CELL_SAFE_LENGTH) {
    const smallCanvas = document.createElement('canvas');
    smallCanvas.width = Math.max(1, Math.round(canvas.width * 0.65));
    smallCanvas.height = Math.max(1, Math.round(canvas.height * 0.65));
    const sCtx = smallCanvas.getContext('2d');
    if (sCtx) {
      sCtx.fillStyle = '#FFFFFF';
      sCtx.fillRect(0, 0, smallCanvas.width, smallCanvas.height);
      sCtx.drawImage(canvas, 0, 0, smallCanvas.width, smallCanvas.height);
      result = smallCanvas.toDataURL('image/jpeg', 0.72);
    }
  }

  return result;
}
