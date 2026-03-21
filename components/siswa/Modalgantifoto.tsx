"use client";

import React, {
    useRef, useState, useEffect, useCallback, type PointerEvent,
} from "react";
import { Camera, AlertTriangle, Loader2, ZoomIn, ZoomOut, RefreshCw, X, Palette, Upload, Image as ImageIcon } from "lucide-react";
import { uploadFotoProfil, saveFotoUrl } from "@/lib/services/siswa";
import Avatar, { genConfig, AvatarConfig } from "react-nice-avatar";

// ─── MODAL SHEET (inline) ─────────────────────────
function ModalSheet({
    children, onClose, title, accentColor,
}: {
    children: React.ReactNode;
    onClose: () => void;
    title: string;
    accentColor: string;
}) {
    useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = ""; };
    }, []);

    return (
        <div className="profil-modal-overlay" onClick={onClose}>
            <div
                className="profil-modal-sheet"
                style={{ borderTop: `3px solid ${accentColor}` }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="profil-modal-drag" />
                <button className="profil-modal-close" onClick={onClose}>
                    <X size={15} />
                </button>
                <div className="profil-modal-title">{title}</div>
                {children}
            </div>
        </div>
    );
}

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface Props {
    fotoUrl: string | null;
    nama: string;
    nis: string;
    onClose: () => void;
    onSuccess: (url: string) => void;
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const CANVAS_SIZE = 400;   
const MAX_BYTES = 1.8 * 1024 * 1024; 
const MIN_QUALITY = 0.45;

/** Load a File/Blob into an HTMLImageElement */
function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((res, rej) => {
        const img = new Image();
        img.onload = () => res(img);
        img.onerror = rej;
        img.src = src;
    });
}

/**
 * Compress + crop a canvas region to a JPEG Blob under maxBytes.
 */
