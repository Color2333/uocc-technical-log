"use client";

import { ArchDiagram } from "@/components/architecture/arch-diagram";
import { WhatsNew } from "@/components/diff/whats-new";
import { DesignDecisions } from "@/components/architecture/design-decisions";
import { DocRenderer } from "@/components/docs/doc-renderer";
import { VersionCodeTab } from "@/components/docs/version-code-tab";
import { ExecutionFlow } from "@/components/architecture/execution-flow";
import { SessionVisualization } from "@/components/visualizations";
import { Tabs } from "@/components/ui/tabs";
import { useTranslations } from "@/lib/i18n";

const VISUALIZABLE_VERSIONS = ["u01", "u02", "u03", "u04", "u05", "u06", "u07", "u08", "u09", "u10", "u11", "u12"];

interface VersionDetailClientProps {
  version: string;
  diff: {
    from: string;
    to: string;
    newClasses: string[];
    newFunctions: string[];
    newTools: string[];
    locDelta: number;
  } | null;
  source: string;
  filename: string;
}

export function VersionDetailClient({
  version,
  diff,
  source,
  filename,
}: VersionDetailClientProps) {
  const t = useTranslations("version");

  const tabs = [
    { id: "learn", label: t("tab_learn") },
    { id: "simulate", label: t("tab_simulate") },
    { id: "code", label: t("tab_code") },
    { id: "deep-dive", label: t("tab_deep_dive") },
  ];

  return (
    <div className="space-y-6">
      <SessionVisualization version={version} />

      <Tabs tabs={tabs} defaultTab="learn">
        {(activeTab) => (
          <>
            {activeTab === "learn" && <DocRenderer version={version} />}
            {activeTab === "simulate" && (
              VISUALIZABLE_VERSIONS.includes(version) ? (
                <SessionVisualization version={version} />
              ) : (
                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-12 text-center">
                  <p className="text-[var(--color-text-secondary)]">该章节暂无模拟动画</p>
                </div>
              )
            )}
            {activeTab === "code" && <VersionCodeTab version={version} />}
            {activeTab === "deep-dive" && (
              <div className="space-y-8">
                <section>
                  <h2 className="mb-4 text-xl font-semibold">
                    {t("execution_flow")}
                  </h2>
                  <ExecutionFlow version={version} />
                </section>
                <section>
                  <h2 className="mb-4 text-xl font-semibold">
                    {t("architecture")}
                  </h2>
                  <ArchDiagram version={version} />
                </section>
                {diff && <WhatsNew diff={diff} />}
                <DesignDecisions version={version} />
              </div>
            )}
          </>
        )}
      </Tabs>
    </div>
  );
}
