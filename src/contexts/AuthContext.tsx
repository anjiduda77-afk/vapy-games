import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type AppRole = "player" | "admin";

interface Profile {
  id?: string;
  user_id: string;
  nickname: string;
  avatar_url: string | null;
  unique_id: string;
  points: number;
}

interface User {
  id: string;
  email?: string;
}

interface AuthContextType {
  session: { access_token: string } | null;
  user: User | null;
  profile: Profile | null;
  role: AppRole | null;
  loading: boolean;
  signUp: (email: string, password: string, nickname: string, role: AppRole) => Promise<string>;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

import { BASE_URL } from "@/lib/api";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<{ access_token: string } | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (token: string) => {
    try {
      const res = await fetch(`${BASE_URL}/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
        setRole(data.role);
        setUser({ id: data.profile.user_id });
      } else {
        localStorage.removeItem("vapy_token");
        setSession(null);
        setUser(null);
        setProfile(null);
        setRole(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const refreshProfile = async () => {
    const token = localStorage.getItem("vapy_token");
    if (token) {
      await fetchProfile(token);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("vapy_token");
    if (token) {
      setSession({ access_token: token });
      fetchProfile(token).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const signUp = async (email: string, password: string, nickname: string, role: AppRole) => {
    console.log("Calling:", `${BASE_URL}/register`);
    const res = await fetch(`${BASE_URL}/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password, nickname, role })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || data.message || "Signup failed");
    }
    // Auto-login after registration
    if (data.token) {
      localStorage.setItem("vapy_token", data.token);
      setSession({ access_token: data.token });
      if (data.user) {
        setUser({ id: data.user.id, email: data.user.email });
        setProfile({
          user_id: data.user.id,
          nickname: data.user.nickname,
          avatar_url: data.user.avatar_url,
          unique_id: data.user.unique_id,
          points: data.user.points || 0
        });
        setRole(data.user.role || "player");
      }
    }
    return "Account created! Welcome to VAPY Games!";
  };

  const signIn = async (email: string, password: string) => {
    console.log("Calling:", `${BASE_URL}/login`);
    const res = await fetch(`${BASE_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || data.message || "Login failed");
    }
    // Save token and update all auth state
    if (data.token) {
      localStorage.setItem("vapy_token", data.token);
      setSession({ access_token: data.token });
      if (data.user) {
        setUser({ id: data.user.id, email: data.user.email });
        setProfile({
          user_id: data.user.id,
          nickname: data.user.nickname,
          avatar_url: data.user.avatar_url,
          unique_id: data.user.unique_id,
          points: data.user.points || 0
        });
        setRole(data.user.role || "player");
      }
    }
    return data;
  };

  const signOut = async () => {
    localStorage.removeItem("vapy_token");
    setSession(null);
    setUser(null);
    setProfile(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, role, loading, signUp, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
