"use client";

import { useTransition } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { IconTrash } from "@/components/icons";
import { deletePersonnel, setPersonnelActive } from "./actions";
import { PersonnelForm, type PersonnelFormData } from "./personnel-form";

export function PersonnelRowActions({
  person,
  agencies,
}: {
  person: PersonnelFormData & { isActive: boolean };
  agencies: string[];
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-end gap-1.5">
      <Modal title="Edit personnel" trigger={<Button variant="ghost" size="sm">Edit</Button>}>
        <PersonnelForm initial={person} agencies={agencies} />
      </Modal>
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => startTransition(async () => { await setPersonnelActive(person.id, !person.isActive); })}
      >
        {person.isActive ? "Deactivate" : "Reactivate"}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        className="!text-ink-faint hover:!text-danger"
        onClick={() => {
          if (confirm(`Delete "${person.name}"? Mission assignments will be removed too.`)) {
            startTransition(async () => { await deletePersonnel(person.id); });
          }
        }}
        aria-label="Delete personnel"
      >
        <IconTrash />
      </Button>
    </div>
  );
}
