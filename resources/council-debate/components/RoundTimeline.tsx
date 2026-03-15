import React from "react";

const roundLabels = [
  { label: "Proposal", icon: "1" },
  { label: "Critique", icon: "2" },
  { label: "Refinement", icon: "3" },
  { label: "Vote", icon: "4" },
];

export function RoundTimeline({
  activeRound,
  onRoundChange,
}: {
  activeRound: number;
  onRoundChange: (round: number) => void;
}) {
  return (
    <div className="relative flex gap-1 px-6 py-3">
      {/* Connecting line */}
      <div
        className="absolute left-10 right-10 top-1/2 h-px bg-default/10"
        style={{ transform: "translateY(-2px)" }}
      />

      {roundLabels.map((r, i) => {
        const isActive = i === activeRound;
        const isPast = i < activeRound;
        return (
          <button
            key={i}
            onClick={() => onRoundChange(i)}
            className={`relative flex-1 flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              isActive
                ? "bg-default/10 text-default shadow-sm"
                : "text-secondary hover:bg-default/5"
            }`}
            style={{
              boxShadow: isActive ? "0 0 12px rgba(59,130,246,0.15)" : "none",
            }}
          >
            <span
              className={`w-6 h-6 flex items-center justify-center rounded-full text-[10px] font-bold transition-all ${
                isActive
                  ? "bg-default text-surface"
                  : isPast
                    ? "bg-default/20 text-default"
                    : "bg-default/10 text-secondary"
              }`}
              style={{
                boxShadow: isActive ? "0 0 8px rgba(59,130,246,0.3)" : "none",
              }}
            >
              {r.icon}
            </span>
            <span className="hidden sm:inline text-[10px]">{r.label}</span>
          </button>
        );
      })}
    </div>
  );
}
