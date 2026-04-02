"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import api from "@/lib/api";
import { HqOnly } from "@/components/admin/HqOnly";
import { useAuth } from "@/providers/AuthProvider";
import { apiErrorMessage } from "@/lib/apiErrorMessage";
import { useToast } from "@/providers/ToastProvider";
import { useConfirmDialog } from "@/hooks/useConfirmDialog";
import { useFilteredRows } from "@/hooks/useFilteredRows";
import { TableSearchInput } from "@/components/ui/TableSearchInput";
import {
  IconBtnArrowPath,
  IconBtnCheck,
  IconBtnPencil,
  IconBtnPlus,
  IconBtnXMark,
} from "@/components/ui/ButtonIcons";

type Branch = { id: number; branch_name: string };

type UserRow = {
  id: number;
  username: string;
  role: string;
  branch_id: number;
  branch: { id: number; branch_name: string };
};

type CreateForm = {
  username: string;
  password: string;
  branch_id: string;
  role: string;
};

export default function UsersSetupPage() {
  const { user: me } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<number | null>(null);
  const [editBranch, setEditBranch] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [tableSearch, setTableSearch] = useState("");
  const [confirmDialog, confirm] = useConfirmDialog();
  const toast = useToast();
  const { register, handleSubmit, reset } = useForm<CreateForm>({
    defaultValues: {
      username: "",
      password: "",
      branch_id: "",
      role: "admin",
    },
  });

  const load = useCallback(async () => {
    try {
      const [bRes, uRes] = await Promise.all([
        api.get<Branch[]>("/hq/branches"),
        api.get<UserRow[]>("/hq/users"),
      ]);
      setBranches(bRes.data);
      setRows(uRes.data);
    } catch {
      toast.error("Failed to load users.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const userRowText = useCallback(
    (u: UserRow) =>
      [
        u.username,
        u.role,
        u.branch.branch_name,
        String(u.branch_id),
        String(u.id),
      ].join(" "),
    []
  );
  const filteredRows = useFilteredRows(rows, tableSearch, userRowText);

  const onCreate = handleSubmit(async (v) => {
    const ok = await confirm({
      title: "Create user?",
      message: `Create login “${v.username.trim()}” for the selected branch and role?`,
    });
    if (!ok) return;
    try {
      await api.post("/hq/users", {
        username: v.username.trim(),
        password: v.password,
        branch_id: Number(v.branch_id),
        role: v.role,
      });
      reset({
        username: "",
        password: "",
        branch_id: "",
        role: "admin",
      });
      toast.success("User created.");
      await load();
    } catch (e: unknown) {
      toast.error(apiErrorMessage(e, "Could not create user."));
    }
  });

  function startEdit(u: UserRow) {
    setEditing(u.id);
    setEditBranch(String(u.branch_id));
    setEditRole(u.role);
    setEditPassword("");
  }

  async function saveEdit(id: number) {
    const ok = await confirm({
      title: "Save user changes?",
      message: editPassword.trim()
        ? "Update branch, role, and password for this user?"
        : "Update branch and role for this user?",
    });
    if (!ok) return;
    const body: Record<string, unknown> = {
      branch_id: Number(editBranch),
      role: editRole,
    };
    if (editPassword.trim()) body.password = editPassword;
    try {
      await api.put(`/hq/users/${id}`, body);
      setEditing(null);
      setEditPassword("");
      toast.success("User updated.");
      await load();
    } catch (e: unknown) {
      toast.error(apiErrorMessage(e, "Update failed."));
    }
  }

  return (
    <HqOnly>
      <div className="space-y-8">
        {confirmDialog}
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Users</h1>
          <p className="text-sm text-slate-600">
            Create staff logins and assign them to a branch. Admin uses day-to-day
            data for that branch only. HQ can open multi-branch screens (this sidebar
            section). You are logged in as{" "}
            <span className="font-mono text-slate-800">{me?.username}</span>.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">New user</h2>
          <form
            className="mt-4 grid gap-3 sm:grid-cols-2"
            onSubmit={onCreate}
          >
            <div>
              <label className="text-sm font-medium text-slate-700">Username *</label>
              <input
                required
                autoComplete="username"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                {...register("username", { required: true })}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">
                Password * (min 6)
              </label>
              <input
                required
                type="password"
                autoComplete="new-password"
                minLength={6}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                {...register("password", { required: true, minLength: 6 })}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Branch *</label>
              <select
                required
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                {...register("branch_id", { required: true })}
              >
                <option value="">Select branch</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.branch_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Role *</label>
              <select
                required
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                {...register("role", { required: true })}
              >
                <option value="admin">Admin (branch workspace)</option>
                <option value="hq">HQ (multi-branch + setup)</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                disabled={branches.length === 0}
                className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-900 disabled:opacity-50"
              >
                <IconBtnPlus className="h-4 w-4" />
                Create user
              </button>
            </div>
          </form>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-3 py-2">
            <h2 className="font-semibold text-slate-900">All users</h2>
            <TableSearchInput
              value={tableSearch}
              onChange={setTableSearch}
              placeholder="Search username, branch, role…"
              className="ml-auto max-w-xs"
            />
            <span className="text-xs text-slate-500">
              {filteredRows.length} of {rows.length}
            </span>
            <button
              type="button"
              onClick={() => load()}
              className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:underline"
            >
              <IconBtnArrowPath className="h-3.5 w-3.5" />
              Refresh
            </button>
          </div>
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 font-medium">User</th>
                <th className="px-3 py-2 font-medium">Branch</th>
                <th className="px-3 py-2 font-medium">Role</th>
                <th className="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-slate-500">
                    Loading…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-slate-500">
                    No users.
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-slate-500">
                    No rows match your search.
                  </td>
                </tr>
              ) : (
                filteredRows.map((u) => (
                  <tr key={u.id} className="border-b border-slate-100 align-top">
                    <td className="px-3 py-2">
                      <span className="font-mono font-medium text-slate-900">
                        {u.username}
                      </span>
                      {u.id === me?.user_id && (
                        <span className="ml-2 text-xs text-slate-500">(you)</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {editing === u.id ? (
                        <select
                          value={editBranch}
                          onChange={(e) => setEditBranch(e.target.value)}
                          className="w-full max-w-[12rem] rounded-md border border-slate-300 px-2 py-1 text-sm"
                        >
                          {branches.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.branch_name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-slate-800">{u.branch.branch_name}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {editing === u.id ? (
                        <select
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value)}
                          className="rounded-md border border-slate-300 px-2 py-1 text-sm"
                        >
                          <option value="admin">admin</option>
                          <option value="hq">hq</option>
                        </select>
                      ) : (
                        <span className="capitalize text-slate-700">{u.role}</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {editing === u.id ? (
                        <div className="flex max-w-xs flex-col gap-2">
                          <input
                            type="password"
                            autoComplete="new-password"
                            placeholder="New password (optional)"
                            value={editPassword}
                            onChange={(e) => setEditPassword(e.target.value)}
                            className="rounded-md border border-slate-300 px-2 py-1 text-xs"
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => saveEdit(u.id)}
                              className="inline-flex items-center gap-0.5 rounded border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
                            >
                              <IconBtnCheck className="h-3 w-3" />
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditing(null)}
                              className="inline-flex items-center gap-0.5 rounded border border-slate-200 px-2 py-1 text-xs"
                            >
                              <IconBtnXMark className="h-3 w-3" />
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEdit(u)}
                          className="inline-flex items-center gap-0.5 rounded border border-slate-200 px-2 py-1 text-xs hover:bg-slate-50"
                        >
                          <IconBtnPencil className="h-3 w-3" />
                          Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </HqOnly>
  );
}
