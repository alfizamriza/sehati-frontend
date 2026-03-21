const fs = require('fs');
const file = 'd:/ALFI/TA/Projek/sehati-frontend/lib/services/Profil.service.ts';
let content = fs.readFileSync(file, 'utf8');

const injection = `
export async function saveFotoUrl(url: string): Promise<string> {
  const patchRes = await api.patch("/profil/foto", { fotoUrl: url });
  if (!patchRes.data?.success) throw new Error("Gagal menyimpan URL foto");

  if (_cache) {
    _cache.data.profil.fotoUrl = url;
    _cache.ts = Date.now();
  }
  return url;
}
`;

content = content.replace('export async function updatePassword', injection + '\nexport async function updatePassword');
fs.writeFileSync(file, content);
console.log('Added saveFotoUrl');
