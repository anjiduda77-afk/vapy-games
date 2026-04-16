/**
 * Centralized API configuration for VAPY Games
 * Handles switching between local and production environments
 */

const getBaseUrl = () => {
  // Priority 1: Environment variable from Vite (Vercel)
  const url = import.meta.env.VITE_API_BASE_URL || "https://vapy-games.onrender.com";
  console.log("🔗 VAPY API Initialized at:", url);
  return url;
};

export const BASE_URL = getBaseUrl();

/**
 * Common headers for fetch requests
 */
export const getHeaders = (token?: string) => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  } else {
    const localToken = localStorage.getItem("vapy_token");
    if (localToken) {
      headers["Authorization"] = `Bearer ${localToken}`;
    }
  }
  
  return headers;
};
