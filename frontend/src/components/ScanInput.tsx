import { useState } from "react";
import { useQrScanner } from "../utils/useQrScanner";

export function ScanInput({ onResult, placeholder = "Paste QR text or scan", buttonLabel = "Verify" }: {
  onResult: (text: string) => void;
  placeholder?: string;
  buttonLabel?: string;
}) {
  const [text, setText] = useState("");
  const { scanning, setScanning, readerId } = useQrScanner((t) => {
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
          onKeyDown={(e) => e.key === "Enter" && onResult(text)}
        />
        <button onClick={() => text && onResult(text)}>{buttonLabel}</button>
        <button className="secondary" onClick={() => setScanning(!scanning)}>
          {scanning ? "Stop camera" : "Scan with camera"}
        </button>
      </div>
      {scanning && <div id={readerId} style={{ maxWidth: 320 }} />}
    </div>
  );
}
