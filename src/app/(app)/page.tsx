import Link from "next/link";
import { requireUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IconChevronRight } from "@/components/icons";
import { MISSION_STATUS_TONE, MISSION_STATUS_LABEL } from "@/lib/mission-status";
import { formatGoTime } from "@/lib/format";

export default async function OverviewPage() {
  const user = await requireUser();
  const canSeeMissions = user.permissions.has("mission.view");

  const [activeMissions, upcoming, facilityCount, personnelCount, vehicleCount] = await Promise.all([
    canSeeMissions
      ? db.mission.findMany({
          where: { status: "ACTIVE" },
          orderBy: { goTime: "asc" },
          include: { locations: { where: { kind: "TARGET" }, take: 1 } },
        })
      : [],
    canSeeMissions
      ? db.mission.findMany({
          where: { status: { in: ["DRAFT", "PLANNED"] } },
          orderBy: [{ goTime: { sort: "asc", nulls: "last" } }, { updatedAt: "desc" }],
          take: 6,
          include: { locations: { where: { kind: "TARGET" }, take: 1 }, assignments: true },
        })
      : [],
    user.permissions.has("facility.view") ? db.facility.count({ where: { isActive: true } }) : null,
    user.permissions.has("personnel.view") ? db.personnel.count({ where: { isActive: true } }) : null,
    user.permissions.has("vehicle.view") ? db.vehicle.count({ where: { isActive: true } }) : null,
  ]);

  const hour = new Date().getHours();
  const greeting = hour < 5 ? "Overnight watch" : hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-8">
      <header>
        <p className="kicker">{greeting}</p>
        <h1 className="mt-1 text-2xl font-semibold">{user.name.split(" ")[0]}</h1>
      </header>

      {activeMissions.length > 0 && (
        <section className="space-y-2">
          {activeMissions.map((m) => (
            <Link key={m.id} href={`/missions/${m.id}`} className="group block">
              <div className="flex items-center gap-4 rounded-(--radius-card) border border-accent/40 bg-accent-soft px-4 py-3 transition-colors group-hover:border-accent">
                <span className="relative flex size-2.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-accent opacity-60" />
                  <span className="relative inline-flex size-2.5 rounded-full bg-accent" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{m.name}</p>
                  <p className="truncate text-[13px] text-ink-muted">
                    {m.locations[0]?.address ?? "No target set"}
                  </p>
                </div>
                <span className="data text-[13px] text-ink-muted">{formatGoTime(m.goTime)}</span>
                <IconChevronRight className="size-4 text-accent" />
              </div>
            </Link>
          ))}
        </section>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Facilities on file" value={facilityCount} href="/facilities" />
        <StatTile label="Active personnel" value={personnelCount} href="/personnel" />
        <StatTile label="Vehicles in service" value={vehicleCount} href="/vehicles" />
      </div>

      {canSeeMissions && (
        <Card>
          <CardHeader
            title="Upcoming missions"
            action={
              <Link href="/missions" className="text-[13px] font-medium text-accent-bright hover:text-accent">
                All missions →
              </Link>
            }
          />
          {upcoming.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-ink-faint">
              Nothing scheduled. Create a mission to get started.
            </p>
          ) : (
            <ul className="divide-y divide-edge">
              {upcoming.map((m) => (
                <li key={m.id}>
                  <Link
                    href={`/missions/${m.id}`}
                    className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-surface-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{m.name}</p>
                      <p className="truncate text-[13px] text-ink-faint">
                        {m.locations[0]?.address ?? "No target location"}
                      </p>
                    </div>
                    <span className="text-[12px] text-ink-faint">
                      {m.assignments.length} assigned
                    </span>
                    <span className="data w-40 text-right text-[13px] text-ink-muted">
                      {formatGoTime(m.goTime)}
                    </span>
                    <Badge tone={MISSION_STATUS_TONE[m.status]}>{MISSION_STATUS_LABEL[m.status]}</Badge>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}

function StatTile({ label, value, href }: { label: string; value: number | null; href: string }) {
  if (value === null) return null;
  return (
    <Link href={href} className="group">
      <Card className="px-4 py-4 transition-colors group-hover:border-edge-strong">
        <p className="data text-3xl font-semibold">{value}</p>
        <p className="kicker mt-1.5">{label}</p>
      </Card>
    </Link>
  );
}
