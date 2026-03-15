"use client";

/**
 * ModalGantiFoto — Upgrade
 *
 * Fitur baru:
 *  ① Auto-compress ke < 2 MB (Canvas + iteratif)
 *  ② Crop interaktif: drag-to-pan + pinch/scroll-to-zoom
 *  ③ Preview real-time sebelum upload
 *  ④ Indikator ukuran file setelah kompresi
 */

import React, {
    useRef, useState, useEffect, useCallback, type PointerEvent,
} from "react";
import { Camera, AlertTriangle, Loader2, ZoomIn, ZoomOut, RefreshCw, X } from "lucide-react";
import { uploadFotoProfil } from "@/lib/services/siswa";

// ─── MODAL SHEET (inline — tidak perlu file terpisah) ─────────────────────────
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

const CANVAS_SIZE = 400;   // output square px
const MAX_BYTES = 1.8 * 1024 * 1024; // target < 1.8 MB (leaves headroom to 2 MB)
const MIN_QUALITY = 0.45;
const INIT_ZOOM = 1.0;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4.0;

// ─── HELPERS ─────────────────────────────────────────────────────────────────

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
 * Iteratively reduces quality until size fits.
 */
async function compressToBlob(
    img: HTMLImageElement,
    offsetX: number,  // pan offset in image coords
    offsetY: number,
    zoom: number,
    maxBytes = MAX_BYTES,
): Promise<{ blob: Blob; quality: number; kb: number }> {
    const canvas = document.createElement("canvas");
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    const ctx = canvas.getContext("2d")!;

    // Fill background white (prevents transparency artefacts)
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Draw zoomed + panned image centred on canvas
    const drawW = img.naturalWidth * zoom;
    const drawH = img.naturalHeight * zoom;
    const dx = CANVAS_SIZE / 2 - (img.naturalWidth / 2 + offsetX) * zoom;
    const dy = CANVAS_SIZE / 2 - (img.naturalHeight / 2 + offsetY) * zoom;
    ctx.drawImage(img, dx, dy, drawW, drawH);

    // Iterative quality reduction
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
    const fileRef = useRef<HTMLInputElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const imgRef = useRef<HTMLImageElement | null>(null);

    const [rawSrc, setRawSrc] = useState<string | null>(null);
    const [zoom, setZoom] = useState(INIT_ZOOM);
    const [offset, setOffset] = useState({ x: 0, y: 0 }); // pan in image px

    const [sizeKb, setSizeKb] = useState<number | null>(null);
    const [quality, setQuality] = useState<number | null>(null);
    const [uploading, setUploading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    // Pointer drag state (ref to avoid stale closure)
    const drag = useRef({ active: false, startX: 0, startY: 0, ox: 0, oy: 0 });
    // Pinch state
    const pinch = useRef({ active: false, dist0: 0, zoom0: 1 });

    // ── Draw canvas preview ─────────────────────────────────────────────────
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        const img = imgRef.current;
        if (!canvas || !img) return;

        const ctx = canvas.getContext("2d")!;
        ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        ctx.fillStyle = "#1a1a2e";
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

        const drawW = img.naturalWidth * zoom;
        const drawH = img.naturalHeight * zoom;
        const dx = CANVAS_SIZE / 2 - (img.naturalWidth / 2 + offset.x) * zoom;
        const dy = CANVAS_SIZE / 2 - (img.naturalHeight / 2 + offset.y) * zoom;
        ctx.drawImage(img, dx, dy, drawW, drawH);

        // Overlay: subtle circle crop guide
        ctx.save();
        ctx.globalCompositeOperation = "source-over";
        // Darken corners outside circle
        ctx.fillStyle = "rgba(0,0,0,0.38)";
        ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
        ctx.globalCompositeOperation = "destination-out";
        ctx.beginPath();
        ctx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Circle border
        ctx.save();
        ctx.strokeStyle = "rgba(59,158,255,0.8)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }, [zoom, offset]);

    useEffect(() => { draw(); }, [draw]);

    // ── Load raw image ──────────────────────────────────────────────────────
    useEffect(() => {
        if (!rawSrc) return;
        loadImage(rawSrc).then((img) => {
            imgRef.current = img;
            // Initial zoom: fill the crop circle
            const fit = CANVAS_SIZE / Math.min(img.naturalWidth, img.naturalHeight);
            setZoom(Math.max(fit, 1));
            setOffset({ x: 0, y: 0 });
            draw();
        });
    }, [rawSrc]); // eslint-disable-line

    // ── File picker ─────────────────────────────────────────────────────────
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

    // ── Pointer drag ────────────────────────────────────────────────────────
    function onPointerDown(e: PointerEvent<HTMLCanvasElement>) {
        // Ignore secondary touch pointers; pinch handled via touch events
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

    // ── Pinch-to-zoom (touch) ────────────────────────────────────────────────
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
        const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, pinch.current.zoom0 * (d / pinch.current.dist0)));
        setZoom(newZoom);
    }
    function onTouchEnd() { pinch.current.active = false; }

    // ── Scroll-to-zoom (desktop) ─────────────────────────────────────────────
    function onWheel(e: React.WheelEvent<HTMLCanvasElement>) {
        e.preventDefault();
        setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z - e.deltaY * 0.004)));
    }

    // ── Reset ────────────────────────────────────────────────────────────────
    function handleReset() {
        if (!imgRef.current) return;
        const fit = CANVAS_SIZE / Math.min(imgRef.current.naturalWidth, imgRef.current.naturalHeight);
        setZoom(Math.max(fit, 1));
        setOffset({ x: 0, y: 0 });
    }

    // ── Upload ───────────────────────────────────────────────────────────────
    async function handleUpload() {
        const img = imgRef.current;
        if (!img) return;
        setUploading(true);
        setErr(null);
        try {
            const { blob, quality: q, kb } = await compressToBlob(img, offset.x, offset.y, zoom);
            setSizeKb(kb);
            setQuality(q);

            // Convert Blob → File so uploadFotoProfil receives a File
            const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
            const publicUrl = await uploadFotoProfil(file);
            onSuccess(publicUrl);
        } catch (e: any) {
            setErr(e.message || "Gagal upload foto");
        } finally {
            setUploading(false);
        }
    }

    // ─── RENDER ────────────────────────────────────────────────────────────────
    return (
        <ModalSheet onClose={onClose} title="Ganti Foto Profil" accentColor="var(--color-primary)">

            {/* ── No image yet: pick prompt ── */}
            {!rawSrc && (
                <div
                    className="foto-drop-zone"
                    onClick={() => fileRef.current?.click()}
                >
                    <div className="foto-drop-icon">
                        <Camera size={28} />
                    </div>
                    <div className="foto-drop-label">Ketuk untuk memilih foto</div>
                    <div className="foto-drop-hint">JPG, PNG, WEBP · akan dikompres otomatis &lt; 2 MB</div>
                </div>
            )}

            {/* ── Crop canvas ── */}
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

                    {/* Zoom controls */}
                    <div className="foto-zoom-row">
                        <button className="foto-zoom-btn" onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - 0.15))} title="Perkecil">
                            <ZoomOut size={15} />
                        </button>
                        <div className="foto-zoom-track">
                            <input
                                type="range"
                                min={MIN_ZOOM * 100}
                                max={MAX_ZOOM * 100}
                                step={5}
                                value={Math.round(zoom * 100)}
                                onChange={(e) => setZoom(Number(e.target.value) / 100)}
                                className="foto-zoom-slider"
                            />
                        </div>
                        <button className="foto-zoom-btn" onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + 0.15))} title="Perbesar">
                            <ZoomIn size={15} />
                        </button>
                        <button className="foto-zoom-btn" onClick={handleReset} title="Reset posisi">
                            <RefreshCw size={14} />
                        </button>
                    </div>

                    {/* Size info after compress */}
                    {sizeKb !== null && (
                        <div className={`foto-size-info ${sizeKb > 1900 ? "warn" : "ok"}`}>
                            {sizeKb > 1900
                                ? `⚠ Ukuran setelah kompresi: ${sizeKb} KB`
                                : `✓ Dikompres ke ${sizeKb} KB (kualitas ${Math.round((quality ?? 0.9) * 100)}%)`}
                        </div>
                    )}

                    {/* Change photo link */}
                    <button className="foto-change-link" onClick={() => { setRawSrc(null); fileRef.current?.click(); }}>
                        Ganti foto lain
                    </button>
                </>
            )}

            {/* Hidden file input */}
            <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: "none" }}
            />

            {/* Error */}
            {err && (
                <div className="profil-error-alert">
                    <AlertTriangle size={14} style={{ color: "var(--status-pel-text)", flexShrink: 0 }} />
                    <span className="profil-error-alert-text">{err}</span>
                </div>
            )}

            {/* Upload button */}
            <button
                className="profil-btn-primary"
                onClick={handleUpload}
                disabled={!rawSrc || uploading}
            >
                {uploading
                    ? <><Loader2 size={16} style={{ animation: "spin 0.7s linear infinite" }} /> Mengupload...</>
                    : "Simpan Foto"}
            </button>

        </ModalSheet>
    );
}
