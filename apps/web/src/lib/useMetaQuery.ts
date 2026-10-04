import { useQuery } from "@tanstack/react-query";
import type { Level } from "shared";
import { api } from "./api";

export interface MetaResponse {
  countries: string[];
  departments: { id: number; name: string }[];
  levels: Level[];
}

export function useMetaQuery() {
  return useQuery({
    queryKey: ["meta"],
    queryFn: () => api.get<MetaResponse>("/meta"),
  });
}
