"use client";

type ProofStripPillar = {
  key: string;
  chipLabel: string;
};

interface HeroProofStripProps {
  pillars: ProofStripPillar[];
  sectionId: string;
}

const HIGHLIGHT_CLASS = "proof-card-highlight";
const HIGHLIGHT_DURATION_MS = 2000;

export function HeroProofStrip({ pillars, sectionId }: HeroProofStripProps) {
  const activatePillar = (key: string) => {
    const section = document.getElementById(sectionId);
    const targetCard = document.getElementById(`proof-${key}`);

    section?.scrollIntoView({ behavior: "auto", block: "start" });

    if (window.location.hash !== `#${sectionId}`) {
      window.history.replaceState(null, "", `#${sectionId}`);
    }

    if (!targetCard) return;

    // Replay highlight on repeated clicks by resetting the class first.
    targetCard.classList.remove(HIGHLIGHT_CLASS);
    void targetCard.offsetWidth;
    targetCard.classList.add(HIGHLIGHT_CLASS);

    window.setTimeout(() => {
      targetCard.classList.remove(HIGHLIGHT_CLASS);
    }, HIGHLIGHT_DURATION_MS);
  };

  return (
    <div className="mx-auto mt-6 flex max-w-4xl flex-wrap items-center justify-center gap-2">
      {pillars.map((pillar) => (
        <button
          key={pillar.key}
          type="button"
          data-testid={`proof-chip-${pillar.key}`}
          onClick={() => activatePillar(pillar.key)}
          className="focus-ring inline-flex rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-border-strong hover:text-foreground"
        >
          {pillar.chipLabel}
        </button>
      ))}
    </div>
  );
}
