"use client";

import { useState } from "react";
import { SessionsTable } from "./SessionsTable";
import { ProjectsTable } from "./ProjectsTable";
import { DailyBarChart } from "./DailyBarChart";
import { ModelPieChart } from "@/components/profile/ModelPieChart";
import { ToolUsageBarChart } from "./ToolUsageBarChart";
import { TaskCategoryPieChart } from "./TaskCategoryPieChart";
import type { DailyBreakdown } from "@klic/shared";

interface SessionRow {
  sessionId: string;
  projectName: string;
  totalTokens: number;
  totalCost: number;
  turnsCount: number;
  modelsUsed: string[];
  sessionStart: Date | null;
  sessionEnd: Date | null;
  source: string;
  hostname: string | null;
}

interface ProjectRow {
  projectName: string;
  totalTokens: number;
  totalCost: number;
  sessionsCount: number;
}

interface DashboardTabsProps {
  stats: { label: string; value: string }[];
  dailyData: DailyBreakdown[];
  modelData: { name: string; value: number }[];
  toolData: { name: string; value: number }[];
  taskData: { name: string; value: number }[];
  projects: ProjectRow[];
  sessions: SessionRow[];
}

type TabKey = "overview" | "sessions" | "projects";

export function DashboardTabs({ stats, dailyData, modelData, toolData, taskData, projects, sessions }: DashboardTabsProps) {
  const [tab, setTab] = useState<TabKey>("overview");

  const tabs: { key: TabKey; label: string }[] = [
    { key: "overview", label: "개요" },
    { key: "sessions", label: `세션 (${sessions.length})` },
    { key: "projects", label: `프로젝트 (${projects.length})` },
  ];

  return (
    <div className="space-y-6">
      {/* Stats grid - always visible */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg border border-border p-3 space-y-1">
            <p className="text-xs text-muted-foreground">{s.label}</p>
            <p className="text-lg font-bold font-mono text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tab buttons */}
      <div className="flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t.key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "overview" && (
        <div className="space-y-6">
          {dailyData.length > 0 ? (
            <DailyBarChart data={dailyData} title="일별 토큰 사용량" />
          ) : (
            <div className="rounded-lg border border-border p-8 text-center text-muted-foreground text-sm">
              해당 기간에 데이터가 없습니다.
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ToolUsageBarChart data={toolData} title="도구 사용량" />
            <TaskCategoryPieChart data={taskData} title="작업 유형별 비중" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {modelData.length > 0 && (
              <ModelPieChart data={modelData} title="모델별 토큰 비중" />
            )}
            {projects.length > 0 && (
              <ProjectsTable projects={projects} />
            )}
          </div>
        </div>
      )}

      {tab === "sessions" && (
        sessions.length > 0 ? (
          <SessionsTable sessions={sessions} />
        ) : (
          <div className="rounded-lg border border-border p-8 text-center text-muted-foreground text-sm">
            세션 데이터가 없습니다
          </div>
        )
      )}

      {tab === "projects" && (
        projects.length > 0 ? (
          <ProjectsTable projects={projects} />
        ) : (
          <div className="rounded-lg border border-border p-8 text-center text-muted-foreground text-sm">
            프로젝트 데이터가 없습니다
          </div>
        )
      )}
    </div>
  );
}
