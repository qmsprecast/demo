import { useCallback, useEffect, useState } from "react";
import type { CatalogueEditorState } from "@shared/catalogueModel";
import { TEMPLATE_VERSION } from "@shared/catalogueModel";

const LS_KEY = "catalogue-template-names-v1";
const DB_NAME = "catalogue-templates-v1";
const DB_VER = 1;
const STORE = "templates";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
  });
}

async function idbGet(name: string): Promise<string | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(name);
    req.onsuccess = () => resolve(typeof req.result === "string" ? req.result : undefined);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB read failed"));
    tx.oncomplete = () => db.close();
  });
}

async function idbSet(name: string, value: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, name);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error ?? new Error("IndexedDB write failed"));
  });
}

async function idbKeys(): Promise<string[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAllKeys();
    req.onsuccess = () => resolve((req.result as IDBValidKey[]).map(String));
    req.onerror = () => reject(req.error ?? new Error("IndexedDB keys failed"));
    tx.oncomplete = () => db.close();
  });
}

function readNameList(): string[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function writeNameList(names: string[]) {
  localStorage.setItem(LS_KEY, JSON.stringify([...new Set(names)].sort((a, b) => a.localeCompare(b))));
}

export function useTemplateStorage() {
  const [names, setNames] = useState<string[]>(() => readNameList());

  useEffect(() => {
    void (async () => {
      try {
        const k = await idbKeys();
        if (k.length) setNames((prev) => [...new Set([...prev, ...k])].sort((a, b) => a.localeCompare(b)));
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const save = useCallback(async (name: string, state: CatalogueEditorState) => {
    const trimmed = name.trim();
    if (!trimmed) throw new Error("Template name required.");
    const payload = JSON.stringify({ ...state, version: TEMPLATE_VERSION });
    await idbSet(trimmed, payload);
    setNames((prev) => {
      const next = [...new Set([...prev, trimmed])].sort((a, b) => a.localeCompare(b));
      writeNameList(next);
      return next;
    });
  }, []);

  const load = useCallback(async (name: string): Promise<CatalogueEditorState> => {
    const raw = await idbGet(name.trim());
    if (!raw) throw new Error("Template not found.");
    const data = JSON.parse(raw) as CatalogueEditorState;
    if (data.version !== TEMPLATE_VERSION) {
      throw new Error("Unsupported template version.");
    }
    return data;
  }, []);

  const refreshNames = useCallback(async () => {
    try {
      const k = await idbKeys();
      setNames(k.sort((a, b) => a.localeCompare(b)));
      writeNameList(k);
    } catch {
      setNames(readNameList());
    }
  }, []);

  return { names, save, load, refreshNames };
}
