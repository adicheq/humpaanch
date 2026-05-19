"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MEMBERS, MemberId } from "@/lib/types";

interface MemberPickerProps {
  onSelect: (memberId: MemberId) => void;
}

type Screen = "pick_member" | "enter_pin" | "setup_pin" | "confirm_pin";

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, scale: 0.8, y: 20 },
  show: { opacity: 1, scale: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } },
};

export default function MemberPicker({ onSelect }: MemberPickerProps) {
  const [screen, setScreen] = useState<Screen>("pick_member");
  const [selectedMember, setSelectedMember] = useState<MemberId | null>(null);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const member = MEMBERS.find((m) => m.id === selectedMember);

  const handleMemberTap = async (id: MemberId) => {
    setSelectedMember(id);
    setPin("");
    setConfirmPin("");
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member_id: id, action: "check" }),
      });
      const data = await res.json();

      if (data.has_pin) {
        setScreen("enter_pin");
      } else {
        setScreen("setup_pin");
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handlePinInput = (digit: string, target: "pin" | "confirm") => {
    if (target === "pin") {
      if (pin.length < 4) {
        const newPin = pin + digit;
        setPin(newPin);
        setError("");

        // Auto-submit on 4 digits for login
        if (newPin.length === 4 && screen === "enter_pin") {
          submitLogin(newPin);
        }
      }
    } else {
      if (confirmPin.length < 4) {
        const newConfirm = confirmPin + digit;
        setConfirmPin(newConfirm);
        setError("");

        // Auto-submit on 4 digits for confirm
        if (newConfirm.length === 4) {
          submitSetup(pin, newConfirm);
        }
      }
    }
  };

  const handleBackspace = (target: "pin" | "confirm") => {
    if (target === "pin") {
      setPin(pin.slice(0, -1));
    } else {
      setConfirmPin(confirmPin.slice(0, -1));
    }
    setError("");
  };

  const submitLogin = async (pinValue: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          member_id: selectedMember,
          pin: pinValue,
          action: "login",
        }),
      });

      if (res.ok) {
        localStorage.setItem("humpaanch_member", selectedMember!);
        onSelect(selectedMember!);
      } else {
        setPin("");
        setError("Wrong PIN. Try again.");
      }
    } catch {
      setError("Something went wrong.");
      setPin("");
    } finally {
      setLoading(false);
    }
  };

  const submitSetup = async (pinVal: string, confirmVal: string) => {
    if (pinVal !== confirmVal) {
      setConfirmPin("");
      setError("PINs don't match. Re-enter.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          member_id: selectedMember,
          pin: pinVal,
          action: "setup",
        }),
      });

      if (res.ok) {
        localStorage.setItem("humpaanch_member", selectedMember!);
        onSelect(selectedMember!);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to set PIN.");
        setConfirmPin("");
      }
    } catch {
      setError("Something went wrong.");
      setConfirmPin("");
    } finally {
      setLoading(false);
    }
  };

  const handleSetupNext = () => {
    if (pin.length === 4) {
      setScreen("confirm_pin");
      setConfirmPin("");
      setError("");
    }
  };

  const PinDots = ({ value, count = 4 }: { value: string; count?: number }) => (
    <div className="flex gap-5 justify-center my-8">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          animate={{
            scale: i < value.length ? 1.2 : 1,
            backgroundColor: i < value.length ? "#f97316" : "transparent",
          }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className={`w-5 h-5 rounded-full ${
            i < value.length
              ? "bg-orange-500"
              : "border-2 border-gray-500"
          }`}
        />
      ))}
    </div>
  );

  const Numpad = ({
    onDigit,
    onBackspace,
    disabled,
  }: {
    onDigit: (d: string) => void;
    onBackspace: () => void;
    disabled: boolean;
  }) => (
    <div className="grid grid-cols-3 gap-4 w-full max-w-xs mx-auto px-4">
      {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "\u232B"].map(
        (key) => {
          if (key === "") return <div key="empty" />;
          if (key === "\u232B") {
            return (
              <motion.button
                key="back"
                whileTap={{ scale: 0.85 }}
                onClick={onBackspace}
                disabled={disabled}
                className="h-16 rounded-2xl bg-[var(--bg-button)]/80 text-[var(--text-primary)] text-2xl font-light active:bg-[var(--bg-button-hover)] disabled:opacity-50 transition-colors"
              >
                {"\u232B"}
              </motion.button>
            );
          }
          return (
            <motion.button
              key={key}
              whileTap={{ scale: 0.85 }}
              onClick={() => onDigit(key)}
              disabled={disabled}
              className="h-16 rounded-2xl bg-[var(--bg-button)]/80 text-[var(--text-primary)] text-2xl font-light active:bg-[var(--bg-button-hover)] disabled:opacity-50 transition-colors"
            >
              {key}
            </motion.button>
          );
        }
      )}
    </div>
  );

  // Screen: Pick Member
  if (screen === "pick_member") {
    return (
      <div className="relative flex flex-col items-center justify-center min-h-screen bg-[var(--bg-primary)] px-6 overflow-hidden">
        {/* Family photo backdrop */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/family-bg.jpeg')" }}
        />
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

        <div className="relative z-10 flex flex-col items-center">
          <motion.h1
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 20 }}
            className="text-3xl font-bold text-white mb-2"
          >
            Hum Paanch
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-gray-400 mb-10 text-sm"
          >
            Who are you?
          </motion.p>

          {loading ? (
            <div className="animate-spin w-8 h-8 border-4 border-orange-300 border-t-orange-500 rounded-full" />
          ) : (
            <motion.div
              className="grid grid-cols-2 gap-6"
              variants={containerVariants}
              initial="hidden"
              animate="show"
            >
              {MEMBERS.map((m) => (
                <motion.button
                  key={m.id}
                  variants={cardVariants}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleMemberTap(m.id)}
                  className="flex flex-col items-center gap-2 group"
                >
                  <div
                    className={`${m.color} w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-lg`}
                  >
                    {m.emoji}
                  </div>
                  <span className="text-white text-sm font-medium">
                    {m.name}
                  </span>
                </motion.button>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    );
  }

  // Screen: Enter PIN (login)
  if (screen === "enter_pin") {
    return (
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="relative flex flex-col items-center min-h-screen bg-[var(--bg-primary)] px-6 overflow-hidden"
      >
        {/* Family photo backdrop */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/family-bg.jpeg')" }}
        />
        <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

        <div className="relative z-10 flex flex-col items-center w-full pt-12">
          <button
            onClick={() => { setScreen("pick_member"); setPin(""); setError(""); }}
            className="absolute top-6 left-0 text-gray-300 text-sm font-medium px-2 py-1"
          >
            &larr; Back
          </button>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className={`${member?.color} w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg mt-8`}
          >
            {member?.emoji}
          </motion.div>
          <h2 className="text-2xl font-bold text-white mt-4 mb-1">Hi, {member?.name}!</h2>
          <p className="text-gray-400 text-sm">Enter your 4-digit PIN</p>

          <PinDots value={pin} />

          <div className="h-6 flex items-center">
            {error && <p className="text-red-400 text-sm">{error}</p>}
            {loading && (
              <div className="animate-spin w-5 h-5 border-2 border-orange-300 border-t-orange-500 rounded-full" />
            )}
          </div>

          <div className="mt-4 w-full">
            <Numpad
              onDigit={(d) => handlePinInput(d, "pin")}
              onBackspace={() => handleBackspace("pin")}
              disabled={loading || pin.length >= 4}
            />
          </div>
        </div>
      </motion.div>
    );
  }

  // Screen: Setup PIN (first time)
  if (screen === "setup_pin") {
    return (
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="relative flex flex-col items-center min-h-screen bg-[var(--bg-primary)] px-6 overflow-hidden"
      >
        {/* Family photo backdrop */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/family-bg.jpeg')" }}
        />
        <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

        <div className="relative z-10 flex flex-col items-center w-full pt-12">
          <button
            onClick={() => { setScreen("pick_member"); setPin(""); setError(""); }}
            className="absolute top-6 left-0 text-gray-300 text-sm font-medium px-2 py-1"
          >
            &larr; Back
          </button>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className={`${member?.color} w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg mt-8`}
          >
            {member?.emoji}
          </motion.div>
          <h2 className="text-2xl font-bold text-white mt-4 mb-1">
            Welcome, {member?.name}!
          </h2>
          <p className="text-gray-400 text-sm">Create a 4-digit PIN</p>

          <PinDots value={pin} />

          <div className="h-6 flex items-center">
            {error && <p className="text-red-400 text-sm">{error}</p>}
          </div>

          <div className="mt-4 w-full">
            <Numpad
              onDigit={(d) => handlePinInput(d, "pin")}
              onBackspace={() => handleBackspace("pin")}
              disabled={pin.length >= 4}
            />
          </div>

          <AnimatePresence>
            {pin.length === 4 && (
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSetupNext}
                className="mt-8 bg-orange-500 text-white w-full max-w-xs py-4 rounded-2xl font-semibold text-lg transition-colors"
              >
                Next &rarr;
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    );
  }

  // Screen: Confirm PIN
  if (screen === "confirm_pin") {
    return (
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="relative flex flex-col items-center min-h-screen bg-[var(--bg-primary)] px-6 overflow-hidden"
      >
        {/* Family photo backdrop */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/family-bg.jpeg')" }}
        />
        <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

        <div className="relative z-10 flex flex-col items-center w-full pt-12">
          <button
            onClick={() => { setScreen("setup_pin"); setConfirmPin(""); setError(""); }}
            className="absolute top-6 left-0 text-gray-300 text-sm font-medium px-2 py-1"
          >
            &larr; Back
          </button>

          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className={`${member?.color} w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-lg mt-8`}
          >
            {member?.emoji}
          </motion.div>
          <h2 className="text-2xl font-bold text-white mt-4 mb-1">Confirm PIN</h2>
          <p className="text-gray-400 text-sm">Re-enter your 4-digit PIN</p>

          <PinDots value={confirmPin} />

          <div className="h-6 flex items-center">
            {error && <p className="text-red-400 text-sm">{error}</p>}
            {loading && (
              <div className="animate-spin w-5 h-5 border-2 border-orange-300 border-t-orange-500 rounded-full" />
            )}
          </div>

          <div className="mt-4 w-full">
            <Numpad
              onDigit={(d) => handlePinInput(d, "confirm")}
              onBackspace={() => handleBackspace("confirm")}
              disabled={loading || confirmPin.length >= 4}
            />
          </div>
        </div>
      </motion.div>
    );
  }

  return null;
}
