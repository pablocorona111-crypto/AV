import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { guardarMeta, listarMetas } from "@/services/metasService";
import type { MetaColaborador } from "@/types";

export function useMetas() {
  return useQuery({ queryKey: ["metas"], queryFn: listarMetas });
}

export function useGuardarMeta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (meta: MetaColaborador) => guardarMeta(meta),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["metas"] }),
  });
}
