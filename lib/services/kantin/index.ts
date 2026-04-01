// 1. kantin-dashboard.service
export {
  clearKantinDashboardCache,
  isKantinDashboardCached,
  getKantinDashboard,
  formatRupiah,
  formatRupiahFull,
  formatWaktu,
  labelPayment,
  stokLevel
} from "../kantin-dashboard.service";

export type {
  KantinStatHarian,
  KantinStatMingguan,
  ProdukTerlaris,
  TransaksiTerbaru,
  ProdukStokRendah,
  KantinDashboardData
} from "../kantin-dashboard.service";

// 2. produk.service
export {
  clearProdukCache,
  getAllProduk,
  getStatsProduk,
  getKategoriProduk,
  createProduk,
  updateProduk,
  patchStok,
  resetStokHarian,
  deleteProduk,
  stokStatus,
  stokColor,
  stokPct,
  kemasanLabel,
  titipanPct,
  filterProduk
} from "../produk.service";

export type {
  ProdukItem, // From produk.service
  StatsProduk,
  CreateProdukPayload,
  UpdateProdukPayload,
  QueryProduk
} from "../produk.service";

// 3. riwayat-kantin.service
export {
  fetchRiwayat,
  fetchExportData,
  generatePDF,
  metodeLabel,
  formatTglRange
} from "../riwayat-kantin.service";

export type {
  RiwayatItemDetail,
  RiwayatItem,
  RiwayatStats,
  InfoSekolah,
  InfoKantin,
  QueryRiwayat,
  RiwayatMeta
} from "../riwayat-kantin.service";

// 4. transaksi.service
export {
  lookupSiswa,
  listGuru,
  lookupGuru,
  cekVoucher,
  getProdukKatalog,
  createTransaksi,
  addToCart,
  updateCartQty,
  getCartTotal,
  getCartCoinsPenalty,
  buildPayload,
  hitungDiskon,
  formatVoucherLabel,
  kelompokkanProduk,
  kemasanInfo,
  penaltyLabel,
  listSiswa,
  toggleCartByoc,
  getDaftarKasbon,
  lunasiKasbon
} from "../transaksi.service";

export type {
  VoucherInfo,
  SiswaInfo,
  GuruInfo,
  CartItem,
  KemasPenaltyDetail,
  TransaksiPayload,
  TransaksiResult,
  CekVoucherResult,
  KasbonItem
} from "../transaksi.service";

// 5. kantin.service
export {
  updateKantinPassword,
} from "../kantin.service";
