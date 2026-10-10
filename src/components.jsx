import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export function Heart({ className = "" }) {
  return (
    <svg className={`heart ${className}`} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}

export function WaxSeal() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id="wax" cx="35%" cy="30%" r="75%">
          <stop offset="0" stopColor="#ff7fa6" />
          <stop offset=".55" stopColor="#d63a6e" />
          <stop offset="1" stopColor="#9c1f4d" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="29" fill="url(#wax)" />
      <circle cx="32" cy="32" r="22" fill="none" stroke="rgba(255,255,255,.28)" strokeWidth="1.5" />
      <path fill="#fff0f4" transform="translate(18 18) scale(1.17)" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}

/* "OYINDAMOLAMI VICTOR-NUWOMI" -> "Oyindamolami Victor-Nuwomi" (script fonts are unreadable in ALL CAPS) */
const softCase = (str) =>
  str.replace(/[A-Z][A-Z'’-]{2,}/g, (w) =>
    w.toLowerCase().replace(/(^|[-'’])([a-z])/g, (_, p, c) => p + c.toUpperCase())
  );

/* Full-screen photo preview. Esc, tap outside, or the X closes it. */
function Lightbox({ src, alt, onClose }) {
  const closeBtn = useRef(null);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtn.current?.focus();
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);
  return (
    <div className="lb" role="dialog" aria-modal="true" aria-label="Photo preview" onClick={onClose}>
      <button type="button" ref={closeBtn} className="lb-x" onClick={onClose} aria-label="Close preview">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
      </button>
      <img src={src} alt={alt} onClick={(e) => e.stopPropagation()} />
    </div>
  );
}

/* A photo you can tap to see full screen (portal, so card transforms can't trap it). */
function Zoomable({ src, alt, lazy = false }) {
  const [open, setOpen] = useState(false);
  const btn = useRef(null);
  const close = useCallback(() => {
    setOpen(false);
    btn.current?.focus();
  }, []);
  return (
    <>
      <button type="button" ref={btn} className="zoom" onClick={() => setOpen(true)} aria-label={`View larger: ${alt || "photo"}`}>
        <img src={src} alt={alt} loading={lazy ? "lazy" : undefined} decoding="async" />
      </button>
      {open && createPortal(<Lightbox src={src} alt={alt} onClose={close} />, document.body)}
    </>
  );
}

/* Loading gate UI (see usePreload in App.jsx). */

export function Loader({ loaded, total }) {
  const pct = total === 0 ? 100 : Math.round((loaded / total) * 100);
  return (
    <main className="wrap loader-wrap">
      <div className="loader" role="status" aria-label={`Loading our memories, ${pct} percent`}>
        <div className="loader-seal">
          <WaxSeal />
        </div>
        <p className="loader-title">For my girl</p>
        <div className="loader-track">
          <div className="loader-fill" style={{ width: `${pct}%` }} />
        </div>
        <p className="loader-count">{pct}%</p>
      </div>
    </main>
  );
}

/* Soft scroll reveal: fade + 12px rise, once. */
export function Reveal({ children, className = "" }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal ${shown ? "on" : ""} ${className}`}>
      {children}
    </div>
  );
}

export function PhotoCard({ src, caption, side = "side-l" }) {
  return (
    <Reveal className={`media photo ${side}`}>
      <Zoomable src={src} alt={caption ? `Photo: ${caption}` : "A photo of us"} lazy />
      {caption && <p className="cap">{caption}</p>}
    </Reveal>
  );
}

/* Tap-to-play video. First tap plays WITH sound (no `muted` attribute, so nothing
   can silently re-mute it). A speaker button appears while playing, and the hint
   under the card always reflects the real state. One video at a time; auto-pause
   when scrolled away. */
export function VideoCard({ src, poster, caption, side = "side-l" }) {
  const ref = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [silent, setSilent] = useState(false); // the clip itself has no audio track

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const onPause = () => setPlaying(false);
    const onPlay = () => {
      setPlaying(true);
      document.dispatchEvent(new CustomEvent("one-video", { detail: v }));
      // stop the voice note so sound never overlaps
      document.querySelectorAll("audio").forEach((a) => a.pause());
      // best effort: after a moment, did the browser decode any audio?
      setTimeout(() => {
        if (v.paused) return;
        if (typeof v.webkitAudioDecodedByteCount === "number") setSilent(v.webkitAudioDecodedByteCount === 0);
        else if (typeof v.mozHasAudio === "boolean") setSilent(!v.mozHasAudio);
      }, 600);
    };
    const onVol = () => setMuted(v.muted || v.volume === 0);
    const stopOthers = (e) => {
      if (e.detail !== v && !v.paused) v.pause();
    };
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting && !v.paused) v.pause();
      },
      { threshold: 0.25 }
    );
    v.addEventListener("pause", onPause);
    v.addEventListener("play", onPlay);
    v.addEventListener("volumechange", onVol);
    document.addEventListener("one-video", stopOthers);
    io.observe(v);
    return () => {
      v.removeEventListener("pause", onPause);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("volumechange", onVol);
      document.removeEventListener("one-video", stopOthers);
      io.disconnect();
    };
  }, []);

  const toggle = async () => {
    const v = ref.current;
    if (!v) return;
    if (!v.paused) return v.pause();
    // stop everything else first so sound never overlaps
    document.dispatchEvent(new CustomEvent("one-video", { detail: null }));
    document.querySelectorAll("audio").forEach((a) => a.pause());
    v.muted = false;
    v.volume = 1;
    try {
      await v.play();
    } catch {
      try {
        v.muted = true; // browser refused sound: play silently, speaker button turns sound on
        await v.play();
      } catch {
        /* still blocked: stay paused, user taps again */
      }
    }
  };

  const toggleMute = () => {
    const v = ref.current;
    if (!v) return;
    v.muted = !v.muted;
    if (!v.muted && v.volume === 0) v.volume = 1;
  };

  const hint = !playing
    ? "Tap to play with sound"
    : silent
      ? "This clip has no sound"
      : muted
        ? "Muted. Tap the speaker for sound"
        : "Playing. Tap the video to pause";

  return (
    <Reveal className={`media video ${side}`}>
      <button type="button" className="vwrap" onClick={toggle} aria-label={playing ? "Pause video" : "Play video with sound"}>
        <video ref={ref} src={src} poster={poster} playsInline preload="none" />
        {!playing && (
          <span className="vplay">
            <span>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M8 5v14l11-7z" /></svg>
            </span>
          </span>
        )}
      </button>
      {playing && !silent && (
        <button type="button" className="vmute" onClick={toggleMute} aria-label={muted ? "Turn sound on" : "Mute"}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d={muted
              ? "M16.5 12A4.5 4.5 0 0 0 14 7.97v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.8 8.8 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.53 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 0 0 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"
              : "M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"} />
          </svg>
        </button>
      )}
      {caption && <p className="cap">{caption}</p>}
      <p className="vhint" aria-live="polite">{hint}</p>
    </Reveal>
  );
}

/* Voice note: never autoplays. Custom round play button + progress. */
export function VoiceNote({ src, intro }) {
  const audio = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    const onErr = () => {
      setPlaying(false);
      setFailed(true);
    };
    const up = () => setT(a.currentTime);
    const meta = () => setDur(a.duration || 0);
    const end = () => setPlaying(false);
    const onPause = () => setPlaying(false); // e.g. a video started and paused us
    const stopForVideo = (e) => {
      if (e.detail && !a.paused) a.pause();
    };
    a.addEventListener("timeupdate", up);
    a.addEventListener("loadedmetadata", meta);
    a.addEventListener("ended", end);
    a.addEventListener("error", onErr);
    a.addEventListener("pause", onPause);
    document.addEventListener("one-video", stopForVideo);
    return () => {
      a.removeEventListener("error", onErr);
      a.removeEventListener("timeupdate", up);
      a.removeEventListener("loadedmetadata", meta);
      a.removeEventListener("ended", end);
      a.removeEventListener("pause", onPause);
      document.removeEventListener("one-video", stopForVideo);
    };
  }, []);

  const toggle = async () => {
    const a = audio.current;
    if (!a) return;
    if (a.paused) {
      // stop any playing videos first
      document.dispatchEvent(new CustomEvent("one-video", { detail: null }));
      document.querySelectorAll("video").forEach((v) => v.pause());
      try {
        setFailed(false);
        if (a.error) a.load(); // retry a source that failed earlier
        await a.play();
        setPlaying(true);
      } catch {
        setPlaying(false);
        setFailed(true); // missing file, blocked by the browser, or unsupported format
      }
    } else {
      a.pause();
      setPlaying(false);
    }
  };

  const fmt = (s) => {
    if (!s || !isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  return (
    <Reveal className="voice">
      {intro && <p className="vintro">{intro}</p>}
      <div className="vrow">
        <button type="button" className="vbtn" onClick={toggle} aria-label={playing ? "Pause voice note" : "Play voice note"}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d={playing ? "M7 5h4v14H7zM13 5h4v14h-4z" : "M8 5v14l11-7z"} /></svg>
        </button>
        <div className="vtrack">
          <div className="vfill" style={{ width: dur ? `${(t / dur) * 100}%` : "0%" }} />
        </div>
        <span className="vtime">
          {fmt(t)} / {fmt(dur)}
        </span>
      </div>
      {failed && (
        <p className="vfail" role="alert">
          The voice note couldn't load. Tap play to try again.
        </p>
      )}
      <audio ref={audio} src={src} preload="metadata" />
    </Reveal>
  );
}

/* After "Yes": seal -> "Now look at me" -> keepsake card -> photos pin back down.
   Built for the two of you being in the same room. */
export const YES_KEY = "letter-yes"; // localStorage key; open /?reset=1 to clear it
const LOOK_LINE = "MY LIL PUMPKIN SEXY MAMASITA SENORITA MAMARIATA"; // <- the heart of the moment, change to your own words
function YesSequence({ yesMessage, photos }) {
  const [stage, setStage] = useState(0);
  const collage = useRef(null);
  const shots = photos.slice(0, 6);
  const [today] = useState(() => new Date().toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }));

  useEffect(() => {
    navigator.vibrate?.(40);
    try {
      if (!localStorage.getItem(YES_KEY)) localStorage.setItem(YES_KEY, new Date().toISOString());
    } catch { /* private mode: it just won't be remembered */ }
    document.body.style.overflow = "hidden";
    const t = [
      setTimeout(() => setStage(1), 2300),
      setTimeout(() => setStage(2), 7300),
      setTimeout(() => setStage(3), 11800),
    ];
    return () => {
      t.forEach(clearTimeout);
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (stage === 3) setTimeout(() => collage.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 900);
  }, [stage]);

  return (
    <div className="yes-over" role="status">
      <div className="yes-inner">
        {stage === 0 && (
          <div className="yes-seal">
            <WaxSeal />
          </div>
        )}
        {stage === 1 && (
          <p className="yes-look">
            {LOOK_LINE} <Heart />
          </p>
        )}
        {stage >= 2 && (
          <div className="media yes-card" style={{ "--tilt": "-1.6deg" }}>
            <p className="yes-yes">Yes</p>
            <p className="yes-date">{today}</p>
            <p className="yes-day">Day one.</p>
          </div>
        )}
        {stage >= 3 && (
          <div className="yes-collage" ref={collage}>
            <div className="yes-grid">
              {shots.map((src, i) => (
                <div className="pin" key={src} style={{ "--i": i, "--r": `${[-3, 2, -1.5, 3, -2, 1.5][i % 6]}deg` }}>
                  <Zoomable src={src} alt="" />
                </div>
              ))}
            </div>
            <p className="yesmsg" style={{ "--n": shots.length }}>{yesMessage}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* What she sees when she comes back after saying yes: no envelope, no question. */
const POSES = [-3, 2, -1.5, 3, -2, 1.5];
export function Keepsake({ yesMessage, photos, savedAt, onReread }) {
  const day = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const [{ days, date }] = useState(() => {
    const start = new Date(savedAt);
    const n = Math.max(0, Math.round((day(new Date()) - day(start)) / 864e5)) + 1;
    return { days: n, date: start.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }) };
  });
  const shots = photos.slice(0, 6);
  return (
    <main className="wrap keep">
      <div className="yes-inner">
        <div className="media yes-card" style={{ "--tilt": "-1.6deg" }}>
          <p className="yes-yes">Yes</p>
          <p className="yes-date">{date}</p>
          <p className="yes-day">{days === 1 ? "Day one." : `Day ${days}.`}</p>
        </div>
        <div className="yes-collage">
          <div className="yes-grid">
            {shots.map((src, i) => (
              <div className="pin" key={src} style={{ "--i": i, "--r": `${POSES[i % 6]}deg` }}>
                <Zoomable src={src} alt="" />
              </div>
            ))}
          </div>
          <p className="yesmsg" style={{ "--n": shots.length }}>{yesMessage}</p>
        </div>
        <button type="button" className="reread" onClick={onReread}>Read the letter again</button>
      </div>
    </main>
  );
}

/* The ask: Yes + runaway No. Works on touch (touchstart/pointerdown), keeps No
   inside the box, grows Yes after a few dodges. */
export function AskBlock({ setup, ask, yesMessage, photos = [] }) {
  const box = useRef(null);
  const yesBtn = useRef(null);
  const [noPos, setNoPos] = useState(null);
  const [dodges, setDodges] = useState(0);
  const [yes, setYes] = useState(false);

  const dodge = (e) => {
    if (e) e.preventDefault();
    const el = box.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const b = e?.currentTarget?.getBoundingClientRect();
    const bw = b?.width || 100;
    const bh = b?.height || 52;
    const y0 = yesBtn.current?.getBoundingClientRect();
    const pad = 20; // keep clear of Yes (including its next growth)
    const hits = (x, y) =>
      y0 && r.left + x < y0.right + pad && r.left + x + bw > y0.left - pad && r.top + y < y0.bottom + pad && r.top + y + bh > y0.top - pad;
    const maxX = Math.max(0, r.width - bw);
    const maxY = Math.max(0, r.height - bh);
    let x = 0;
    let y = 0;
    let found = false;
    for (let k = 0; k < 40 && !found; k++) {
      x = Math.random() * maxX;
      y = Math.random() * maxY;
      found = !hits(x, y);
    }
    if (!found) [x, y] = [[0, 0], [maxX, 0], [0, maxY], [maxX, maxY]].find(([cx, cy]) => !hits(cx, cy)) || [0, maxY];
    setNoPos({ x, y });
    setDodges((d) => d + 1);
  };

  if (yes) return <YesSequence yesMessage={yesMessage} photos={photos} />;

  return (
    <Reveal className="ask">
      <p className="ask-setup">{setup}</p>
      <h2 className="ask-q">{softCase(ask)}</h2>
      <div ref={box} className="ask-box">
        <button
          type="button"
          ref={yesBtn}
          className="btn-yes"
          style={{ "--s": 1 + Math.min(dodges, 5) * 0.08 }}
          onClick={() => setYes(true)}
        >
          Yes <Heart />
        </button>
        <button
          type="button"
          className={`btn-no ${dodges > 2 ? "small" : ""}`}
          style={
            noPos
              ? { left: noPos.x, top: noPos.y, "--tx": "0px" }
              : undefined
          }
          onPointerDown={dodge}
          onPointerEnter={(e) => e.pointerType === "mouse" && dodge(e)}
          onFocus={dodge}
          onClick={dodge}
        >
          No
        </button>
      </div>
      {dodges > 0 && dodges < 3 && <p className="nodges">The No button seems shy… try again 🥺</p>}
      {dodges >= 3 && <p className="nodges">Only Yes works here <Heart /></p>}
    </Reveal>
  );
}

/* One-time hearts rising on Yes. */
export function Hearts({ burst = false }) {
  const tones = ["var(--rose)", "var(--petal)", "var(--blush)"];
  return (
    <div className={`hearts ${burst ? "burst" : ""}`} aria-hidden="true">
      {Array.from({ length: 14 }, (_, i) => (
        <span
          key={i}
          style={{ "--d": `${i * 0.07}s`, "--x": `${(i - 6.5) * 26}px`, "--s": `${14 + ((i * 7) % 16)}px`, color: tones[i % 3] }}
        >
          <Heart />
        </span>
      ))}
    </div>
  );
}

export function Envelope({ onOpen, phase, bodyRef }) {
  const isOpen = phase !== "sealed";
  return (
    <div className={`sealed p-${phase}`}>
      <button type="button" className={`env ${isOpen ? "open" : ""} p-${phase}`} onClick={onOpen} aria-label="Open the letter">
        <span className="env-body" ref={bodyRef}>
          {/* letter folded in thirds: top + bottom panels fold over the middle one */}
          <span className="env-card">
            <span className="fold fold-a" />
            <span className="fold fold-b"><Heart /></span>
            <span className="fold fold-c" />
          </span>
          <span className="env-front" />
          <span className="env-flap" />
          <span className="env-seal"><WaxSeal /></span>
        </span>
      </button>
      <h1 className="for">
        For my girl <Heart className="for-heart" />
      </h1>
      <p className="hint">Tap the seal to open</p>
    </div>
  );
}
