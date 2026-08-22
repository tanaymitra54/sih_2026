import { useEffect, useMemo, useState } from "react";
import { flexRender, type SortingState } from "@tanstack/react-table";
import { useLegacyTable as useReactTable, legacyCreateColumnHelper as createColumnHelper, getCoreRowModel, getSortedRowModel, type LegacyColumnDef } from "@tanstack/react-table/legacy";
import { toast } from "sonner";
import { api } from "../api";
import type { Product, JourneyItem } from "../types";
import { ScanInput } from "../components/ScanInput";
import { StatusBadge } from "../components/StatusBadge";
import { Timeline } from "../components/Timeline";
import { JourneyMap } from "../components/JourneyMap";
import { BoxIcon, TruckIcon } from "../components/icons";
import { getPosition } from "../utils/getPosition";

interface CustodyRow { serial: string; name: string; route: string; state: string; }

const helper = createColumnHelper<CustodyRow>();
const columns = [
  helper.accessor("serial", { header: "Serial" }),
  helper.accessor("name", { header: "Medicine" }),
  helper.accessor("route", { header: "Route" }),
  helper.accessor("state", { header: "State", cell: (i) => <StatusBadge state={i.getValue()} /> }),
] as LegacyColumnDef<CustodyRow, unknown>[];

export function Distributor() {
  const [products, setProducts] = useState<Product[]>([]);
  const [journey, setJourney] = useState<JourneyItem[] | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);

  async function load() {
    const { data } = await api.get("/custody/products");
    setProducts(data);
  }
  useEffect(() => { load(); }, []);

  async function receive(qr: string) {
    setJourney(null);
    try {
      // Get current GPS location for the custody block
      const pos = await getPosition();
      const { data } = await api.post("/custody/receive", { qr, scan: pos ? { lat: pos.lat, lng: pos.lng } : {} });
      toast.success(`Received ${data.serial} — state ${data.state}. Custody block appended to the ledger.`);
      const j = await api.get(`/custody/journey/${data.serial}`);
      setJourney(j.data.journey);
      load();
    } catch (e: any) {
      toast.error(e.response?.data?.error ?? "Receive failed");
    }
  }

  const mine = products.filter((p) => p.state === "DISTRIBUTED");
  const created = products.filter((p) => p.state === "CREATED");

  const data = useMemo(
    () => mine.map((p) => ({ serial: p.serial, name: p.batch?.name ?? "", route: p.batch?.route ?? "", state: p.state })),
    [mine],
  );
  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <>
      <div className="page-header">
        <h1>Distributor</h1>
        <p className="muted">Scan each pack on receipt from the manufacturer. Custody transfer is written to the ledger.</p>
      </div>

      <div className="stats">
        <div className="stat"><span className="stat-icon"><TruckIcon /></span><span className="stat-value">{mine.length}</span><span className="stat-label">In my custody</span></div>
        <div className="stat accent-saffron"><span className="stat-icon"><BoxIcon /></span><span className="stat-value">{created.length}</span><span className="stat-label">Awaiting receive</span></div>
        <div className="stat"><span className="stat-icon"><BoxIcon /></span><span className="stat-value">{products.length}</span><span className="stat-label">Total packs</span></div>
      </div>

      <ScanInput onResult={receive} buttonLabel="Receive" placeholder="Scan / paste pack QR (MEDG:...)" />

      {journey && (
        <div className="group animate-in">
          <div className="group-title">Where this pack has been</div>
          <div style={{ padding: "0.5rem 1.1rem 1rem" }}>
            <JourneyMap journey={journey} />
          </div>
          <div style={{ padding: "0.5rem 1.1rem 1rem" }}>
            <Timeline journey={journey} />
          </div>
        </div>
      )}

      <div className="group">
        <div className="group-title">In my custody ({mine.length})</div>
        {mine.length === 0 && <div className="row"><div className="row-main"><div className="row-sub">No packs in custody yet.</div></div></div>}
        {mine.length > 0 && (
          <div className="table-wrap">
            <table className="table-responsive">
              <thead>
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id}>
                    {hg.headers.map((h) => (
                      <th key={h.id} onClick={h.column.getToggleSortingHandler()} style={{ cursor: "pointer" }}>
                        {flexRender(h.column.columnDef.header, h.getContext())}
                        {h.column.getIsSorted() === "asc" ? " ▲" : h.column.getIsSorted() === "desc" ? " ▼" : ""}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} data-label={String(cell.column.columnDef.header)}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
