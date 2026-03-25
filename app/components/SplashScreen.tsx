"use client";

import { useEffect, useRef, useState } from "react";

const LINES = [
  { text: "Hey!",                          speed: 60 },
  { text: "Thanks for testing myFinance.",         speed: 36 },
  { text: "Your feedback means a lot to Deesh! ",         speed: 42 },
] as const;

const LINE_PAUSE    = 480;  // ms pause between lines
const END_PAUSE     = 1600; // ms after last line before fade-out
const FADE_DURATION = 550;  // ms for the overall fade-out

type Props = { onDone: () => void };

export default function SplashScreen({ onDone }: Props) {
  const [fadeIn,      setFadeIn]      = useState(false);
  const [fadeOut,     setFadeOut]     = useState(false);
  const [lineTexts,   setLineTexts]   = useState<string[]>(LINES.map(() => ""));
  const [lineVisible, setLineVisible] = useState<boolean[]>(LINES.map(() => false));
  const [currentLine, setCurrentLine] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Soft fade-in on mount
  useEffect(() => {
    timer.current = setTimeout(() => setFadeIn(true), 60);
    return () => clearTimeout(timer.current);
  }, []);

  // Typing engine — one line at a time
  useEffect(() => {
    if (currentLine >= LINES.length) {
      // All lines typed — wait then fade out
      timer.current = setTimeout(() => {
        setFadeOut(true);
        setTimeout(onDone, FADE_DURATION);
      }, END_PAUSE);
      return () => clearTimeout(timer.current);
    }

    const { text, speed } = LINES[currentLine];
    let charIdx = 0;

    // Reveal the line div so its fade-in transition fires
    setLineVisible(prev => prev.map((v, i) => (i === currentLine ? true : v)));

    const type = () => {
      charIdx++;
      setLineTexts(prev => {
        const next = [...prev];
        next[currentLine] = text.slice(0, charIdx);
        return next;
      });
      if (charIdx < text.length) {
        timer.current = setTimeout(type, speed);
      } else {
        timer.current = setTimeout(
          () => setCurrentLine(c => c + 1),
          LINE_PAUSE,
        );
      }
    };

    // Small lead delay before the first line so the fade-in settles
    timer.current = setTimeout(type, currentLine === 0 ? 520 : 0);
    return () => clearTimeout(timer.current);
  }, [currentLine, onDone]);

  const skip = () => {
    clearTimeout(timer.current);
    setFadeOut(true);
    setTimeout(onDone, FADE_DURATION);
  };

  return (
    <div
      className="md:hidden"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "linear-gradient(155deg, #0d0d10 0%, #101014 55%, #0b0b0e 100%)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        paddingLeft: 36,
        paddingRight: 36,
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
        opacity: fadeOut ? 0 : (fadeIn ? 1 : 0),
        transition: `opacity ${FADE_DURATION}ms cubic-bezier(0.4,0,0.2,1)`,
        pointerEvents: fadeOut ? "none" : "auto",
      }}
    >
      {/* Ambient brand glow — top-right */}
      <div style={{
        position: "absolute", pointerEvents: "none",
        top: "10%", right: "-15%",
        width: "75%", height: "55%",
        background: "radial-gradient(ellipse, rgba(174,221,0,0.055) 0%, transparent 68%)",
      }} />
      {/* Ambient cool glow — bottom-left */}
      <div style={{
        position: "absolute", pointerEvents: "none",
        bottom: "8%", left: "-25%",
        width: "65%", height: "45%",
        background: "radial-gradient(ellipse, rgba(0,122,255,0.04) 0%, transparent 68%)",
      }} />

      {/* Lines */}
      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        {LINES.map((_line, i) => {
          const isTyping = currentLine === i;
          const styles = lineStyle(i);
          return (
            <div
              key={i}
              style={{
                opacity:    lineVisible[i] ? 1 : 0,
                transform:  lineVisible[i] ? "translateY(0)" : "translateY(8px)",
                transition: "opacity 420ms ease, transform 420ms ease",
              }}
            >
              <p style={{ margin: 0, ...styles }}>
                {lineTexts[i]}
                {isTyping && <Cursor />}
              </p>
            </div>
          );
        })}
      </div>

      {/* Footer row */}
      <div style={{
        position: "absolute",
        bottom: "calc(env(safe-area-inset-bottom) + 38px)",
        left: 36, right: 36,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <span style={{
          fontSize: 11,
          fontWeight: 700,
          color: "rgba(255,255,255,0.14)",
          letterSpacing: "0.14em",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
        }}>
          myFinance
        </span>
        <button
          onClick={skip}
          style={{
            fontSize: 13,
            color: "rgba(255,255,255,0.28)",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: "8px 0 8px 20px",
            letterSpacing: "0.01em",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
          }}
        >
          Skip
        </button>
      </div>
    </div>
  );
}

function lineStyle(i: number): React.CSSProperties {
  const base: React.CSSProperties = {
    fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif",
    WebkitFontSmoothing: "antialiased",
  };
  if (i === 0) return { ...base, fontSize: 58, fontWeight: 800, color: "#AEDD00",               letterSpacing: "-0.04em",  lineHeight: 1.05 };
  if (i === 1) return { ...base, fontSize: 17, fontWeight: 400, color: "rgba(255,255,255,0.65)", letterSpacing: "-0.015em", lineHeight: 1.6  };
  return           { ...base, fontSize: 26, fontWeight: 700, color: "#ffffff",               letterSpacing: "-0.03em",  lineHeight: 1.2  };
}

function Cursor() {
  return (
    <span
      className="splash-cursor"
      style={{
        display:       "inline-block",
        width:         1.5,
        height:        "0.82em",
        background:    "#AEDD00",
        marginLeft:    3,
        verticalAlign: "middle",
        borderRadius:  1,
      }}
    />
  );
}
