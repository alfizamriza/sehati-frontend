export default function LoadingScreen() {
    return (
        <main className="dashboard-page loading-screen-page">
            <div className="ls-blob ls-blob--1" />
            <div className="ls-blob ls-blob--2" />

            <div className="ls-card">
                {/* ── Logo ring ── */}
                <div className="ls-ring">
                    <div className="ls-ring-track" />
                    <div className="ls-ring-spin" />
                    <div className="ls-ring-inner">
                        <div className="ls-ring-dot" />
                    </div>
                </div>

                {/* ── Teks ── */}
                <div className="ls-text">
                    <div className="ls-title">
                        SE<span>HATI</span> Guru
                    </div>
                    <div className="ls-subtitle">Memuat dashboard...</div>
                </div>

                {/* ── Skeleton preview ── */}
                <div className="ls-skeleton-block">
                    <div className="ls-skel-row">
                        <div className="ls-skel ls-s1" />
                        <div className="ls-skel ls-s2" />
                    </div>
                    <div className="ls-skel ls-s5" />
                    <div className="ls-skel-row">
                        <div className="ls-skel ls-s3" />
                        <div className="ls-skel ls-s4" />
                        <div className="ls-skel ls-s2" />
                    </div>
                </div>

                {/* ── Dots ── */}
                <div className="ls-dots">
                    <div className="ls-dot" />
                    <div className="ls-dot" />
                    <div className="ls-dot" />
                </div>
            </div>
        </main>
    );
}