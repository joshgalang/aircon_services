"use client";

import { useCallback, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import api from "@/lib/api";
import { HqOnly } from "@/components/admin/HqOnly";
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

type Branch = {
  id: number;
  branch_name: string;
  address: string | null;
  created_at?: string;
};

type CreateForm = { branch_name: string; address: string };

export default function BranchesSetupPage() {
  const [rows, setRows] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [tableSearch, setTableSearch] = useState("");
  const [confirmDialog, confirm] = useConfirmDialog();
  const toast = useToast();
  const { register, handleSubmit, reset } = useForm<CreateForm>({
    defaultValues: { branch_name: "", address: "" },
  });

  const load = useCallback(async () => {
    try {
      const { data } = await api.get<Branch[]>("/hq/branches");
      setRows(data);
    } catch {
      toast.error("Failed to load branches.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const branchRowText = useCallback(
    (b: Branch) =>
      [String(b.id), b.branch_name, b.address ?? ""].filter(Boolean).join(" "),
    []
  );
  const filteredRows = useFilteredRows(rows, tableSearch, branchRowText);

  const onCreate = handleSubmit(async (v) => {
    const ok = await confirm({
      title: "Create branch?",
      message: `Add service location “${v.branch_name.trim()}”?`,
    });
    if (!ok) return;
    try {
      await api.post("/hq/branches", {
        branch_name: v.branch_name.trim(),
        address: v.address.trim() || undefined,
      });
      reset();
      toast.success("Branch created.");
      await load();
    } catch (e: unknown) {
      toast.error(apiErrorMessage(e, "Could not create branch."));
    }
  });

  function startEdit(b: Branch) {
    setEditing(b.id);
    setEditName(b.branch_name);
    setEditAddress(b.address ?? "");
  }

  async function saveEdit(id: number) {
    const ok = await confirm({
      title: "Save branch?",
      message: "Update this branch name and address?",
    });
    if (!ok) return;
    try {
      await api.put(`/hq/branches/${id}`, {
        branch_name: editName.trim(),
        address: editAddress.trim() || null,
      });
      setEditing(null);
      toast.success("Branch updated.");
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
          <h1 className="text-2xl font-bold text-slate-900">Branches</h1>
          <p className="text-sm text-slate-600">
            Create and rename service locations. Staff logins are tied to a branch;
            assign users on the{" "}
            <a href="/setup/users" className="text-brand-600 hover:underline">
              Users
            </a>{" "}
            page. HQ dashboards use these branches for roll-ups.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Add branch</h2>
          <form
            className="mt-4 grid gap-3 sm:grid-cols-2"
            onSubmit={onCreate}
          >
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-slate-700">Name *</label>
              <input
                required
                placeholder="e.g. Cebu service hub"
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                {...register("branch_name", { required: true })}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="text-sm font-medium text-slate-700">Address</label>
              <textarea
                rows={2}
                className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                {...register("address")}
              />
            </div>
            <div>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-900"
              >
                <IconBtnPlus className="h-4 w-4" />
                Create branch
              </button>
            </div>
          </form>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-3 py-2">
            <h2 className="font-semibold text-slate-900">All branches</h2>
            <TableSearchInput
              value={tableSearch}
              onChange={setTableSearch}
              placeholder="Search name or address…"
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
                <th className="px-3 py-2 font-medium">ID</th>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Address</th>
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
                    No branches.
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-slate-500">
                    No rows match your search.
                  </td>
                </tr>
              ) : (
                filteredRows.map((b) => (
                  <tr key={b.id} className="border-b border-slate-100 align-top">
                    <td className="px-3 py-2 tabular-nums text-slate-600">
                      {b.id}
                    </td>
                    <td className="px-3 py-2">
                      {editing === b.id ? (
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                        />
                      ) : (
                        <span className="font-medium text-slate-900">
                          {b.branch_name}
                        </span>
                      )}
                    </td>
                    <td className="max-w-xs px-3 py-2 text-slate-700">
                      {editing === b.id ? (
                        <textarea
                          value={editAddress}
                          onChange={(e) => setEditAddress(e.target.value)}
                          rows={2}
                          className="w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
                        />
                      ) : (
                        b.address || "—"
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {editing === b.id ? (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => saveEdit(b.id)}
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
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEdit(b)}
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
