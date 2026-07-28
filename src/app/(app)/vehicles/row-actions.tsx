"use client";

import { useTransition } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { IconTrash } from "@/components/icons";
import { deleteVehicle, setVehicleActive } from "./actions";
import { VehicleForm, type VehicleFormData } from "./vehicle-form";

export function VehicleRowActions({ vehicle }: { vehicle: VehicleFormData & { isActive: boolean } }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-end gap-1.5">
      <Modal title="Edit vehicle" trigger={<Button variant="ghost" size="sm">Edit</Button>}>
        <VehicleForm initial={vehicle} />
      </Modal>
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => startTransition(async () => { await setVehicleActive(vehicle.id, !vehicle.isActive); })}
      >
        {vehicle.isActive ? "Deactivate" : "Reactivate"}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        className="!text-ink-faint hover:!text-danger"
        onClick={() => {
          if (confirm(`Delete "${vehicle.designator}"? Mission assignments will be removed too.`)) {
            startTransition(async () => { await deleteVehicle(vehicle.id); });
          }
        }}
        aria-label="Delete vehicle"
      >
        <IconTrash />
      </Button>
    </div>
  );
}
