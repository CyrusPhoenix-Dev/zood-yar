import axios from "axios";
import { ACCESS_TOKEN, REFRESH_TOKEN } from "./constants";

const apiUrl = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const api = axios.create({
  baseURL: apiUrl,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem(ACCESS_TOKEN);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Only attempt refresh once per request, and never for the
    // refresh endpoint itself (avoids an infinite loop if the
    // refresh token is also invalid).
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes("/api/token/refresh/")
    ) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem(REFRESH_TOKEN);
        const res = await axios.post(`${apiUrl}/api/token/refresh/`, {
          refresh: refreshToken,
        });

        localStorage.setItem(ACCESS_TOKEN, res.data.access);
        originalRequest.headers.Authorization = `Bearer ${res.data.access}`;

        return api(originalRequest); // retry the original failed request
      } catch {
        localStorage.clear();
        window.dispatchEvent(new Event("authchange")); // updates Navbar
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default api;