"use client";

import { useState } from "react";
import { useTheme } from "@/lib/ThemeContext";
import { useAuth } from "@/lib/AuthContext";
import AddAssetModal, { AssetFormData } from "./AddAssetModal";
import { supabase } from "@/lib/supabase";


type Props = {
  onComplete: () => void;
};

export default function OnboardingFlow({ onComplete }: Props) {
  const { theme } = useTheme();
  const { session, refreshProfile } = useAuth();
  const isDark = theme === "dark";
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async (data: AssetFormData, addAnother: boolean) => {
    const userId = session?.user?.id;
    if (!userId) return;

    setSaving(true);
    const cleanCurrentValue = Number(
      String(data.currentValue ?? "").replace(/,/g, "").trim()
    );
    const notes = JSON.stringify({
      currency: data.currency,
      invested: Number(String(data.invested ?? "").replace(/,/g, "").trim()),
    });

    const { error } = await supabase.from("assets").insert([{
      name: data.name,
      type: data.assetType,
      value: Number.isFinite(cleanCurrentValue) ? cleanCurrentValue : 0,
      notes,
      user_id: userId,
    }]);

    setSaving(false);
    if (error) { console.error(error); return; }

    if (!addAnother) {
      // Mark onboarding complete in profiles table, then refresh context
      await supabase
        .from("profiles")
        .update({ onboarding_completed: true, updated_at: new Date().toISOString() })
        .eq("id", userId);
      await refreshProfile();
      setShowModal(false);
      onComplete();
    }
  };

  return (
    <>
      {/* Welcome backdrop */}
      <div
        className="fixed inset-0 z-40 flex flex-col items-center justify-center p-6"
        style={{ background: "var(--bg)" }}
      >
        <div
          className="w-full max-w-sm rounded-[28px] p-8 flex flex-col items-center gap-6"
          style={{
            background: isDark ? "rgba(28,28,30,1)" : "#ffffff",
            border: isDark
              ? "1px solid rgba(255,255,255,0.08)"
              : "1px solid rgba(0,0,0,0.06)",
            boxShadow: isDark
              ? "0 0 0 1px rgba(255,255,255,0.04), 0 24px 60px rgba(0,0,0,0.5)"
              : "0 2px 12px rgba(0,0,0,0.06), 0 24px 60px rgba(0,0,0,0.08)",
          }}
        >
          <div className="text-center">
            <p className="text-[42px] leading-none mb-3">💼</p>
            <h1
              className="text-[28px] font-extrabold tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              Welcome to my<span style={{ color: "#AEDD00" }}>Finance</span>
            </h1>
            <p
              className="text-[14px] mt-2.5 leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              Let&apos;s set up your financial picture.
              <br />
              Start by adding your first asset.
            </p>
          </div>

          <div
            className="w-full h-px"
            style={{ background: "var(--separator)" }}
          />

          <div className="w-full flex flex-col gap-2.5">
            <button
              onClick={() => setShowModal(true)}
              disabled={saving}
              className="w-full py-3.5 rounded-[14px] text-[15px] font-semibold transition-opacity active:opacity-70"
              style={{ background: "#AEDD00", color: "#000" }}
            >
              Add First Asset
            </button>
          </div>

          <p
            className="text-[11.5px] text-center leading-relaxed"
            style={{ color: "var(--text-tertiary)" }}
          >
            Your financial data stays private to you.
          </p>
        </div>
      </div>

      {showModal && (
        <AddAssetModal
          open={showModal}
          onClose={() => setShowModal(false)}
          onSave={handleSave}
        />
      )}
    </>
  );
}
