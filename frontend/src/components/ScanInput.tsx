import { useState } from "react";
import { useQrScanner } from "../utils/useQrScanner";
import { CameraIcon, ScanIcon } from "./icons";

export function ScanInput({ onResult, placeholder = "Paste QR text or scan", buttonLabel = "Verify" }: {
  onResult: (text: string) => void;
  placeholder?: string;
  buttonLabel?: string;
}) {
  const [text, setText] = useState("");
  const { scanning, setScanning, readerId, error } = useQrScanner((t) => {
    setText(t);
    onResult(t);
  });

  return (
    <div className="card">
      <div className="scan-paste">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          onKeyDown={(e) => e.key === "Enter" && text && onResult(text)}
        />
        <button className="btn" onClick={() => text && onResult(text)} disabled={!text}>
          <ScanIcon />
          {buttonLabel}
        </button>
        <button
          className={scanning ? "icon-btn active" : "icon-btn"}
          onClick={() => setScanning(!scanning)}
          title={scanning ? "Stop camera" : "Scan with camera"}
          aria-label={scanning ? "Stop camera" : "Scan with camera"}
        >
          <CameraIcon />
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      {scanning && <div id={readerId} style={{ maxWidth: 320, marginTop: 12 }} />}
    </div>
  );
}
