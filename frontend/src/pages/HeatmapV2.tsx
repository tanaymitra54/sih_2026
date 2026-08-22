import { HeatmapV2 } from "../components/HeatmapV2";

export function HeatmapV2Page() {
  return (
    <>
      <div className="page-header">
        <h1>Fraud Heatmap</h1>
        <p className="muted">Real-time visualization of counterfeit detections and suspicious scan activity</p>
      </div>
      <div className="card">
        <HeatmapV2 />
      </div>
    </>
  );
}