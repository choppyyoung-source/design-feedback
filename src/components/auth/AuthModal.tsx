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

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAuth: (user: { email: string; name: string }) => void;
}

export function AuthModal({ open, onOpenChange, onAuth }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("이메일과 비밀번호를 입력해주세요");
      return;
    }
    if (mode === "signup" && !name.trim()) {
      setError("이름을 입력해주세요");
      return;
    }
    if (password.length < 6) {
      setError("비밀번호는 6자 이상이어야 해요");
      return;
    }

    setLoading(true);

    try {
      const users = JSON.parse(localStorage.getItem("dr_users") || "{}");

      if (mode === "signup") {
        if (users[email]) {
          setError("이미 가입된 이메일이에요");
          setLoading(false);
          return;
        }
        users[email] = { password, name: name.trim() };
        localStorage.setItem("dr_users", JSON.stringify(users));
        localStorage.setItem(
          "dr_session",
          JSON.stringify({ email, name: name.trim() })
        );
        onAuth({ email, name: name.trim() });
      } else {
        const user = users[email];
        if (!user || user.password !== password) {
          setError("이메일 또는 비밀번호가 틀렸어요");
          setLoading(false);
          return;
        }
        localStorage.setItem(
          "dr_session",
          JSON.stringify({ email, name: user.name })
        );
        onAuth({ email, name: user.name });
      }
    } catch {
      setError("오류가 발생했어요. 다시 시도해주세요");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] p-0 overflow-hidden">
        {/* Top accent */}
        <div className="h-1 bg-gradient-to-r from-primary/80 to-primary" />

        <div className="px-8 pt-7 pb-8">
          <DialogHeader className="mb-8">
            <DialogTitle className="text-2xl font-bold">
              {mode === "signup" ? "회원가입" : "로그인"}
            </DialogTitle>
            <DialogDescription className="text-sm mt-2">
              {mode === "signup"
                ? "계정을 만들어 리뷰를 저장하고 공유하세요"
                : "기존 계정으로 로그인하세요"}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === "signup" && (
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground/80 mb-1.5 block">이름</label>
                <Input
                  placeholder="홍길동"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                  className="h-11"
                />
              </div>
            )}
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground/80 mb-1.5 block">이메일</label>
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
              <label className="text-sm font-medium text-foreground/80 mb-1.5 block">비밀번호</label>
              <Input
                type="password"
                placeholder="6자 이상"
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
              <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
            )}

            <Button type="submit" className="w-full h-11 text-sm font-semibold mt-2" disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : mode === "signup" ? (
                "가입하기"
              ) : (
                "로그인"
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground pt-2">
              {mode === "signup" ? (
                <>
                  이미 계정이 있나요?{" "}
                  <button
                    type="button"
                    className="text-primary hover:underline font-semibold"
                    onClick={() => {
                      setMode("login");
                      setError("");
                    }}
                  >
                    로그인
                  </button>
                </>
              ) : (
                <>
                  계정이 없나요?{" "}
                  <button
                    type="button"
                    className="text-primary hover:underline font-semibold"
                    onClick={() => {
                      setMode("signup");
                      setError("");
                    }}
                  >
                    회원가입
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
