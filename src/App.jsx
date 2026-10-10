import { useState } from "react";
import { content } from "./content.js";
import { AskBlock, Envelope, PhotoCard, Reveal, VideoCard, VoiceNote } from "./components.jsx";

export default function App() {
  const [opened, setOpened] = useState(false);
  const [opening, setOpening] = useState(false);

  const open = () => {
    if (opened || opening) return;
    setOpening(true);
    // let the flap + slide animation play, then reveal the letter
    setTimeout(() => {
      setOpened(true);
      window.scrollTo(0, 0);
    }, 900);
  };

  const toTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  if (!opened) {
    return (
      <main className="wrap">
        <Envelope onOpen={open} opening={opening} />
      </main>
    );
  }

  return (
    <main className="wrap">
      <button className="mini-env" onClick={toTop} aria-label="Back to top">
        ✉️
      </button>

      <div className="letter">
        {content.blocks.map((b, i) => {
          if (b.type === "opening") {
            return (
              <Reveal key={i} className="opening">
                <h1>{b.text}</h1>
              </Reveal>
            );
          }
          if (b.type === "text") {
            return (
              <Reveal key={i} className="prose">
                <p>{b.text}</p>
              </Reveal>
            );
          }
          if (b.type === "photo") {
            return <PhotoCard key={i} src={b.src} caption={b.caption} />;
          }
          if (b.type === "video") {
            return <VideoCard key={i} src={b.src} poster={b.poster} caption={b.caption} />;
          }
          if (b.type === "voice") {
            return <VoiceNote key={i} src={b.src} intro={b.intro} />;
          }
          return null;
        })}

        <AskBlock setup={content.askSetup} ask={content.ask} yesMessage={content.yesMessage} />

        <footer className="foot">
          <p>{content.from} 🖤</p>
        </footer>
      </div>
    </main>
  );
}
