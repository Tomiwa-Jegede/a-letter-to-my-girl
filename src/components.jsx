import { useEffect, useRef, useState } from "react";

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

export function PhotoCard({ src, caption }) {
  return (
    <Reveal className="card photo">
      <img src={src} alt={caption || "us"} loading="lazy" />
      {caption && <p className="cap">{caption}</p>}
    </Reveal>
  );
}

/* Tap-to-play video. Paused + muted-by-default (poster frame via preload=metadata).
   First tap: unmute + play with sound. Auto-pause when scrolled away or when
   another video starts. */
export function VideoCard({ src, poster, caption }) {
  const ref = useRef(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const onPause = () => setPlaying(false);
    const onPlay = () => {
      setPlaying(true);
      document.dispatchEvent(new CustomEvent("one-video", { detail: v }));
    };
    const stopOthers = (e) => {
      if (e.detail !== v && !v.paused) v.pause();
    };
    // Pause when scrolled out of view
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting && !v.paused) v.pause();
      },
      { threshold: 0.25 }
    );
    v.addEventListener("pause", onPause);
    v.addEventListener("play", onPlay);
    document.addEventListener("one-video", stopOthers);
    io.observe(v);
    return () => {
      v.removeEventListener("pause", onPause);
      v.removeEventListener("play", onPlay);
      document.removeEventListener("one-video", stopOthers);
      io.disconnect();
    };
  }, []);

  const toggle = async () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) {
      v.muted = false;
      try {
        await v.play();
      } catch {
        /* iOS may need a second tap — stay paused, user taps again */
      }
    } else {
      v.pause();
    }
  };

  return (
    <Reveal className="card video">
      <button className="vwrap" onClick={toggle} aria-label={playing ? "Pause video" : "Play video with sound"}>
        <video
          ref={ref}
          src={src}
          poster={poster}
          playsInline
          preload="none"
          muted
          loop={false}
        />
        {!playing && <span className="vplay">▶</span>}
      </button>
      {caption && <p className="cap">{caption}</p>}
      <p className="vhint">{playing ? "tap to pause" : "tap for sound"}</p>
    </Reveal>
  );
}

/* Voice note: never autoplays. Custom round play button + progress. */
export function VoiceNote({ src, intro }) {
  const audio = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [dur, setDur] = useState(0);

  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    const up = () => setT(a.currentTime);
    const meta = () => setDur(a.duration || 0);
    const end = () => setPlaying(false);
    a.addEventListener("timeupdate", up);
    a.addEventListener("loadedmetadata", meta);
    a.addEventListener("ended", end);
    return () => {
      a.removeEventListener("timeupdate", up);
      a.removeEventListener("loadedmetadata", meta);
      a.removeEventListener("ended", end);
    };
  }, []);

  const toggle = () => {
    const a = audio.current;
    if (!a) return;
    if (a.paused) {
      // stop any playing videos first
      document.dispatchEvent(new CustomEvent("one-video", { detail: null }));
      document.querySelectorAll("video").forEach((v) => v.pause());
      a.play();
      setPlaying(true);
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
    <Reveal className="card voice">
      {intro && <p className="vintro">{intro}</p>}
      <div className="vrow">
        <button className="vbtn" onClick={toggle} aria-label={playing ? "Pause voice note" : "Play voice note"}>
          {playing ? "❚❚" : "▶"}
        </button>
        <div className="vtrack">
          <div className="vfill" style={{ width: dur ? `${(t / dur) * 100}%` : "0%" }} />
        </div>
        <span className="vtime">
          {fmt(t)} / {fmt(dur)}
        </span>
      </div>
      <audio ref={audio} src={src} preload="metadata" />
    </Reveal>
  );
}

/* The ask: Yes + runaway No. Works on touch (touchstart/pointerdown), keeps No
   inside the box, grows Yes after a few dodges. */
export function AskBlock({ setup, ask, yesMessage }) {
  const box = useRef(null);
  const [noPos, setNoPos] = useState(null);
  const [dodges, setDodges] = useState(0);
  const [yes, setYes] = useState(false);

  const dodge = (e) => {
    if (e) e.preventDefault();
    const el = box.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = Math.random() * Math.max(0, r.width - 120);
    const y = Math.random() * Math.max(0, r.height - 120);
    setNoPos({ x, y });
    setDodges((d) => d + 1);
  };

  if (yes) {
    return (
      <div className="ask done">
        <Hearts burst />
        <p className="yesmsg">{yesMessage}</p>
        <p className="yes-sub">forever starts now 🖤</p>
      </div>
    );
  }

  return (
    <Reveal className="ask">
      <p className="ask-setup">{setup}</p>
      <h2 className="ask-q">{ask}</h2>
      <div ref={box} className="ask-box">
        <button
          className="btn-yes"
          style={{ transform: `scale(${1 + Math.min(dodges, 5) * 0.08})` }}
          onClick={() => setYes(true)}
        >
          Yes 🖤
        </button>
        <button
          className={`btn-no ${dodges > 2 ? "small" : ""}`}
          style={
            noPos
              ? { position: "absolute", left: noPos.x, top: noPos.y }
              : undefined
          }
          onPointerDown={dodge}
          onTouchStart={dodge}
          onMouseEnter={dodge}
          onClick={dodge}
        >
          No
        </button>
      </div>
      {dodges > 0 && dodges < 3 && <p className="nodges">the No button seems shy… try again 🥺</p>}
      {dodges >= 3 && <p className="nodges">only Yes works here 🖤</p>}
    </Reveal>
  );
}

/* One-time CSS hearts burst on Yes. */
export function Hearts({ burst = false }) {
  const hearts = ["🖤", "🤍", "💗", "🖤", "🤍", "💗", "🖤", "💗"];
  return (
    <div className={`hearts ${burst ? "burst" : ""}`} aria-hidden="true">
      {hearts.map((h, i) => (
        <span key={i} style={{ "--d": `${i * 0.08}s`, "--x": `${(i - 4) * 22}px` }}>
          {h}
        </span>
      ))}
    </div>
  );
}

export function Envelope({ onOpen, opening }) {
  return (
    <div className="sealed">
      <button className={`env ${opening ? "open" : ""}`} onClick={onOpen} aria-label="Tap to open the letter">
        <span className="env-body">
          <span className="env-flap" />
          <span className="env-letter">🤍</span>
          <span className="env-seal">🖤</span>
        </span>
      </button>
      <h1 className="for">For My Girl 🖤</h1>
      <p className="hint">tap the envelope to open</p>
    </div>
  );
}
