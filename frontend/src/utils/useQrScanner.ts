import { useEffect, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";

export function useQrScanner(onResult: (text: string) => void) {
  const [scanning, setScanning] = useState(false);
  const [readerId] = useState(() => `reader-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    if (!scanning) return;
    const scanner = new Html5Qrcode(readerId, { verbose: false });
    let active = true;
    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (text) => {
          if (!active) return;
          scanner.stop().then(() => {
            setScanning(false);
            onResult(text);
          });
        },
        () => {},
      )
      .catch(() => setScanning(false));
    return () => {
      active = false;
      scanner.stop().catch(() => {});
    };
  }, [scanning, readerId, onResult]);

  return { scanning, setScanning, readerId };
}
