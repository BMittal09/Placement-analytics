import raw from "../data/placementData.json";
import type { PlacementData } from "../types/data";

const data = raw as unknown as PlacementData;

export function usePlacementData(): PlacementData {
  return data;
}

export function useCompanyById(id: string | undefined) {
  if (!id) return undefined;
  return data.companies.find((c) => c.id === id);
}

export function useBranchByCode(code: string | undefined) {
  if (!code) return undefined;
  return data.branches.find((b) => b.code === code);
}
