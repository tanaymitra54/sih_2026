import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

export function useQrScanner(onResult: (text: string) => void) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [readerId] = useState(() => `reader-${Math.random().toString(36).slice(2)}`);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  useEffect(() => {
    if (!scanning) { setError(""); return; }
    const scanner = new Html5Qrcode(readerId, { verbose: false });
    let active = true;
    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (text) => {
          if (!active) return;
          active = false;
          scanner.stop().then(
            () => { setScanning(false); onResultRef.current(text); },
            () => { setScanning(false); onResultRef.current(text); },
          );
        },
        () => {},
      )
      .catch(() => {
        setScanning(false);
        setError("Camera unavailable or permission denied — paste the QR text instead.");
      });
    return () => { active = false; scanner.stop().catch(() => {}); };
  }, [scanning, readerId]);

  return { scanning, setScanning, readerId, error };
}
