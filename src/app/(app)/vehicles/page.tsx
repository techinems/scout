import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { IconPlus } from "@/components/icons";
import { VehicleForm } from "./vehicle-form";
import { VehicleRowActions } from "./row-actions";

export const metadata: Metadata = { title: "Vehicles" };

export default async function VehiclesPage() {
  const user = await requirePermission("vehicle.view");
  const canEdit = user.permissions.has("vehicle.edit");

  const vehicles = await db.vehicle.findMany({
    orderBy: [{ isActive: "desc" }, { designator: "asc" }],
    include: { _count: { select: { missionVehicles: true } } },
  });

  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="kicker">Fleet</p>
          <h1 className="mt-1 text-2xl font-semibold">Vehicles</h1>
        </div>
        {canEdit && (
          <Modal
            title="Add vehicle"
            trigger={
              <Button>
                <IconPlus /> Add vehicle
              </Button>
            }
          >
            <VehicleForm />
          </Modal>
        )}
      </header>

      {vehicles.length === 0 ? (
        <p className="rounded-(--radius-card) border border-dashed border-edge px-4 py-10 text-center text-sm text-ink-faint">
          No vehicles in the fleet yet.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((v) => (
            <div
              key={v.id}
              className={`rounded-(--radius-card) border border-edge bg-surface p-4 ${v.isActive ? "" : "opacity-45"}`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="data text-lg font-semibold">{v.designator}</p>
                <span className="data text-[11px] text-ink-faint">{v._count.missionVehicles} msn</span>
              </div>
              <p className="mt-0.5 text-[13px] text-ink-muted">{v.type || "—"}</p>
              {v.plate && <p className="data mt-2 text-[12px] text-ink-faint">{v.plate}</p>}
              {v.notes && <p className="mt-2 line-clamp-2 text-[12px] text-ink-faint">{v.notes}</p>}
              {canEdit && (
                <div className="mt-3 border-t border-edge pt-2">
                  <VehicleRowActions
                    vehicle={{
                      id: v.id,
                      designator: v.designator,
                      type: v.type,
                      plate: v.plate,
                      notes: v.notes,
                      isActive: v.isActive,
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
