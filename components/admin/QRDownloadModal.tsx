import { useState, useMemo } from "react";
import { QrCode, Download, Loader2, CheckSquare, Square, X } from "lucide-react";
import { generateQRCodePDF, type SiswaQR } from "@/lib/qrcode-generator";
import type { Siswa } from "@/lib/services/admin";

interface QRDownloadModalProps {
  siswaList: Siswa[];
  onClose: () => void;
}

export default function QRDownloadModal({ siswaList, onClose }: QRDownloadModalProps) {
  const [selectedNis, setSelectedNis] = useState<Set<string>>(new Set());
  const [filterMode, setFilterMode] = useState<"all" | "kelas" | "tingkat">("all");
  const [selectedKelas, setSelectedKelas] = useState<string>("");
  const [selectedTingkat, setSelectedTingkat] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  // ============================================
  // COMPUTED: UNIQUE KELAS & TINGKAT
  // ============================================

  const { uniqueKelas, uniqueTingkat } = useMemo(() => {
    const kelasSet = new Set<string>();
    const tingkatSet = new Set<string>();

    siswaList.forEach((s) => {
      if (s.kelas) {
        kelasSet.add(s.kelas);
        // Extract tingkat from kelas (e.g., "XI-RPL" → "XI")
        const tingkat = s.kelas.split("-")[0];
        if (tingkat) tingkatSet.add(tingkat);
      }
    });

    return {
      uniqueKelas: Array.from(kelasSet).sort(),
      uniqueTingkat: Array.from(tingkatSet).sort((a, b) => {
        const order = ["VII", "VIII", "IX", "X", "XI", "XII"];
        return order.indexOf(a) - order.indexOf(b);
      }),
    };
  }, [siswaList]);

  // ============================================
  // COMPUTED: FILTERED SISWA
  // ============================================

  const filteredSiswa = useMemo(() => {
    if (filterMode === "all") return siswaList;

    if (filterMode === "kelas") {
      return siswaList.filter((s) => s.kelas === selectedKelas);
    }

    if (filterMode === "tingkat") {
      return siswaList.filter((s) => s.kelas?.startsWith(selectedTingkat + "-"));
    }

    return siswaList;
  }, [siswaList, filterMode, selectedKelas, selectedTingkat]);

  // ============================================
  // TOGGLE SELECTION
  // ============================================

  const toggleSiswa = (nis: string) => {
    const newSet = new Set(selectedNis);
    if (newSet.has(nis)) {
      newSet.delete(nis);
    } else {
      newSet.add(nis);
    }
    setSelectedNis(newSet);
  };

  const selectAll = () => {
    setSelectedNis(new Set(filteredSiswa.map((s) => s.nis)));
  };

  const deselectAll = () => {
    setSelectedNis(new Set());
  };

  // ============================================
  // GENERATE QR PDF
  // ============================================

  const handleGenerate = async () => {
    if (selectedNis.size === 0) {
      alert("Pilih minimal 1 siswa untuk di-generate QR Code!");
      return;
    }

    const selectedSiswa: SiswaQR[] = siswaList
      .filter((s) => selectedNis.has(s.nis))
      .map((s) => ({
        nis: s.nis,
        nama: s.nama,
        kelas: s.kelas,
      }));

    setIsGenerating(true);
    setProgress({ current: 0, total: 0 });

    try {
      await generateQRCodePDF(selectedSiswa, (current, total) => {
        setProgress({ current, total });
      });

      alert(`✅ QR Code berhasil di-download! Total: ${selectedSiswa.length} siswa`);
      onClose();
    } catch (error: any) {
      alert(`❌ Gagal generate QR Code: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 700, maxHeight: "85vh", display: "flex", flexDirection: "column" }}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <QrCode size={24} />
            <div>
              <h3 className="modal-title" style={{ marginBottom: 2 }}>
                Download QR Code Siswa
              </h3>
              <p style={{ fontSize: 12, opacity: 0.6, margin: 0 }}>
                Format: PDF A4 • Size: 4x4 cm per QR
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "#fff", cursor: "pointer" }}
          >
            <X size={24} />
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: "auto", flex: 1, padding: "0 24px 24px" }}>
          {/* Filter Mode */}
          <div style={{ marginBottom: 20 }}>
            <label className="form-label">Filter Siswa</label>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              <button
                onClick={() => setFilterMode("all")}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "1px solid",
                  borderColor: filterMode === "all" ? "#179EFF" : "rgba(255,255,255,0.1)",
                  background: filterMode === "all" ? "rgba(23,158,255,0.1)" : "rgba(255,255,255,0.03)",
                  color: filterMode === "all" ? "#179EFF" : "#fff",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Semua Siswa
              </button>
              <button
                onClick={() => setFilterMode("tingkat")}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "1px solid",
                  borderColor: filterMode === "tingkat" ? "#179EFF" : "rgba(255,255,255,0.1)",
                  background: filterMode === "tingkat" ? "rgba(23,158,255,0.1)" : "rgba(255,255,255,0.03)",
                  color: filterMode === "tingkat" ? "#179EFF" : "#fff",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Per Tingkat
              </button>
              <button
                onClick={() => setFilterMode("kelas")}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "1px solid",
                  borderColor: filterMode === "kelas" ? "#179EFF" : "rgba(255,255,255,0.1)",
                  background: filterMode === "kelas" ? "rgba(23,158,255,0.1)" : "rgba(255,255,255,0.03)",
                  color: filterMode === "kelas" ? "#179EFF" : "#fff",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Per Kelas
              </button>
            </div>
          </div>

          {/* Dropdown Tingkat */}
          {filterMode === "tingkat" && (
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">Pilih Tingkat</label>
              <select
                className="form-input"
                value={selectedTingkat}
                onChange={(e) => {
                  setSelectedTingkat(e.target.value);
                  setSelectedNis(new Set()); // Reset selection
                }}
              >
                <option value="">Pilih Tingkat</option>
                {uniqueTingkat.map((t) => (
                  <option key={t} value={t} style={{ color: "#000" }}>
                    Kelas {t}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Dropdown Kelas */}
          {filterMode === "kelas" && (
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">Pilih Kelas</label>
              <select
                className="form-input"
                value={selectedKelas}
                onChange={(e) => {
                  setSelectedKelas(e.target.value);
                  setSelectedNis(new Set()); // Reset selection
                }}
              >
                <option value="">Pilih Kelas</option>
                {uniqueKelas.map((k) => (
                  <option key={k} value={k} style={{ color: "#000" }}>
                    {k}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Bulk Actions */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}>
            <div style={{ fontSize: 13, opacity: 0.7 }}>
              {selectedNis.size} dari {filteredSiswa.length} siswa dipilih
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={selectAll}
                style={{
                  padding: "6px 12px",
                  fontSize: 12,
                  borderRadius: 6,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(16,185,129,0.1)",
                  color: "#10b981",
                  cursor: "pointer",
                }}
              >
                Pilih Semua
              </button>
              <button
                onClick={deselectAll}
                style={{
                  padding: "6px 12px",
                  fontSize: 12,
                  borderRadius: 6,
                  border: "1px solid rgba(255,255,255,0.1)",
                  background: "rgba(239,68,68,0.1)",
                  color: "#ef4444",
                  cursor: "pointer",
                }}
              >
                Hapus Pilihan
              </button>
            </div>
          </div>

          {/* Siswa List */}
          <div style={{
            maxHeight: 300,
            overflowY: "auto",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 12,
            background: "rgba(255,255,255,0.02)",
          }}>
            {filteredSiswa.length === 0 ? (
              <div style={{
                padding: 40,
                textAlign: "center",
                color: "rgba(255,255,255,0.4)",
              }}>
                Tidak ada siswa di filter ini
              </div>
            ) : (
              filteredSiswa.map((siswa) => (
                <div
                  key={siswa.nis}
                  onClick={() => toggleSiswa(siswa.nis)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 16px",
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                    cursor: "pointer",
                    transition: "background 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  {/* Checkbox */}
                  <div style={{ flexShrink: 0 }}>
                    {selectedNis.has(siswa.nis) ? (
                      <CheckSquare size={20} color="#179EFF" />
                    ) : (
                      <Square size={20} color="rgba(255,255,255,0.3)" />
                    )}
                  </div>

                  {/* Avatar */}
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    background: "#179EFF",
                    display: "grid",
                    placeItems: "center",
                    fontWeight: "bold",
                    fontSize: 14,
                    flexShrink: 0,
                  }}>
                    {siswa.nama.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>
                      {siswa.nama}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.6 }}>
                      {siswa.nis} • {siswa.kelas}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Progress Bar */}
          {isGenerating && (
            <div style={{
              marginTop: 20,
              padding: 16,
              background: "rgba(23,158,255,0.1)",
              borderRadius: 12,
              border: "1px solid rgba(23,158,255,0.3)",
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 8,
              }}>
                <Loader2 size={18} className="spinner" />
                <span style={{ fontSize: 13, fontWeight: 600 }}>
                  Generating PDF... ({progress.current}/{progress.total} halaman)
                </span>
              </div>
              <div style={{
                width: "100%",
                height: 6,
                background: "rgba(255,255,255,0.1)",
                borderRadius: 3,
                overflow: "hidden",
              }}>
                <div style={{
                  width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`,
                  height: "100%",
                  background: "#179EFF",
                  transition: "width 0.3s",
                }} />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={isGenerating}>
            Batal
          </button>
          <button
            className="btn btn-primary"
            onClick={handleGenerate}
            disabled={selectedNis.size === 0 || isGenerating}
          >
            {isGenerating ? (
              <>
                <Loader2 className="spinner" size={16} />
                Generating...
              </>
            ) : (
              <>
                <Download size={16} />
                Download {selectedNis.size > 0 ? `(${selectedNis.size})` : ""}
              </>
            )}
          </button>
        </div>
      </div>

      <style jsx>{`
        .spinner {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
