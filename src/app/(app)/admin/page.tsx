import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { IconPlus } from "@/components/icons";
import { PERMISSION_LABELS, type Permission } from "@/lib/rbac/permissions";
import { formatDateTime } from "@/lib/format";
import { DEFAULT_MEDPLAN_TEMPLATE, MEDPLAN_TEMPLATE_KEY } from "@/lib/medplan/default-template";
import { RoleForm } from "./role-form";
import { UserRolesForm } from "./user-roles";
import { StatusTypeManager } from "./status-types";
import { MedplanTemplateEditor } from "./medplan-template";

export const metadata: Metadata = { title: "Administration" };

export default async function AdminPage() {
  const user = await requireUser();
  const canRoles = user.permissions.has("admin.roles");
  const canUsers = user.permissions.has("admin.users");
  const canStatuses = user.permissions.has("status.configure");
  const canTemplate = user.permissions.has("note.configure");
  if (!canRoles && !canUsers && !canStatuses && !canTemplate) redirect("/denied");

  const templateSetting = canTemplate
    ? await db.appSetting.findUnique({ where: { key: MEDPLAN_TEMPLATE_KEY } })
    : null;

  const [roles, users, statusTypes] = await Promise.all([
    canRoles || canUsers
      ? db.role.findMany({
          orderBy: { name: "asc" },
          include: { permissions: true, _count: { select: { users: true } } },
        })
      : [],
    canUsers
      ? db.user.findMany({
          orderBy: { name: "asc" },
          include: { roles: { include: { role: true } } },
        })
      : [],
    canStatuses
      ? db.crewStatusType.findMany({
          orderBy: { sortOrder: "asc" },
          include: { _count: { select: { events: true } } },
        })
      : [],
  ]);

  const roleOptions = roles.map((r) => ({ id: r.id, name: r.name, description: r.description }));

  return (
    <div className="space-y-6">
      <header>
        <p className="kicker">System</p>
        <h1 className="mt-1 text-2xl font-semibold">Administration</h1>
      </header>

      {canRoles && (
        <Card>
          <CardHeader
            title="Roles & permissions"
            action={
              <Modal title="New role" trigger={<Button variant="ghost" size="sm"><IconPlus /> New role</Button>} wide>
                <RoleForm />
              </Modal>
            }
          />
          <ul className="divide-y divide-edge">
            {roles.map((role) => (
              <li key={role.id} className="flex items-center gap-4 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">
                    {role.name}
                    {role.isSystem && (
                      <span className="ml-2 text-[10px] font-medium uppercase tracking-wider text-ink-faint">
                        system
                      </span>
                    )}
                  </p>
                  {role.description && <p className="text-[12px] text-ink-faint">{role.description}</p>}
                  <p className="mt-1.5 flex flex-wrap gap-1">
                    {role.permissions.length === 0 ? (
                      <span className="text-[11px] text-ink-faint">No permissions</span>
                    ) : (
                      role.permissions.map((p) => (
                        <span
                          key={p.permission}
                          className="rounded-full bg-surface-3 px-2 py-0.5 text-[10px] font-medium text-ink-muted"
                        >
                          {PERMISSION_LABELS[p.permission as Permission] ?? p.permission}
                        </span>
                      ))
                    )}
                  </p>
                </div>
                <span className="data text-[12px] text-ink-faint">{role._count.users} users</span>
                <Modal title={`Edit role — ${role.name}`} trigger={<Button variant="ghost" size="sm">Edit</Button>} wide>
                  <RoleForm
                    initial={{
                      id: role.id,
                      name: role.name,
                      description: role.description,
                      isSystem: role.isSystem,
                      permissions: role.permissions.map((p) => p.permission),
                    }}
                  />
                </Modal>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {canUsers && (
        <Card>
          <CardHeader title="Users" />
          {users.length === 0 ? (
            <p className="px-4 py-6 text-center text-[13px] text-ink-faint">
              Nobody has signed in yet. Users appear here after their first login.
            </p>
          ) : (
            <ul className="divide-y divide-edge">
              {users.map((u) => (
                <li key={u.id} className="flex items-center gap-4 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{u.name}</p>
                    <p className="text-[12px] text-ink-faint">{u.email}</p>
                  </div>
                  <div className="hidden flex-wrap justify-end gap-1 sm:flex">
                    {u.roles.length === 0 ? (
                      <Badge tone="warn" dot={false}>
                        No role
                      </Badge>
                    ) : (
                      u.roles.map((ur) => (
                        <Badge key={ur.roleId} tone="neutral" dot={false}>
                          {ur.role.name}
                        </Badge>
                      ))
                    )}
                  </div>
                  <span className="data hidden text-[11px] text-ink-faint lg:block">
                    {u.lastLoginAt ? `Seen ${formatDateTime(u.lastLoginAt)}` : "Never signed in"}
                  </span>
                  <Modal title={`Roles — ${u.name}`} trigger={<Button variant="ghost" size="sm">Edit roles</Button>}>
                    <UserRolesForm
                      userId={u.id}
                      allRoles={roleOptions}
                      currentRoleIds={u.roles.map((ur) => ur.roleId)}
                    />
                  </Modal>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {canTemplate && (
        <Card>
          <CardHeader title="Med plan template" />
          <div className="p-4">
            <MedplanTemplateEditor
              current={templateSetting?.value ?? DEFAULT_MEDPLAN_TEMPLATE}
              isCustomized={Boolean(templateSetting)}
            />
          </div>
        </Card>
      )}

      {canStatuses && (
        <Card>
          <CardHeader title="Crew status chain" />
          <div className="p-4">
            <StatusTypeManager
              types={statusTypes.map((t) => ({
                id: t.id,
                name: t.name,
                shortCode: t.shortCode,
                color: t.color,
                isActive: t.isActive,
                eventCount: t._count.events,
              }))}
            />
          </div>
        </Card>
      )}
    </div>
  );
}
