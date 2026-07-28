"use client";

import { useTransition } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { IconTrash } from "@/components/icons";
import { deleteFacility, setFacilityActive } from "./actions";
import { FacilityForm, type CategoryOption, type FacilityFormData } from "./facility-form";

export function FacilityRowActions({
  facility,
  categories,
}: {
  facility: FacilityFormData & { isActive: boolean };
  categories: CategoryOption[];
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-end gap-1.5">
      <Modal
        title="Edit facility"
        trigger={
          <Button variant="ghost" size="sm">
            Edit
          </Button>
        }
      >
        <FacilityForm categories={categories} initial={facility} />
      </Modal>
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => startTransition(async () => { await setFacilityActive(facility.id, !facility.isActive); })}
      >
        {facility.isActive ? "Deactivate" : "Reactivate"}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        className="!text-ink-faint hover:!text-danger"
        onClick={() => {
          if (confirm(`Delete "${facility.name}"? This cannot be undone.`)) {
            startTransition(async () => { await deleteFacility(facility.id); });
          }
        }}
        aria-label="Delete facility"
      >
        <IconTrash />
      </Button>
    </div>
  );
}
