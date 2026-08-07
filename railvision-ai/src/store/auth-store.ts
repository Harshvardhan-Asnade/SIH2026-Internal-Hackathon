import { create } from "zustand";
import { type User, type UserRole } from "@/lib/types";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, role: UserRole) => void;
  logout: () => void;
}

const roleProfiles: Record<UserRole, Omit<User, "email">> = {
  administrator: { id: "USR-001", name: "Aditya Sharma", role: "administrator", station: "New Delhi", avatar: "" },
  station_master: { id: "USR-002", name: "Rajiv Menon", role: "station_master", station: "Mumbai CST", avatar: "" },
  rpf_officer: { id: "USR-003", name: "Priya Verma", role: "rpf_officer", station: "Howrah Junction", avatar: "" },
  maintenance_supervisor: { id: "USR-004", name: "Suresh Yadav", role: "maintenance_supervisor", station: "Chennai Central", avatar: "" },
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  login: (email: string, _password: string, role: UserRole) => {
    const profile = roleProfiles[role];
    set({
      user: { ...profile, email },
      isAuthenticated: true,
    });
  },
  logout: () => set({ user: null, isAuthenticated: false }),
}));
