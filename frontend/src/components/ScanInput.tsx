import { useState } from "react";
import { useQrScanner } from "../utils/useQrScanner";

function CameraIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14.5 4H9.5L7.5 6.5H4A2 2 0 0 0 2 8.5v9A2 2 0 0 0 4 19.5h16a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-3.5L14.5 4z" />
      <circle cx="12" cy="13" r="3.6" />
    </svg>
  );
}

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
