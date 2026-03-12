import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials. Check your .env.local file.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Upload bukti foto pelanggaran ke Supabase Storage
 */
export async function uploadBuktiPelanggaran(
  file: File,
  pelanggaranId: number,
  siswaInfoos: string // "NIS-NAMA" untuk folder organization
): Promise<string> {
  try {
    if (!file) throw new Error('File tidak ditemukan');
    if (!file.type.startsWith('image/')) throw new Error('File harus berupa gambar');
    if (file.size > 5 * 1024 * 1024) throw new Error('Ukuran gambar maksimal 5MB');

    // Generate unique filename: bukti_pelanggaran/{siswa-info}/{timestamp}-{random}.{ext}
    const ext = file.name.split('.').pop() || 'jpg';
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    // const filename = `bukti_pelanggaran/${siswaInfoos}/${timestamp}-${random}.${ext}`;
    const filename = `${timestamp}-${random}.${ext}`;

const { data, error } = await supabase.storage
  .from('pelanggaran')
  .upload(filename, file, {
    cacheControl: '3600',
    upsert: true,
  });

    if (error) throw new Error(error.message);

    // Get public URL
    const { data: publicData } = supabase.storage
      .from('pelanggaran')
      .getPublicUrl(filename);

    return publicData.publicUrl;
  } catch (e: any) {
    console.error('Gagal upload bukti:', e);
    throw new Error(e.message || 'Gagal upload gambar');
  }
}

/**
 * Delete bukti foto dari Supabase Storage
 */
export async function deleteBuktiPelanggaran(publicUrl: string): Promise<void> {
  try {
    if (!publicUrl) return;

    // Extract path from public URL
    // Format: https://xxx.supabase.co/storage/v1/object/public/pelanggaran/bukti_pelanggaran/...
    const urlParts = publicUrl.split('/pelanggaran/');
    if (urlParts.length < 2) return;

    const filePath = urlParts[1];

    const { error } = await supabase.storage
      .from('pelanggaran')
      .remove([filePath]);

    if (error) throw new Error(error.message);
  } catch (e: any) {
    console.error('Gagal delete bukti:', e);
    // Don't throw, just log warning
  }
}
