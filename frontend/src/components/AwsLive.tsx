import { Fragment, useEffect, useState } from "react";
import { api } from "../api";

type Verdict = "GENUINE" | "SUSPICIOUS" | "COUNTERFEIT";

interface Scan {
  scanId: string;
  serial: string;
  verdict: Verdict;
  flags: string[];
  location: string | null;
  ts: string;
  /** Present only if the scan item carries it. The status contract does not. */
  batchCode?: string;
  batch?: string;
}

interface AwsStatus {
  enabled: boolean;
  region: string;
  services: {
    s3: { bucket: string; reachable: boolean };
    dynamodb: { table: string; recentEvents: number };
    sns: { topicArn: string };
    kms: { alias: string };
    lambda: { functionName: string };
    cloudwatch: { namespace: string };
  };
  recentScans: Scan[];
}

interface QrPreview {
  scanId: string;
  url: string;
  expiresIn: number;
}

const VERDICTS: Verdict[] = ["GENUINE", "SUSPICIOUS", "COUNTERFEIT"];

function filled(value: string | null | undefined): boolean {
  return Boolean(value && value.trim());
}

function asStatus(data: unknown): AwsStatus | null {
  if (!data || typeof data !== "object") return null;
  const row = data as Partial<AwsStatus>;
  if (row.enabled !== true || !row.services) return null;
  return row as AwsStatus;
}

function verdictOf(value: string): Verdict | null {
  return VERDICTS.includes(value as Verdict) ? (value as Verdict) : null;
}

function when(ts: string): string {
  const date = new Date(ts);
  return Number.isNaN(date.getTime()) ? ts : date.toLocaleString();
}

export function AwsLive() {
  const [status, setStatus] = useState<AwsStatus | null>(null);
  const [qr, setQr] = useState<QrPreview | null>(null);
  const [qrNote, setQrNote] = useState<string | null>(null);

  useEffect(() => {
    let stop = false;

    async function tick() {
      try {
        const { data } = await api.get<unknown>("/aws/status");
        if (stop) return;
        const next = asStatus(data);
        setStatus(next);
        if (!next) {
          setQr(null);
          setQrNote(null);
        }
      } catch {
        if (stop) return;
        setStatus(null);
        setQr(null);
        setQrNote(null);
      }
    }

    tick();
    const timer = setInterval(tick, 10_000);
    return () => {
      stop = true;
      clearInterval(timer);
    };
  }, []);

  async function openQr(scan: Scan) {
    setQr(null);
    setQrNote(null);
    try {
      let batch = scan.batchCode || scan.batch || "";
      if (!batch) {
        const { data } = await api.get<{ product?: { batchCode?: string } }>(
          `/ledger/product/${encodeURIComponent(scan.serial)}`,
        );
        batch = data.product?.batchCode ?? "";
      }
      if (!batch) {
        setQrNote("QR artifact unavailable");
        return;
      }
      const key = `qr/${batch}/${scan.serial}.png`;
      const { data } = await api.get<{ url: string; expiresIn: number }>("/aws/presign", { params: { key } });
      if (!data?.url) {
        setQrNote("QR artifact unavailable");
        return;
      }
      setQr({ scanId: scan.scanId, url: data.url, expiresIn: data.expiresIn });
    } catch {
      setQrNote("QR artifact unavailable");
    }
  }

  if (!status) {
    return (
      <section className="group" aria-label="AWS Live">
        <div className="group-title">AWS Live</div>
        <div className="row">
          <span className="status-pip off" aria-hidden="true" />
          <div className="row-main">
            <div className="row-title" role="status">AWS offline</div>
          </div>
        </div>
      </section>
    );
  }

  const { services } = status;
  const scans = (status.recentScans ?? []).slice(0, 8);
  const serviceRows = [
    { name: "S3", on: services.s3?.reachable === true, detail: services.s3?.bucket || "—" },
    {
      name: "DynamoDB",
      on: filled(services.dynamodb?.table),
      detail: `${services.dynamodb?.table || "—"} · ${services.dynamodb?.recentEvents ?? 0} recent events`,
    },
    { name: "SNS", on: filled(services.sns?.topicArn), detail: services.sns?.topicArn || "—" },
    { name: "KMS", on: filled(services.kms?.alias), detail: services.kms?.alias || "—" },
    { name: "Lambda", on: filled(services.lambda?.functionName), detail: services.lambda?.functionName || "—" },
    { name: "CloudWatch", on: filled(services.cloudwatch?.namespace), detail: services.cloudwatch?.namespace || "—" },
  ];

  return (
    <section className="group" aria-label="AWS Live">
      <div className="group-title">AWS Live · {status.region || "—"}</div>
      {serviceRows.map((service) => (
        <div className="row" key={service.name}>
          <span className={`status-pip${service.on ? "" : " off"}`} aria-hidden="true" />
          <div className="row-main">
            <div className="row-title">
              {service.name} <span className="muted">{service.on ? "live" : "idle"}</span>
            </div>
            <div className="row-sub">{service.detail}</div>
          </div>
        </div>
      ))}

      <div className="group-title">Recent scans</div>
      {scans.length === 0 && (
        <div className="row">
          <div className="row-main"><div className="row-sub">No scans yet</div></div>
        </div>
      )}
      {scans.map((scan) => {
        const verdict = verdictOf(scan.verdict);
        return (
          <Fragment key={scan.scanId}>
            <div
              className="row clickable"
              role="button"
              tabIndex={0}
              aria-label={`Open QR for ${scan.serial}`}
              onClick={() => openQr(scan)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openQr(scan);
                }
              }}
            >
              <div className="row-main">
                <div className="row-title">{scan.serial}</div>
                <div className="row-sub">
                  {scan.location || "—"} · {when(scan.ts)}
                  {scan.flags?.length ? ` · ${scan.flags.join(", ")}` : ""}
                </div>
              </div>
              {verdict ? <span className={`badge ${verdict}`}>{verdict}</span> : <span className="badge">{scan.verdict}</span>}
            </div>
            {qr?.scanId === scan.scanId && (
              <div className="row">
                <a href={qr.url} target="_blank" rel="noreferrer">
                  <img className="aws-qr" src={qr.url} alt={`QR code for ${scan.serial}`} />
                </a>
                <div className="row-main">
                  <div className="row-title">QR artifact</div>
                  <div className="row-sub">Link expires in {qr.expiresIn}s</div>
                </div>
              </div>
            )}
          </Fragment>
        );
      })}
      {qrNote && (
        <div className="row">
          <div className="row-main"><div className="row-sub" role="status">{qrNote}</div></div>
        </div>
      )}
    </section>
  );
}
