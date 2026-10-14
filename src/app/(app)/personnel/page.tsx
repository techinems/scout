import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { appConfig } from "@/lib/app-config";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { IconPlus } from "@/components/icons";
import { PersonnelForm } from "./personnel-form";
import { PersonnelRowActions } from "./row-actions";

export const metadata: Metadata = { title: "Personnel" };

export default async function PersonnelPage() {
  const user = await requirePermission("personnel.view");
  const canEdit = user.permissions.has("personnel.edit");

  const people = await db.personnel.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    include: { _count: { select: { assignments: true } } },
  });

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="kicker">Team roster</p>
          <h1 className="mt-1 text-2xl font-semibold">Personnel</h1>
        </div>
        {canEdit && (
          <Modal
            title="Add personnel"
            trigger={
              <Button>
                <IconPlus /> Add personnel
              </Button>
            }
          >
            <PersonnelForm agencies={appConfig.agencies} />
          </Modal>
        )}
      </header>

      {people.length === 0 ? (
        <p className="rounded-(--radius-card) border border-dashed border-edge px-4 py-10 text-center text-sm text-ink-faint">
          No personnel on the roster yet.
        </p>
      ) : (
        <div className="overflow-hidden rounded-(--radius-card) border border-edge bg-surface">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-edge text-left">
                <th className="kicker px-4 py-2.5 !text-ink-faint font-semibold">Name</th>
                <th className="kicker hidden px-3 py-2.5 !text-ink-faint font-semibold sm:table-cell">Title</th>
                <th className="kicker hidden px-3 py-2.5 !text-ink-faint font-semibold md:table-cell">Contact</th>
                <th className="kicker px-3 py-2.5 text-right !text-ink-faint font-semibold">Missions</th>
                {canEdit && <th />}
              </tr>
            </thead>
            <tbody className="divide-y divide-edge">
              {people.map((p) => (
                <tr key={p.id} className={p.isActive ? "" : "opacity-45"}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div>
                        <p className="font-medium">
                          {p.name}
                          {!p.isActive && <span className="ml-2 text-[11px] text-ink-faint">(inactive)</span>}
                        </p>
                        <p className="text-[12px] text-ink-faint">{p.agency}</p>
                      </div>
                      {p.callsign && (
                        <Badge tone="accent" dot={false} className="data">
                          {p.callsign}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="hidden px-3 py-3 text-ink-muted sm:table-cell">{p.title}</td>
                  <td className="hidden px-3 py-3 md:table-cell">
                    <p className="data text-[13px] text-ink-muted">{p.phone}</p>
                    <p className="text-[12px] text-ink-faint">{p.email}</p>
                  </td>
                  <td className="data px-3 py-3 text-right text-ink-muted">{p._count.assignments}</td>
                  {canEdit && (
                    <td className="whitespace-nowrap px-3 py-3 text-right">
                      <PersonnelRowActions
                        agencies={appConfig.agencies}
                        person={{
                          id: p.id,
                          name: p.name,
                          callsign: p.callsign,
                          title: p.title,
                          agency: p.agency,
                          phone: p.phone,
                          email: p.email,
                          isActive: p.isActive,
                        }}
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