async function compressToBlob(
    img: HTMLImageElement,
    offsetX: number, 
    offsetY: number,
    zoom: number,
    maxBytes = MAX_BYTES,
): Promise<{ blob: Blob; quality: number; kb: number }> {
    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    const ctx = canvas.getContext("2d")!;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    const drawW = img.naturalWidth * zoom;
    const drawH = img.naturalHeight * zoom;
    const dx = CANVAS_SIZE / 2 - (img.naturalWidth / 2 + offsetX) * zoom;
    const dy = CANVAS_SIZE / 2 - (img.naturalHeight / 2 + offsetY) * zoom;
    ctx.drawImage(img, dx, dy, drawW, drawH);

    let quality = 0.92;
    let blob: Blob | null = null;

    while (quality >= MIN_QUALITY) {
        blob = await new Promise<Blob>((res, rej) =>
            canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob failed"))), "image/jpeg", quality),
        );
        if (blob.size <= maxBytes) break;
        quality -= 0.08;
    }

    blob = blob!;
    return { blob, quality: Math.max(quality, MIN_QUALITY), kb: Math.round(blob.size / 1024) };
}

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export default function ModalGantiFoto({ fotoUrl, nama, onClose, onSuccess }: Props) {
    const [tab, setTab] = useState<"upload" | "avatar">("upload");
    
    // --- UPLOAD STATE ---
    const fileRef = useRef<HTMLInputElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imgRef = useRef<HTMLImageElement | null>(null);

    const [rawSrc, setRawSrc] = useState<string | null>(null);
    const [zoom, setZoom] = useState(1.0);
    const [minZoom, setMinZoom] = useState(0.1);
    const [maxZoom, setMaxZoom] = useState(4.0);
    const [offset, setOffset] = useState({ x: 0, y: 0 }); // pan in image px

    const [sizeKb, setSizeKb] = useState<number | null>(null);
    const [quality, setQuality] = useState<number | null>(null);
    const [uploading, setUploading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const drag = useRef({ active: false, startX: 0, startY: 0, ox: 0, oy: 0 });
    const pinch = useRef({ active: false, dist0: 0, zoom0: 1 });

    // --- AVATAR STATE ---
    const isNiceAvatar = fotoUrl?.startsWith("nice-avatar://?");
    const initialConfig = isNiceAvatar 
        ? Object.fromEntries(new URLSearchParams(fotoUrl!.replace("nice-avatar://?", "")).entries()) as AvatarConfig
        : genConfig(nama);
        
    const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>(initialConfig);

    // ── Draw canvas preview ─────────────────────────────────────────────────
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        const img = imgRef.current;
        if (!canvas || !img || tab !== "upload") return;

        const ctx = canvas.getContext("2d")!;
        ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        ctx.fillStyle = "#1a1a2e";
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        const drawW = img.naturalWidth * zoom;
        const drawH = img.naturalHeight * zoom;
        const dx = CANVAS_SIZE / 2 - (img.naturalWidth / 2 + offset.x) * zoom;
        const dy = CANVAS_SIZE / 2 - (img.naturalHeight / 2 + offset.y) * zoom;
        ctx.drawImage(img, dx, dy, drawW, drawH);

        ctx.save();
        ctx.globalCompositeOperation = "source-over";
        ctx.fillStyle = "rgba(0,0,0,0.38)";
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        ctx.globalCompositeOperation = "destination-out";
        ctx.beginPath();
        ctx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        ctx.save();
        ctx.strokeStyle = "rgba(59,158,255,0.8)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }, [zoom, offset, tab]);

    useEffect(() => { draw(); }, [draw]);

    useEffect(() => {
        if (!rawSrc) return;
        loadImage(rawSrc).then((img) => {
            imgRef.current = img;
            const fit = CANVAS_SIZE / Math.min(img.naturalWidth, img.naturalHeight);
            setMinZoom(fit); 
            setMaxZoom(Math.max(4.0, fit * 5.0));
            setZoom(fit);
            setOffset({ x: 0, y: 0 });
            draw();
        });
    }, [rawSrc]); // eslint-disable-line

    function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const f = e.target.files?.[0];
        if (!f) return;
        if (!f.type.startsWith("image/")) { setErr("Hanya file gambar yang diizinkan"); return; }
        setErr(null);
        setSizeKb(null);
        setQuality(null);
        const url = URL.createObjectURL(f);
        setRawSrc(url);
    }

    function onPointerDown(e: PointerEvent<HTMLCanvasElement>) {
        if (e.pointerType === "touch" && !e.isPrimary) return;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        drag.current = { active: true, startX: e.clientX, startY: e.clientY, ox: offset.x, oy: offset.y };
    }
    function onPointerMove(e: PointerEvent<HTMLCanvasElement>) {
        if (!drag.current.active) return;
        const dx = (e.clientX - drag.current.startX) / zoom;
        const dy = (e.clientY - drag.current.startY) / zoom;
        setOffset({ x: drag.current.ox - dx, y: drag.current.oy - dy });
    }
    function onPointerUp() { drag.current.active = false; }

    function onTouchStart(e: React.TouchEvent<HTMLCanvasElement>) {
        if (e.touches.length !== 2) return;
        const d = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY,
        );
        pinch.current = { active: true, dist0: d, zoom0: zoom };
    }
    function onTouchMove(e: React.TouchEvent<HTMLCanvasElement>) {
        if (!pinch.current.active || e.touches.length !== 2) return;
        const d = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY,
        );
        const newZoom = Math.min(maxZoom, Math.max(minZoom, pinch.current.zoom0 * (d / pinch.current.dist0)));
        setZoom(newZoom);
    }
    function onTouchEnd() { pinch.current.active = false; }

    function onWheel(e: React.WheelEvent<HTMLCanvasElement>) {
        e.preventDefault();
        setZoom((z) => Math.min(maxZoom, Math.max(minZoom, z - e.deltaY * 0.004)));
    }

    function handleReset() {
        if (!imgRef.current) return;
        const fit = CANVAS_SIZE / Math.min(imgRef.current.naturalWidth, imgRef.current.naturalHeight);
        setZoom(fit);
        setOffset({ x: 0, y: 0 });
    }

    async function handleUpload() {
        if (tab === "avatar") {
            setUploading(true);
            setErr(null);
            try {
                // Encode config to NICE URL
                const qs = new URLSearchParams(Object.entries(avatarConfig)).toString();
                const niceUrl = `nice-avatar://?${qs}`;
                await saveFotoUrl(niceUrl);
                onSuccess(niceUrl);
            } catch (e: any) {
                setErr(e.message || "Gagal menyimpan avatar");
            } finally {
                setUploading(false);
            }
            return;
        }

        const img = imgRef.current;
        if (!img) return;
        setUploading(true);
        setErr(null);
        try {
            const { blob, quality: q, kb } = await compressToBlob(img, offset.x, offset.y, zoom);
            setSizeKb(kb);
            setQuality(q);

            const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
            const publicUrl = await uploadFotoProfil(file);
            onSuccess(publicUrl);
        } catch (e: any) {
            setErr(e.message || "Gagal upload foto");
        } finally {
            setUploading(false);
        }
    }

    const updateAvatarField = (key: keyof AvatarConfig, value: any) => {
        setAvatarConfig(prev => ({ ...prev, [key]: value }));
    };

    return (
        <ModalSheet onClose={onClose} title="Ganti Foto Profil" accentColor="var(--color-primary)">
            
            {/* Tabs */}
            <div style={{ display: "flex", gap: "10px", marginBottom: "15px", borderBottom: "1px solid var(--border-color)", paddingBottom: "10px" }}>
                <button 
                    onClick={() => setTab("upload")}
                    style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "none", background: tab === "upload" ? "var(--color-primary-soft)" : "transparent", color: tab === "upload" ? "var(--color-primary)" : "var(--text-secondary)", fontWeight: tab === "upload" ? "600" : "400", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                >
                    <Upload size={16} /> Upload Foto
                </button>
                <button 
                    onClick={() => setTab("avatar")}
                    style={{ flex: 1, padding: "8px", borderRadius: "8px", border: "none", background: tab === "avatar" ? "var(--color-primary-soft)" : "transparent", color: tab === "avatar" ? "var(--color-primary)" : "var(--text-secondary)", fontWeight: tab === "avatar" ? "600" : "400", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px" }}
                >
                    <Palette size={16} /> Buat Avatar
                </button>
            </div>

            {tab === "upload" ? (
                <>
                    {!rawSrc && (
                        <div
                            className="foto-drop-zone"
                            onClick={() => fileRef.current?.click()}
                        >
                            <div className="foto-drop-icon">
                                <ImageIcon size={28} />
                            </div>
                            <div className="foto-drop-label">Ketuk untuk memilih foto</div>
                            <div className="foto-drop-hint">JPG, PNG, WEBP · akan dikompres otomatis &lt; 2 MB</div>
                        </div>
                    )}

                    {rawSrc && (
                        <>
                            <div className="foto-canvas-wrap">
                                <canvas
                                    ref={canvasRef}
                                    width={CANVAS_SIZE}
                                    height={CANVAS_SIZE}
                                    className="foto-canvas"
                                    onPointerDown={onPointerDown}
                                    onPointerMove={onPointerMove}
                                    onPointerUp={onPointerUp}
                                    onPointerCancel={onPointerUp}
                                    onTouchStart={onTouchStart}
                                    onTouchMove={onTouchMove}
                                    onTouchEnd={onTouchEnd}
                                    onWheel={onWheel}
                                    style={{ touchAction: "none" }}
                                />
                                <div className="foto-canvas-hint">
                                    Geser untuk atur posisi · Scroll / cubit untuk zoom
                                </div>
                            </div>

                            <div className="foto-zoom-row">
                                <button className="foto-zoom-btn" onClick={() => setZoom((z) => Math.max(minZoom, z - 0.15))} title="Perkecil">
                                    <ZoomOut size={15} />
                                </button>
                                <div className="foto-zoom-track">
                                    <input
                                        type="range"
                                        min={minZoom * 100}
                                        max={maxZoom * 100}
                                        step={5}
                                        value={Math.round(zoom * 100)}
                                        onChange={(e) => setZoom(Number(e.target.value) / 100)}
                                        className="foto-zoom-slider"
                                    />
                                </div>
                                <button className="foto-zoom-btn" onClick={() => setZoom((z) => Math.min(maxZoom, z + 0.15))} title="Perbesar">
                                    <ZoomIn size={15} />
                                </button>
                                <button className="foto-zoom-btn" onClick={handleReset} title="Reset posisi">
                                    <RefreshCw size={14} />
                                </button>
                            </div>

                            {sizeKb !== null && (
                                <div className={`foto-size-info ${sizeKb > 1900 ? "warn" : "ok"}`}>
                                    {sizeKb > 1900
                                        ? `⚠ Ukuran setelah kompresi: ${sizeKb} KB`
                                        : `✓ Dikompres ke ${sizeKb} KB (kualitas ${Math.round((quality ?? 0.9) * 100)}%)`}
                                </div>
                            )}

                            <button className="foto-change-link" onClick={() => { setRawSrc(null); fileRef.current?.click(); }}>
                                Ganti foto lain
                            </button>
                        </>
                    )}

                    <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        style={{ display: "none" }}
                    />
                </>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                    {/* Avatar Preview */}
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: "10px" }}>
                        <div style={{ width: "160px", height: "160px" }}>
                            <Avatar style={{ width: "100%", height: "100%" }} {...avatarConfig} />
                        </div>
                    </div>
                    
                    <div style={{ display: "flex", justifyContent: "center" }}>
                        <button 
                            className="profil-btn-secondary" 
                            style={{ padding: "6px 16px", borderRadius: "20px", display: "inline-flex", alignItems: "center", gap: "6px" }}
                            onClick={() => setAvatarConfig(genConfig())}
                        >
                            <RefreshCw size={14} /> Acak Avatar
                        </button>
                    </div>

                    <div style={{ maxHeight: "30vh", overflowY: "auto", padding: "10px", background: "var(--surface-color)", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "12px" }}>
                        
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <label style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500 }}>Jenis Kelamin</label>
                            <select className="profil-input" style={{ padding: "8px" }} value={avatarConfig.sex as string} onChange={(e) => updateAvatarField("sex", e.target.value)}>
                                <option value="man">Laki-laki</option>
                                <option value="woman">Perempuan</option>
                            </select>
                        </div>
                        
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <label style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500 }}>Bentuk Wajah (Senyum)</label>
                            <select className="profil-input" style={{ padding: "8px" }} value={avatarConfig.mouthStyle as string} onChange={(e) => updateAvatarField("mouthStyle", e.target.value)}>
                                <option value="laugh">Tertawa</option>
                                <option value="smile">Tersenyum</option>
                                <option value="peace">Santai</option>
                            </select>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <label style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500 }}>Gaya Rambut</label>
                            <select className="profil-input" style={{ padding: "8px" }} value={avatarConfig.hairStyle as string} onChange={(e) => updateAvatarField("hairStyle", e.target.value)}>
                                <option value="normal">Normal</option>
                                <option value="thick">Tebal</option>
                                <option value="mohawk">Mohawk</option>
                                <option value="womanLong">Panjang (Wanita)</option>
                                <option value="womanShort">Pendek (Wanita)</option>
                            </select>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <label style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500 }}>Bentuk Mata</label>
                            <select className="profil-input" style={{ padding: "8px" }} value={avatarConfig.eyeStyle as string} onChange={(e) => updateAvatarField("eyeStyle", e.target.value)}>
                                <option value="circle">Bulat</option>
                                <option value="oval">Lonjong</option>
                                <option value="smile">Senyum</option>
                            </select>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <label style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500 }}>Kacamata</label>
                            <select className="profil-input" style={{ padding: "8px" }} value={avatarConfig.glassesStyle as string} onChange={(e) => updateAvatarField("glassesStyle", e.target.value)}>
                                <option value="none">Tanpa Kacamata</option>
                                <option value="round">Bulat</option>
                                <option value="square">Kotak</option>
                            </select>
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                            <label style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500 }}>Gaya Baju</label>
                            <select className="profil-input" style={{ padding: "8px" }} value={avatarConfig.shirtStyle as string} onChange={(e) => updateAvatarField("shirtStyle", e.target.value)}>
                                <option value="hoody">Hoodie</option>
                                <option value="short">Kaos Pendek</option>
                                <option value="polo">Polo</option>
                            </select>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                <label style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500 }}>Warna Rambut</label>
                                <input type="color" value={avatarConfig.hairColor} onChange={(e) => updateAvatarField("hairColor", e.target.value)} style={{ width: "100%", height: "40px", border: "none", borderRadius: "8px", overflow: "hidden", cursor: "pointer" }} />
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                <label style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500 }}>Warna Baju</label>
                                <input type="color" value={avatarConfig.shirtColor} onChange={(e) => updateAvatarField("shirtColor", e.target.value)} style={{ width: "100%", height: "40px", border: "none", borderRadius: "8px", overflow: "hidden", cursor: "pointer" }} />
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                <label style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500 }}>Warna Kulit</label>
                                <input type="color" value={avatarConfig.faceColor} onChange={(e) => updateAvatarField("faceColor", e.target.value)} style={{ width: "100%", height: "40px", border: "none", borderRadius: "8px", overflow: "hidden", cursor: "pointer" }} />
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                                <label style={{ fontSize: "12px", color: "var(--text-secondary)", fontWeight: 500 }}>Warna Latar</label>
                                <input type="color" value={avatarConfig.bgColor} onChange={(e) => updateAvatarField("bgColor", e.target.value)} style={{ width: "100%", height: "40px", border: "none", borderRadius: "8px", overflow: "hidden", cursor: "pointer" }} />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {err && (
                <div className="profil-error-alert" style={{ marginTop: "15px" }}>
                    <AlertTriangle size={14} style={{ color: "var(--status-pel-text)", flexShrink: 0 }} />
                    <span className="profil-error-alert-text">{err}</span>
                </div>
            )}

            <button
                className="profil-btn-primary"
                onClick={handleUpload}
                disabled={(tab === "upload" && !rawSrc) || uploading}
                style={{ marginTop: "15px" }}
            >
                {uploading
                    ? <><Loader2 size={16} style={{ animation: "spin 0.7s linear infinite" }} /> Menyimpan...</>
                    : tab === "upload" ? "Simpan Foto Profile" : "Simpan Avatar"}
            </button>

        </ModalSheet>
    );
}
