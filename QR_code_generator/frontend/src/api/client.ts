import axios from "axios";

export const apiClient = axios.create({
  // Hardcode the backend port to avoid hitting any legacy default ports
  // (e.g., 5000) from leftover env vars.
  baseURL: "http://localhost:5106",
  timeout: 120000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});
