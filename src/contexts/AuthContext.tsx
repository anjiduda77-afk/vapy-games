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
  signUp: (email: string, password: string, nickname: string, role: AppRole) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const BASE_URL = "https://vapy-games.onrender.com";

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
    const res = await fetch(`${BASE_URL}/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password, nickname, role })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Signup failed");
    }
    return data.message;
  };

  const signIn = async (email: string, password: string) => {
    const res = await fetch(`${BASE_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || "Login failed");
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
