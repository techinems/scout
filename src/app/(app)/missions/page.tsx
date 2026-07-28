import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import type { MissionStatus } from "@/generated/prisma/enums";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { IconChevronRight, IconPlus } from "@/components/icons";
import { MISSION_STATUS_LABEL, MISSION_STATUS_TONE, MISSION_STATUSES } from "@/lib/mission-status";
import { formatGoTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import { MissionCreateForm } from "./mission-create-form";

export const metadata: Metadata = { title: "Missions" };

const FILTERS = ["OPEN", ...MISSION_STATUSES] as const;

export default async function MissionsPage({
  searchParams,
}: {
  searchParams: Promise<{ f?: string }>;
}) {
  const user = await requirePermission("mission.view");
  const canEdit = user.permissions.has("mission.edit");
  const { f } = await searchParams;
  const filter = FILTERS.includes((f ?? "OPEN") as (typeof FILTERS)[number]) ? ((f ?? "OPEN") as (typeof FILTERS)[number]) : "OPEN";

  const where =
    filter === "OPEN"
      ? { status: { in: ["DRAFT", "PLANNED", "ACTIVE"] as MissionStatus[] } }
      : { status: filter as MissionStatus };

  const missions = await db.mission.findMany({
    where,
    orderBy: [{ goTime: { sort: "asc", nulls: "last" } }, { updatedAt: "desc" }],
    include: {
      locations: { where: { kind: "TARGET" }, take: 1 },
      _count: { select: { assignments: true, vehicles: true } },
    },
  });

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="kicker">Operations</p>
          <h1 className="mt-1 text-2xl font-semibold">Missions</h1>
        </div>
        {canEdit && (
          <Modal
            title="New mission"
            trigger={
              <Button>
                <IconPlus /> New mission
              </Button>
            }
          >
            <MissionCreateForm />
          </Modal>
        )}
      </header>

      <nav className="flex gap-1.5 overflow-x-auto">
        {FILTERS.map((s) => (
          <Link
            key={s}
            href={s === "OPEN" ? "/missions" : `/missions?f=${s}`}
            className={cn(
              "rounded-full border px-3 py-1 text-[12px] font-semibold uppercase tracking-wider transition-colors",
              filter === s
                ? "border-accent/50 bg-accent-soft text-accent-bright"
                : "border-edge text-ink-faint hover:border-edge-strong hover:text-ink-muted",
            )}
          >
            {s === "OPEN" ? "Open" : MISSION_STATUS_LABEL[s as MissionStatus]}
          </Link>
        ))}
      </nav>

      {missions.length === 0 ? (
        <p className="rounded-(--radius-card) border border-dashed border-edge px-4 py-12 text-center text-sm text-ink-faint">
          No {filter === "OPEN" ? "open" : MISSION_STATUS_LABEL[filter as MissionStatus].toLowerCase()} missions.
        </p>
      ) : (
        <ul className="space-y-2">
          {missions.map((m) => (
            <li key={m.id}>
              <Link
                href={`/missions/${m.id}`}
                className="group flex items-center gap-4 rounded-(--radius-card) border border-edge bg-surface px-4 py-3.5 transition-colors hover:border-edge-strong hover:bg-surface-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{m.name}</p>
                  <p className="mt-0.5 truncate text-[13px] text-ink-faint">
                    {m.locations[0]?.address ?? "No target location set"}
                  </p>
                </div>
                <div className="hidden text-right text-[12px] text-ink-faint sm:block">
                  <p>{m._count.assignments} personnel</p>
                  <p>{m._count.vehicles} vehicles</p>
                </div>
                <span className="data w-44 text-right text-[13px] text-ink-muted">{formatGoTime(m.goTime)}</span>
                <Badge tone={MISSION_STATUS_TONE[m.status]}>{MISSION_STATUS_LABEL[m.status]}</Badge>
                <IconChevronRight className="size-4 text-ink-faint transition-colors group-hover:text-ink" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
