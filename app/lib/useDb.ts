"use client";
import { useCallback, useEffect, useState } from "react";
import { getRepo } from "./repo";
import type { BaseDatos } from "./types";

/** Hook de acceso a la base de datos local. `set` recibe una función pura (db) => db. */
export function useDb() {
  const repo = getRepo();
  const [db, setDb] = useState<BaseDatos>(() => repo.leer());
  useEffect(() => repo.suscribir(() => setDb(repo.leer())), [repo]);
  const set = useCallback((fn: (db: BaseDatos) => BaseDatos) => repo.guardar(fn(repo.leer())), [repo]);
  return { db, set, repo };
}
