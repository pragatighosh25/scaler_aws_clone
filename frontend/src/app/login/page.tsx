"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { AlertCircle, HelpCircle, ArrowRight, ChevronDown, MessageSquare, Globe } from "lucide-react";
import { showToast } from "@/components/ConsoleShell";

export default function LoginPage() {
  const router = useRouter();
  
  // Login form state
  const [isSignUp, setIsSignUp] = useState(false);
  const [userType, setUserType] = useState<"root" | "iam">("iam"); // default to IAM to match user's typical workflow
  const [accountId, setAccountId] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!username || !password) {
      setErrorMsg("Please fill in all fields.");
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      if (isSignUp) {
        await api.auth.signup(username, password);
        showToast("AWS account created successfully! Please sign in.", "success");
        setIsSignUp(false);
        setPassword("");
        setConfirmPassword("");
      } else {
        await api.auth.login(username, password);
        showToast("Signed in successfully to AWS Console.", "success");
        router.push("/");
      }
    } catch (err: any) {
      setErrorMsg(err.message || "An authentication error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans relative overflow-x-hidden">
      {/* Top Header Navigation Links */}
      <header className="w-full flex items-center justify-end gap-6 px-8 py-3 text-xs text-slate-600 z-20 select-none">
        <a href="#" className="hover:text-aws-orange transition-colors flex items-center gap-1">
          <span>Provide feedback</span>
        </a>
        <div className="flex items-center gap-0.5 hover:text-aws-orange cursor-pointer">
          <span>Multi-session disabled</span>
          <ChevronDown size={11} />
        </div>
        <div className="flex items-center gap-0.5 hover:text-aws-orange cursor-pointer">
          <span>English</span>
          <ChevronDown size={11} />
        </div>
      </header>

      {/* Main Container: Split Pane */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 md:px-8 py-4 relative z-10">
        
        {/* Background Isometric Boxes Watermark */}
        <div className="absolute inset-0 opacity-5 pointer-events-none z-0 hidden lg:block">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="currentColor" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" className="text-slate-300" />
          </svg>
        </div>

        {/* Center Logo */}
        <div className="mb-6 flex flex-col items-center z-10 select-none">
          <img
            src="/amazon_logo_transparent.png"
            alt="AWS Logo"
            className="h-10 w-auto"
            style={{ filter: "brightness(0.1)" }}
          />
        </div>

        {/* Side-by-Side Flex Panels */}
        <div className="w-full max-w-[960px] bg-white border border-slate-200 rounded shadow-md overflow-hidden flex flex-col lg:flex-row z-10 min-h-[500px]">
          
          {/* Left Panel: Sign-In Box */}
          <div className="flex-1 p-8 sm:p-10 flex flex-col justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900 mb-1">
                {isSignUp ? "Create AWS Account" : "Sign In"}
              </h2>
              <p className="text-xs text-slate-500 mb-6">
                Access your AWS account by user type.
              </p>

              {errorMsg && (
                <div className="mb-5 p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded flex items-start gap-2.5 animate-shake">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* User Type Selection Group */}
                {!isSignUp && (
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-700">
                      User type <span className="text-[10px] text-slate-500 font-normal underline decoration-dotted cursor-help">(not sure?)</span>
                    </label>

                    {/* Radio Option: Root User */}
                    <label className={`block border p-3 rounded cursor-pointer transition-all ${
                      userType === "root"
                        ? "border-sky-500 bg-sky-50/20 ring-1 ring-sky-500"
                        : "border-slate-300 hover:border-slate-300 bg-white"
                    }`}>
                      <div className="flex items-start gap-2.5">
                        <input
                          type="radio"
                          name="userType"
                          checked={userType === "root"}
                          onChange={() => setUserType("root")}
                          className="mt-1 text-aws-orange focus:ring-aws-orange"
                        />
                        <div className="text-[11px]">
                          <span className="font-bold block text-slate-800">Root user</span>
                          <span className="text-slate-500 text-[10px] leading-tight block mt-0.5">
                            Account owner that performs tasks requiring unrestricted access.
                          </span>
                        </div>
                      </div>
                    </label>

                    {/* Radio Option: IAM User */}
                    <label className={`block border p-3 rounded cursor-pointer transition-all ${
                      userType === "iam"
                        ? "border-sky-500 bg-sky-50/20 ring-1 ring-sky-500"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    }`}>
                      <div className="flex items-start gap-2.5">
                        <input
                          type="radio"
                          name="userType"
                          checked={userType === "iam"}
                          onChange={() => setUserType("iam")}
                          className="mt-1 text-aws-orange focus:ring-aws-orange"
                        />
                        <div className="text-[11px]">
                          <span className="font-bold block text-slate-800">IAM user</span>
                          <span className="text-slate-500 text-[10px] leading-tight block mt-0.5">
                            User within an account that performs daily tasks.
                          </span>
                        </div>
                      </div>
                    </label>
                  </div>
                )}

                {/* Input fields based on Root vs IAM */}
                <div className="space-y-3.5 pt-2">
                  {isSignUp ? (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        IAM User Name
                      </label>
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="e.g. admin"
                        className="w-full py-1.5 px-3 text-xs bg-slate-50 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-aws-orange focus:border-aws-orange"
                      />
                    </div>
                  ) : userType === "root" ? (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Root user email address
                      </label>
                      <input
                        type="email"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="username@example.com"
                        className="w-full py-1.5 px-3 text-xs bg-slate-50 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-aws-orange focus:border-aws-orange font-mono"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        IAM User Name
                      </label>
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="e.g. admin"
                        className="w-full py-1.5 px-3 text-xs bg-slate-50 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-aws-orange focus:border-aws-orange"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Password
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full py-1.5 px-3 text-xs bg-slate-50 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-aws-orange focus:border-aws-orange font-mono"
                    />
                  </div>

                  {isSignUp && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Confirm Password
                      </label>
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full py-1.5 px-3 text-xs bg-slate-50 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-aws-orange focus:border-aws-orange font-mono"
                      />
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-aws-orange hover:bg-aws-orange-hover text-white text-xs font-bold py-2 px-4 rounded shadow-sm transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                >
                  {isLoading ? (
                    <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>{isSignUp ? "Create Account" : "Next"}</span>
                      <ArrowRight size={13} />
                    </>
                  )}
                </button>
              </form>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-100 flex flex-col gap-3 text-center">
              <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">OR</span>
              <button
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setErrorMsg("");
                }}
                className="text-xs text-aws-blue hover:text-aws-blue-hover font-semibold cursor-pointer hover:underline"
              >
                {isSignUp 
                  ? "Already have a mock account? Sign In" 
                  : "Create a new mock AWS Account"
                }
              </button>
            </div>
          </div>

          {/* Right Panel: Grow Faster with AI Promo Banner */}
          <div className="hidden lg:flex w-[420px] bg-gradient-to-br from-indigo-950 via-slate-900 to-amber-950 p-10 flex-col justify-between text-white relative">
            {/* Soft decorative visual light beams */}
            <div className="absolute top-1/4 right-0 w-48 h-0.5 bg-gradient-to-l from-orange-500/40 to-transparent blur-xs transform -rotate-12" />
            <div className="absolute top-1/3 right-4 w-60 h-0.5 bg-gradient-to-l from-pink-500/40 to-transparent blur-xs transform -rotate-12" />

            <div className="space-y-4">
              <span className="text-[10px] font-bold tracking-widest text-orange-400 uppercase">Featured AWS Solutions</span>
              <h2 className="text-2xl font-semibold leading-tight pt-2">
                Grow faster with AI
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed font-light">
                AI solutions built for small businesses — ready to deploy with trusted AWS Partners. Focus on growing your business while AWS handles the scaling.
              </p>
            </div>

            <div className="pt-8">
              <a 
                href="#" 
                onClick={(e) => e.preventDefault()}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-white hover:text-orange-300 transition-colors group cursor-pointer"
              >
                <span>Learn more</span>
                <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Footer copyright */}
      <footer className="w-full py-4 bg-slate-100 border-t border-slate-200 text-center text-[10px] text-slate-500 z-10 select-none">
        © 2026, Amazon Web Services, Inc. or its affiliates. All rights reserved (Mocked console replication).
      </footer>
    </div>
  );
}
