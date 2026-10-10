import { useEffect, useRef, useState } from "react";
import { content } from "./content.js";
import { AskBlock, Envelope, Heart, Keepsake, Loader, PhotoCard, Reveal, VideoCard, VoiceNote, YES_KEY } from "./components.jsx";

const EASE = "cubic-bezier(.2,.7,.2,1)";

// Every file the page shows: photos, video posters, clips, voice note. Duplicates removed.
const ASSETS = (() => {
  const urls = [];
  for (const b of content.blocks) {
    if (b.type === "photo") urls.push(b.src);
    else if (b.type === "video") urls.push(b.poster, b.src);
    else if (b.type === "voice") urls.push(b.src);
  }
  return [...new Set(urls)];
})();

// When she said yes (ISO string) or null. /?reset=1 clears it so you can test again.
const readYes = () => {
  try {
    if (new URLSearchParams(window.location.search).get("reset") === "1") {
      localStorage.removeItem(YES_KEY);
      localStorage.removeItem("a-letter-to-my-girl:yes-date");
      window.history.replaceState(null, "", window.location.pathname);
    }
    return localStorage.getItem(YES_KEY);
  } catch {
    return null;
  }
};

// Warms every photo, poster, clip and the voice note into the browser cache,
// with honest progress. A failed file still resolves (it must never trap her),
// plus an overall failsafe so the page always opens.
function usePreload(urls) {
  const [loaded, setLoaded] = useState(0);
  const [done, setDone] = useState(urls.length === 0);
  useEffect(() => {
    if (urls.length === 0) return;
    let alive = true;
    const t0 = performance.now();
    let n = 0;
    const tick = () => {
      n += 1;
      if (!alive) return;
      setLoaded(n);
      if (n >= urls.length) {
        const wait = Math.max(0, 600 - (performance.now() - t0)); // no flash on fast networks
        setTimeout(() => alive && setDone(true), wait);
      }
    };
    urls.forEach((url) => {
      fetch(url).then(() => tick()).catch(() => tick());
    });
    const failsafe = setTimeout(() => alive && setDone(true), 30000);
    return () => {
      alive = false;
      clearTimeout(failsafe);
    };
    // ASSETS is a static module constant; preload once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return { loaded, total: urls.length, done };
}

export default function App() {
  // sealed -> opening (flap) -> unfolding (card slips out + unfolds) -> flying (envelope to corner) -> opened
  const [savedAt] = useState(readYes);
  const [reread, setReread] = useState(false);
  const [phase, setPhase] = useState(() => (savedAt ? "opened" : "sealed"));
  const photos = content.blocks.filter((b) => b.type === "photo").map((b) => b.src);
  // Everything on screen waits for these: photos, posters, clips, voice note.
  const { loaded, total, ready } = usePreload(ASSETS);
  const envRef = useRef(null);
  const cornerRef = useRef(null);
  const opened = phase === "opened";

  const finish = () => {
    setPhase("opened");
    window.scrollTo(0, 0);
  };

  const fly = () => {
    const a = envRef.current;
    const c = cornerRef.current;
    setPhase("flying");
    if (!a || !c) return finish();
    const ar = a.getBoundingClientRect();
    const cr = c.getBoundingClientRect();
    const dx = cr.left + cr.width / 2 - (ar.left + ar.width / 2);
    const dy = cr.top + cr.height / 2 - (ar.top + ar.height / 2);
    const scale = cr.width / ar.width;
    a.animate(
      [{ transform: "none" }, { transform: `translate(${dx}px, ${dy}px) scale(${scale})` }],
      { duration: 900, easing: EASE, fill: "forwards" }
    ).finished.then(finish, finish);
  };

  const open = () => {
    if (phase !== "sealed") return;
    setPhase("opening");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTimeout(finish, 150);
      return;
    }
    setTimeout(() => setPhase("unfolding"), 450);
    setTimeout(fly, 2100);
  };

  useEffect(() => {
    if (opened) document.getElementById("letter")?.focus({ preventScroll: true });
  }, [opened]);

  const toTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  let m = 0; // photos + videos alternate left / right
  const side = () => (m++ % 2 === 0 ? "side-l" : "side-r");

  const corner = (
    <button
      type="button"
      ref={cornerRef}
      className={`mini-env ${opened ? "" : "ghost"}`}
      onClick={toTop}
      aria-label="Back to top"
      aria-hidden={!opened}
      tabIndex={opened ? 0 : -1}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </svg>
    </button>
  );

  if (!ready) {
    return <Loader loaded={loaded} total={total} />;
  }

  if (savedAt && !reread) {
    return <Keepsake yesMessage={content.yesMessage} photos={photos} savedAt={savedAt} onReread={() => { setReread(true); window.scrollTo(0, 0); }} />;
  }

  if (!opened) {
    return (
      <main className="wrap">
        {corner}
        <Envelope onOpen={open} phase={phase} bodyRef={envRef} />
      </main>
    );
  }

  return (
    <main className="wrap">
      {corner}

      <div className="letter" id="letter" tabIndex={-1}>
        {content.blocks.map((b, i) => {
          if (b.type === "opening") {
            return (
              <Reveal key={i} className="opening">
                <h1>{b.text}</h1>
              </Reveal>
            );
          }
          if (b.type === "text") {
            // short lines become pull-lines (see .prose.short in CSS)
            return (
              <Reveal key={i} className={`prose ${b.text.length < 60 ? "short" : ""}`}>
                <p>{b.text}</p>
              </Reveal>
            );
          }
          if (b.type === "photo") return <PhotoCard key={i} side={side()} src={b.src} caption={b.caption} />;
          if (b.type === "video") return <VideoCard key={i} side={side()} src={b.src} poster={b.poster} caption={b.caption} />;
          if (b.type === "voice") return <VoiceNote key={i} src={b.src} intro={b.intro} />;
          return null;
        })}

        {!savedAt && <AskBlock setup={content.askSetup} ask={content.ask} yesMessage={content.yesMessage} photos={photos} />}

        <footer className="foot">
          <p>
            {content.from} <Heart />
          </p>
        </footer>
        {savedAt && (
          <button type="button" className="reread" onClick={() => { setReread(false); window.scrollTo(0, 0); }}>
            Back to us
          </button>
        )}
      </div>
    </main>
  );
}
