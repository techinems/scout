import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { IconPlus } from "@/components/icons";
import { FacilityForm } from "./facility-form";
import { FacilityRowActions } from "./row-actions";
import { CategoryManager } from "./category-manager";

export const metadata: Metadata = { title: "Facilities" };

export default async function FacilitiesPage() {
  const user = await requirePermission("facility.view");
  const canEdit = user.permissions.has("facility.edit");

  const categories = await db.facilityCategory.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      facilities: { orderBy: { name: "asc" } },
      _count: { select: { facilities: true } },
    },
  });

  const categoryOptions = categories.map((c) => ({ id: c.id, name: c.name }));

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="kicker">Receiving & support</p>
          <h1 className="mt-1 text-2xl font-semibold">Facilities</h1>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <Modal title="Facility categories" trigger={<Button variant="outline">Categories</Button>} wide>
              <CategoryManager
                categories={categories.map((c) => ({
                  id: c.id,
                  name: c.name,
                  noteLabel: c.noteLabel,
                  color: c.color,
                  isSystem: c.isSystem,
                  isAeromedical: c.isAeromedical,
                  facilityCount: c._count.facilities,
                }))}
              />
            </Modal>
            <Modal
              title="Add facility"
              trigger={
                <Button>
                  <IconPlus /> Add facility
                </Button>
              }
            >
              <FacilityForm categories={categoryOptions} />
            </Modal>
          </div>
        )}
      </header>

      {categories.map((category) => (
        <section key={category.id}>
          <div className="mb-2 flex items-center gap-2.5">
            <span className="size-2.5 rounded-full" style={{ backgroundColor: category.color }} />
            <h2 className="kicker !text-ink-muted">{category.name}</h2>
            <span className="data text-[11px] text-ink-faint">{category._count.facilities}</span>
          </div>

          {category.facilities.length === 0 ? (
            <p className="rounded-(--radius-card) border border-dashed border-edge px-4 py-5 text-center text-[13px] text-ink-faint">
              No facilities in this category yet.
            </p>
          ) : (
            <div className="overflow-hidden rounded-(--radius-card) border border-edge bg-surface">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-edge">
                  {category.facilities.map((f) => (
                    <tr key={f.id} className={f.isActive ? "" : "opacity-45"}>
                      <td className="px-4 py-3">
                        <p className="font-medium">
                          {f.name}
                          {!f.isActive && <span className="ml-2 text-[11px] text-ink-faint">(inactive)</span>}
                        </p>
                        <p className="mt-0.5 text-[13px] text-ink-faint">{f.address}</p>
                      </td>
                      <td className="hidden px-3 py-3 md:table-cell">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          {f.traumaLevel && <Badge tone="danger" dot={false}>Trauma {f.traumaLevel}</Badge>}
                          {f.hasHelipad && <Badge tone="info" dot={false}>Helipad</Badge>}
                        </div>
                      </td>
                      <td className="data hidden whitespace-nowrap px-3 py-3 text-right text-[13px] text-ink-muted lg:table-cell">
                        {f.phone}
                      </td>
                      {canEdit && (
                        <td className="whitespace-nowrap px-3 py-3 text-right">
                          <FacilityRowActions
                            facility={{
                              id: f.id,
                              name: f.name,
                              categoryId: f.categoryId,
                              address: f.address,
                              phone: f.phone,
                              traumaLevel: f.traumaLevel,
                              hasHelipad: f.hasHelipad,
                              notes: f.notes,
                              isActive: f.isActive,
                            }}
                            categories={categoryOptions}
                          />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
