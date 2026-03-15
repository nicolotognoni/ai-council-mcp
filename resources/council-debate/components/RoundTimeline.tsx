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
    <div className="flex gap-1 px-6 py-2">
      {roundLabels.map((r, i) => {
        const isActive = i === activeRound;
        return (
          <button
            key={i}
            onClick={() => onRoundChange(i)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              isActive
                ? "bg-default/10 text-default shadow-sm"
                : "text-secondary hover:bg-default/5"
            }`}
          >
            <span
              className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold ${
                isActive
                  ? "bg-default text-surface"
                  : "bg-default/10 text-secondary"
              }`}
            >
              {r.icon}
            </span>
            <span className="hidden sm:inline">{r.label}</span>
          </button>
        );
      })}
    </div>
  );
}
