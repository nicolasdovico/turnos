"use client";

import React, { useRef, useState, useEffect } from "react";

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (otp: string) => void;
  onComplete?: (otp: string) => void;
  disabled?: boolean;
}

export default function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled = false,
}: OtpInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const [digits, setDigits] = useState<string[]>(Array(length).fill(""));

  // Synchronize internal state with external value prop
  useEffect(() => {
    const valDigits = value.split("").slice(0, length);
    const padded = [...valDigits, ...Array(Math.max(0, length - valDigits.length)).fill("")];
    setDigits(padded);
  }, [value, length]);

  const handleChange = (index: number, val: string) => {
    const clean = val.replace(/\D/g, ""); // Digits only
    if (!clean) {
      const updated = [...digits];
      updated[index] = "";
      setDigits(updated);
      onChange(updated.join(""));
      return;
    }

    const updated = [...digits];
    // If multiple digits pasted or typed
    if (clean.length > 1) {
      const chars = clean.split("").slice(0, length - index);
      chars.forEach((char, i) => {
        if (index + i < length) {
          updated[index + i] = char;
        }
      });
      setDigits(updated);
      const fullOtp = updated.join("");
      onChange(fullOtp);
      const nextIndex = Math.min(length - 1, index + clean.length);
      inputsRef.current[nextIndex]?.focus();
      if (fullOtp.length === length && onComplete) {
        onComplete(fullOtp);
      }
      return;
    }

    // Single digit input
    updated[index] = clean.charAt(0);
    setDigits(updated);
    const fullOtp = updated.join("");
    onChange(fullOtp);

    // Auto advance to next input
    if (index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }

    if (fullOtp.length === length && onComplete) {
      onComplete(fullOtp);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pastedData) return;

    const chars = pastedData.split("");
    const updated = Array(length).fill("");
    chars.forEach((char, i) => {
      updated[i] = char;
    });
    setDigits(updated);
    const fullOtp = updated.join("");
    onChange(fullOtp);

    const focusIdx = Math.min(length - 1, chars.length);
    inputsRef.current[focusIdx]?.focus();

    if (fullOtp.length === length && onComplete) {
      onComplete(fullOtp);
    }
  };

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(el) => {
            inputsRef.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          disabled={disabled}
          value={digits[index] || ""}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          className="h-14 w-12 sm:h-16 sm:w-14 rounded-2xl border-2 border-slate-200 bg-white text-center text-2xl font-black text-slate-900 shadow-sm transition-all focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/20 disabled:opacity-50"
          placeholder="•"
        />
      ))}
    </div>
  );
}
