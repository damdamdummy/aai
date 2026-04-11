import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

export default function NotFound() {
    const navigate = useNavigate();
    const [glitch, setGlitch] = useState(false);
    const [dots, setDots] = useState('');
    const [showContent, setShowContent] = useState(false);


    useEffect(() => {
        const glitchInterval = setInterval(() => {
            setGlitch(true);
            setTimeout(() => setGlitch(false), 120);
        }, 2800);
        return () => clearInterval(glitchInterval);
    }, []);


    useEffect(() => {
        let count = 0;
        const dotsInterval = setInterval(() => {
            count = (count + 1) % 4;
            setDots('.'.repeat(count));
        }, 400);
        return () => clearInterval(dotsInterval);
    }, []);


    useEffect(() => {
        const t = setTimeout(() => setShowContent(true), 200);
        return () => clearTimeout(t);
    }, []);

    return (
        <div style={{
            position: 'fixed', inset: 0, height: '100dvh',
            background: '#0a0a0a',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', padding: '1.5rem',
            fontFamily: "'Press Start 2P', cursive",
        }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap');

                /* Scanline overlay */
                .scanlines::before {
                    content: '';
                    position: fixed; inset: 0;
                    background: repeating-linear-gradient(
                        0deg,
                        transparent,
                        transparent 2px,
                        rgba(0,0,0,0.18) 2px,
                        rgba(0,0,0,0.18) 4px
                    );
                    pointer-events: none;
                    z-index: 10;
                }

                /* Vignette */
                .vignette::after {
                    content: '';
                    position: fixed; inset: 0;
                    background: radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.75) 100%);
                    pointer-events: none;
                    z-index: 11;
                }

                /* Glitch text */
                .glitch-text {
                    position: relative;
                    color: #e00000;
                    text-shadow:
                        3px 3px 0px #1a0000,
                        -1px -1px 0px rgba(255,0,0,0.3);
                }
                .glitch-text.glitching {
                    animation: glitch 0.12s steps(2) forwards;
                }
                @keyframes glitch {
                    0%   { clip-path: inset(0 0 85% 0); transform: translate(-4px, 0); color: #ff2222; }
                    20%  { clip-path: inset(40% 0 40% 0); transform: translate(4px, 0);  color: #cc0000; }
                    40%  { clip-path: inset(80% 0 5% 0);  transform: translate(-3px, 1px); }
                    60%  { clip-path: inset(10% 0 70% 0); transform: translate(3px, -1px); }
                    80%  { clip-path: inset(55% 0 20% 0); transform: translate(-2px, 0); }
                    100% { clip-path: inset(0);            transform: translate(0); }
                }

                /* Glitch pseudo-layers */
                .glitch-wrap { position: relative; display: inline-block; }
                .glitch-wrap::before,
                .glitch-wrap::after {
                    content: attr(data-text);
                    position: absolute; top: 0; left: 0;
                    font-family: inherit; font-size: inherit;
                    opacity: 0;
                    pointer-events: none;
                }
                .glitching .glitch-wrap::before {
                    opacity: 0.7;
                    color: #ff0000;
                    animation: glitchBefore 0.12s steps(2) forwards;
                    clip-path: inset(0 0 60% 0);
                    transform: translate(-3px, 0);
                }
                .glitching .glitch-wrap::after {
                    opacity: 0.5;
                    color: #440000;
                    animation: glitchAfter 0.12s steps(2) forwards;
                    clip-path: inset(50% 0 0 0);
                    transform: translate(3px, 0);
                }
                @keyframes glitchBefore {
                    0%   { transform: translate(-3px, 0); }
                    50%  { transform: translate(3px, 0); }
                    100% { transform: translate(-1px, 0); }
                }
                @keyframes glitchAfter {
                    0%   { transform: translate(3px, 0); }
                    50%  { transform: translate(-3px, 0); }
                    100% { transform: translate(1px, 0); }
                }

                /* Stagger fade in */
                .reveal { opacity: 0; transform: translateY(12px); transition: opacity 0.5s ease, transform 0.5s ease; }
                .reveal.show { opacity: 1; transform: translateY(0); }
                .reveal-1 { transition-delay: 0.1s; }
                .reveal-2 { transition-delay: 0.3s; }
                .reveal-3 { transition-delay: 0.55s; }
                .reveal-4 { transition-delay: 0.75s; }
                .reveal-5 { transition-delay: 0.95s; }

                /* Red divider line */
                .red-line {
                    width: 100%; height: 2px;
                    background: linear-gradient(90deg, transparent, #e00000 20%, #e00000 80%, transparent);
                    box-shadow: 0 0 12px rgba(220,0,0,0.6);
                }

                /* Back button */
                .back-btn {
                    font-family: 'Press Start 2P', cursive;
                    font-size: 0.55rem;
                    background: transparent;
                    color: #888;
                    border: 2px solid #333;
                    padding: 12px 20px;
                    cursor: pointer;
                    letter-spacing: 0.05em;
                    transition: all 0.15s;
                    position: relative;
                    overflow: hidden;
                }
                .back-btn::before {
                    content: '';
                    position: absolute; inset: 0;
                    background: #e00000;
                    transform: translateX(-101%);
                    transition: transform 0.2s ease;
                    z-index: -1;
                }
                .back-btn:hover { color: #fff; border-color: #e00000; box-shadow: 0 0 16px rgba(220,0,0,0.4); }
                .back-btn:hover::before { transform: translateX(0); }
                .back-btn:active { transform: scale(0.97); }

                /* Admin link */
                .admin-link {
                    font-family: 'VT323', monospace;
                    font-size: 1rem;
                    color: #333;
                    background: none; border: none;
                    cursor: pointer;
                    transition: color 0.15s;
                    text-decoration: underline;
                    text-underline-offset: 3px;
                }
                .admin-link:hover { color: #666; }

                /* Pulse dot */
                .pulse-dot {
                    width: 8px; height: 8px; border-radius: 50%;
                    background: #e00000;
                    box-shadow: 0 0 8px #e00000;
                    animation: pulse 1.4s ease-in-out infinite;
                    flex-shrink: 0;
                }
                @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.7); } }

                /* Error code blink */
                .blink { animation: blink 1.1s step-start infinite; }
                @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }

                /* Noise texture overlay */
                .noise {
                    position: fixed; inset: 0; pointer-events: none; z-index: 1;
                    opacity: 0.035;
                    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
                    background-size: 128px;
                }
            `}</style>

            {/* Layers */}
            <div className="scanlines" style={{ position: 'fixed', inset: 0, pointerEvents: 'none' }} />
            <div className="noise" />

            {/* Main card */}
            <div style={{
                width: '100%', maxWidth: '420px',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: '0', zIndex: 5,
            }}>


                {/* <div className={`reveal reveal-1 ${showContent ? 'show' : ''}`}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className="pulse-dot" />
                        <span style={{ fontFamily: "'VT323', monospace", fontSize: '0.95rem', color: '#444', letterSpacing: '0.08em' }}>
                            SYS.ERR
                        </span>
                    </div>
                    <span style={{ fontFamily: "'VT323', monospace", fontSize: '0.9rem', color: '#2a2a2a', letterSpacing: '0.1em' }}>
                        TERMINAL_v1.0
                    </span>
                </div> */}


                <div className={`red-line reveal reveal-1 ${showContent ? 'show' : ''}`} />


                <div className={`reveal reveal-2 ${showContent ? 'show' : ''} ${glitch ? 'glitching' : ''}`}
                    style={{ margin: '2rem 0 1rem', width: '100%', textAlign: 'center' }}>
                    <div className={`glitch-wrap glitch-text ${glitch ? 'glitch-text glitching' : 'glitch-text'}`}
                        data-text="404"
                        style={{
                            fontSize: 'clamp(4.5rem, 22vw, 7rem)',
                            letterSpacing: '-0.02em',
                            lineHeight: 1,
                            display: 'block',
                        }}>
                        404
                    </div>
                </div>


                <div className={`red-line reveal reveal-2 ${showContent ? 'show' : ''}`} />


                <div className={`reveal reveal-3 ${showContent ? 'show' : ''}`}
                    style={{ margin: '1.5rem 0 0.5rem', textAlign: 'center' }}>
                    <p style={{
                        fontFamily: "'Press Start 2P', cursive",
                        fontSize: 'clamp(0.55rem, 3vw, 0.75rem)',
                        color: '#555',
                        letterSpacing: '0.25em',
                        textTransform: 'uppercase',
                    }}>
                        PAGE_NOT_FOUND
                    </p>
                </div>


                {/* <div className={`reveal reveal-3 ${showContent ? 'show' : ''}`}
                    style={{
                        margin: '1.2rem 0', width: '100%',
                        background: '#111', border: '1px solid #222',
                        padding: '12px 16px', boxSizing: 'border-box',
                    }}>
                    <p style={{
                        fontFamily: "'VT323', monospace",
                        fontSize: '1.05rem',
                        color: '#555',
                        margin: 0,
                        letterSpacing: '0.05em',
                    }}>
                        &gt; scanning route{dots}
                    </p>
                    <p style={{
                        fontFamily: "'VT323', monospace",
                        fontSize: '1.05rem',
                        color: '#e00000',
                        margin: '4px 0 0',
                        letterSpacing: '0.05em',
                    }}>
                        &gt; <span style={{ color: '#666' }}>STATUS</span> [<span className="blink">■</span>] ACCESS DENIED
                    </p>
                    <p style={{
                        fontFamily: "'VT323', monospace",
                        fontSize: '1rem',
                        color: '#2a2a2a',
                        margin: '4px 0 0',
                        letterSpacing: '0.04em',
                    }}>
                        &gt; ERR CODE: 0x{Math.floor(Math.random() * 9000 + 1000).toString(16).toUpperCase()}
                    </p>
                </div> */}


                <div className={`reveal reveal-4 ${showContent ? 'show' : ''}`}
                    style={{ textAlign: 'center', margin: '0.5rem 0 2rem' }}>
                    <p style={{
                        fontFamily: "'VT323', monospace",
                        fontSize: '1.15rem',
                        color: '#3a3a3a',
                        lineHeight: 1.6,
                        margin: 0,
                        letterSpacing: '0.03em',
                    }}>
                        Halaman ini tidak ada atau<br />akses tidak diizinkan.
                    </p>
                </div>


                <div className={`reveal reveal-5 ${showContent ? 'show' : ''}`}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.2rem', width: '100%' }}>
                    {/* <button className="back-btn" onClick={() => navigate(-1)} style={{ width: '100%' }}>
                        ← KEMBALI  
                    </button> */}
                    <button className="admin-link" onClick={() => navigate('/admin')}>
                        → Control Panel
                    </button>
                </div>


                {/* <div className={`reveal reveal-5 ${showContent ? 'show' : ''}`}
                    style={{ marginTop: '2.5rem', width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontFamily: "'VT323', monospace", fontSize: '0.75rem', color: '#1e1e1e', letterSpacing: '0.1em' }}>
                        RESTRICTED
                    </span>
                    <span style={{ fontFamily: "'VT323', monospace", fontSize: '0.75rem', color: '#1e1e1e', letterSpacing: '0.1em' }}>
                        [SECURE ZONE]
                    </span>
                </div> */}
            </div>
        </div>
    );
}
