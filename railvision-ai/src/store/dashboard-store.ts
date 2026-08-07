import { create } from "zustand";

interface DashboardState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  selectedStation: string;
  setSelectedStation: (station: string) => void;
  refreshKey: number;
  refresh: () => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
  selectedStation: "all",
  setSelectedStation: (station: string) => set({ selectedStation: station }),
  refreshKey: 0,
  refresh: () => set((state) => ({ refreshKey: state.refreshKey + 1 })),
}));
