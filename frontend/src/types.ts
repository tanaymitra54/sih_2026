export type Role = "manufacturer" | "distributor" | "pharmacist" | "consumer";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  location: string | null;
}

export interface Product {
  id: string;
  serial: string;
  hmac: string;
  state: string;
  createdAt: string;
  qr: string;
  batch?: { code: string; name: string; route: string };
}

export interface Batch {
  id: string;
  code: string;
  name: string;
  route: string;
  quantity: number;
  status?: "PENDING" | "ACTIVE" | "REJECTED";
  recalled?: boolean;
  recalledAt?: string | null;
  createdAt: string;
  products: Product[];
}

export interface JourneyItem {
  action: string;
  signer: string;
  payload: Record<string, unknown>;
  timestamp: number;
}

export interface VerifyResult {
  verdict: "GENUINE" | "SUSPICIOUS" | "COUNTERFEIT";
  flags: string[];
  product: { serial: string; name: string; batchCode: string; state: string } | null;
  journey: JourneyItem[];
}

export interface Alert {
  id: string;
  type: string;
  message: string;
  createdAt: string;
}
