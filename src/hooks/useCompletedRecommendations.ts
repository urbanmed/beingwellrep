import { useCallback, useEffect, useMemo, useState } from "react";

function storageKey(userId?: string | null, summaryId?: string | null) {
  const uid = userId ?? "anon";
  const sid = summaryId ?? "none";
  return `completed-recommendations:${uid}:${sid}`;
}

export function useCompletedRecommendations(userId?: string | null, summaryId?: string | null) {
  const key = useMemo(() => storageKey(userId, summaryId), [userId, summaryId]);
  const [completed, setCompleted] = useState<Record<string, boolean>>({});

  // Load from localStorage when key changes
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") setCompleted(parsed);
        else setCompleted({});
      } else {
        setCompleted({});
      }
    } catch {
      setCompleted({});
    }
  }, [key]);

  // Persist on change
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(completed));
    } catch {}
  }, [key, completed]);

  const isCompleted = useCallback((id: string) => {
    return !!completed[id];
  }, [completed]);

  const setItemCompleted = useCallback((id: string, value: boolean) => {
    setCompleted(prev => ({ ...prev, [id]: value }));
  }, []);

  const toggleCompleted = useCallback((id: string) => {
    setCompleted(prev => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const reset = useCallback(() => setCompleted({}), []);

  return { completed, isCompleted, setItemCompleted, toggleCompleted, reset };
}
