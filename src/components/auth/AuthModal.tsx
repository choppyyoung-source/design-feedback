"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAuth: (user: { email: string; name: string }) => void;
}

export function AuthModal({ open, onOpenChange, onAuth }: AuthModalProps) {
  const t = useT();
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const configured = isSupabaseConfigured();
  const supabase = configured ? createClient() : null;

  const handleGoogleLogin = async () => {
    if (!supabase) {
      setError(t("auth.error.supabaseNotConfigured"));
      return;
    }
    setError("");
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        setError(error.message);
        setGoogleLoading(false);
      }
    } catch {
      setError(t("auth.error.googleLoginFailed"));
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError(t("auth.error.enterEmailPassword"));
      return;
    }
    if (mode === "signup" && !name.trim()) {
      setError(t("auth.error.enterName"));
      return;
    }
    if (password.length < 6) {
      setError(t("auth.error.passwordMinLength"));
      return;
    }

    setLoading(true);

    try {
      if (!supabase) {
        // Fallback: localStorage auth (when Supabase not configured)
        const users = JSON.parse(localStorage.getItem("dr_users") || "{}");
        if (mode === "signup") {
          if (users[email.trim()]) { setError(t("auth.error.emailAlreadyExists")); setLoading(false); return; }
          users[email.trim()] = { password, name: name.trim() };
          localStorage.setItem("dr_users", JSON.stringify(users));
          localStorage.setItem("dr_session", JSON.stringify({ email: email.trim(), name: name.trim() }));
          onAuth({ email: email.trim(), name: name.trim() });
        } else {
          const u = users[email.trim()];
          if (!u || u.password !== password) { setError(t("auth.error.invalidCredentials")); setLoading(false); return; }
          localStorage.setItem("dr_session", JSON.stringify({ email: email.trim(), name: u.name }));
          onAuth({ email: email.trim(), name: u.name });
        }
        return;
      }

      // Supabase auth
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: name.trim() },
          },
        });
        if (error) {
          setError(error.message);
          setLoading(false);
          return;
        }
        if (data.user) {
          onAuth({
            email: data.user.email ?? email.trim(),
            name: name.trim(),
          });
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) {
          if (error.message === "Invalid login credentials") {
            setError(t("auth.error.invalidCredentials"));
          } else {
            setError(error.message);
          }
          setLoading(false);
          return;
        }
        if (data.user) {
          const userName =
            data.user.user_metadata?.full_name ??
            data.user.email?.split("@")[0] ??
            "";
          onAuth({
            email: data.user.email ?? email.trim(),
            name: userName,
          });
        }
      }
    } catch {
      setError(t("auth.error.generic"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden rounded-md">

        <div className="px-8 pt-7 pb-8">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl font-bold">
              {mode === "signup" ? t("auth.signup") : t("auth.login")}
            </DialogTitle>
            <DialogDescription className="text-sm mt-2">
              {mode === "signup"
                ? t("auth.signupDesc")
                : t("auth.loginDesc")}
            </DialogDescription>
          </DialogHeader>

          {/* Google Login Button */}
          <Button
            type="button"
            variant="outline"
            className="w-full h-11 text-sm font-medium mb-5 gap-3"
            onClick={handleGoogleLogin}
            disabled={googleLoading || loading}
          >
            {googleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
            )}
            {t("auth.continueWithGoogle")}
          </Button>

          {/* Divider */}
          <div className="relative mb-5">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-[#615d59]">{t("auth.or")}</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-1">
                <label className="text-sm font-medium text-[rgba(0,0,0,0.95)] mb-1.5 block">
                  {t("auth.name")}
                </label>
                <Input
                  placeholder={t("auth.namePlaceholder")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                  className="h-11"
                />
              </div>
            )}
            <div className="space-y-1">
              <label className="text-sm font-medium text-[rgba(0,0,0,0.95)] mb-1.5 block">
                {t("auth.email")}
              </label>
              <Input
                type="email"
                placeholder="me@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError("");
                }}
                disabled={loading}
                className="h-11"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-[rgba(0,0,0,0.95)] mb-1.5 block">
                {t("auth.password")}
              </label>
              <Input
                type="password"
                placeholder={t("auth.passwordPlaceholder")}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                disabled={loading}
                className="h-11"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <Button
              type="submit"
              className="w-full h-11 text-sm font-semibold mt-2"
              disabled={loading || googleLoading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : mode === "signup" ? (
                t("auth.submitSignup")
              ) : (
                t("auth.submitLogin")
              )}
            </Button>

            <p className="text-center text-sm text-[#615d59] pt-1">
              {mode === "signup" ? (
                <>
                  {t("auth.alreadyHaveAccount")}{" "}
                  <button
                    type="button"
                    className="text-primary hover:underline font-semibold"
                    onClick={() => {
                      setMode("login");
                      setError("");
                    }}
                  >
                    {t("auth.login")}
                  </button>
                </>
              ) : (
                <>
                  {t("auth.noAccount")}{" "}
                  <button
                    type="button"
                    className="text-primary hover:underline font-semibold"
                    onClick={() => {
                      setMode("signup");
                      setError("");
                    }}
                  >
                    {t("auth.signup")}
                  </button>
                </>
              )}
            </p>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
