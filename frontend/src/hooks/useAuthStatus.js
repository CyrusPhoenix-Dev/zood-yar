import { useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import { ACCESS_TOKEN } from "../constants";

function checkToken() {
  const token = localStorage.getItem(ACCESS_TOKEN);
  if (!token) return false;
  try {
    const decoded = jwtDecode(token);
    return decoded.exp > Date.now() / 1000;
  } catch {
    return false;
  }
}

/**
 * Reactive auth-status hook. Since there's no Context in this project,
 * this listens for a manual "authchange" event (dispatched by login,
 * logout, and register) plus the native "storage" event (fires
 * automatically in *other* tabs when localStorage changes) so any
 * component using this hook re-renders when auth state actually
 * changes, instead of only checking once on mount.
 */
export function useAuthStatus() {
  const [isAuthenticated, setIsAuthenticated] = useState(checkToken);

  useEffect(() => {
    const update = () => setIsAuthenticated(checkToken());

    window.addEventListener("authchange", update);
    window.addEventListener("storage", update);

    return () => {
      window.removeEventListener("authchange", update);
      window.removeEventListener("storage", update);
    };
  }, []);

  return isAuthenticated;
}
