import { create } from "zustand";
import type { User } from "./types";

interface AuthState {
  user: User | null;
  setUser: (u: User | null) => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: JSON.parse(localStorage.getItem("medguard_user") ?? "null"),
  setUser: (u) => {
    if (u) localStorage.setItem("medguard_user", JSON.stringify(u));
    else {
      localStorage.removeItem("medguard_user");
      localStorage.removeItem("medguard_token");
    }
    set({ user: u });
  },
}));
