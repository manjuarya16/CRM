import { useEffect, useState } from "react";
import type React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PageBreadcrumb } from "@/components";
import { useAuthStore } from "@/store";
import useRoleStore from "@/store/roleStore";
import useUserStore from "@/store/userStore";
import commonAPI from "@/helpers/api/common";
import { API, API_URL } from "@/config";
import ImageUploader from "@/components/ImageUploader";

interface LocationOption {
  id: number;
  name: string;
}

const Profile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  const { roles, fetchRoles } = useRoleStore();
  const { selectedUser, loading, fetchUserById } = useUserStore();

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [states, setStates] = useState<LocationOption[]>([]);
  const [cities, setCities] = useState<LocationOption[]>([]);
  const [citiesStateId, setCitiesStateId] = useState<number | null>(null);
  const [profilePreview, setProfilePreview] = useState<string>("");
  // FIX (bug #1): the image is no longer uploaded to the backend the moment
  // it's picked. We hold onto the File here and only persist it in handleSave,
  // so Cancel can truly discard it.
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);

  const targetId = id ? Number(id) : user?.id;
  const isOwnProfile = !id || Number(id) === Number(user?.id);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  useEffect(() => {
    // The user list intentionally contains a compact record without every
    // address field, so the profile must always request the full user detail.
    if (targetId) fetchUserById(targetId, true);
  }, [targetId, fetchUserById]);

  // Load states once
  useEffect(() => {
    commonAPI.getStates().then((res) => {
      const raw: any[] = res?.data?.data || [];
      const deduped = Array.from(
        new Map(
          raw.map((s) => [s.name?.toString().trim().toLowerCase(), s]),
        ).values(),
      ) as LocationOption[];
      setStates(deduped);
    });
  }, []);

  const data: any = selectedUser ?? {};
  const userRole = roles.find(
    (r) => Number(r.id) === Number(data.role_id ?? user?.role_id),
  );

  const loadCities = (stateId: number) => {
    if (!stateId) {
      setCities([]);
      setCitiesStateId(null);
      return;
    }
    setCities([]);
    commonAPI.getCitiesByState(stateId).then((res) => {
      const raw: any[] = res?.data?.data || [];
      setCities(raw.filter((c) => (c.name || "").toString().trim() !== ""));
      setCitiesStateId(stateId);
    });
  };

  // Load cities for view mode when user data arrives
  useEffect(() => {
    const stateId = selectedUser?.state_id
      ? Number(selectedUser.state_id)
      : null;
    if (stateId) loadCities(stateId);
  }, [selectedUser?.state_id]);

  const handleEdit = () => {
    const stateId = data.state_id ? Number(data.state_id) : "";
    setForm({
      name: data.name ?? "",
      phone: data.phone ?? "",
      address_line1: data.address_line1 ?? data.street ?? "",
      postal_code: data.postal_code ?? "",
      state_id: stateId,
      city_id: data.city_id ? Number(data.city_id) : "",
      country: data.country ?? "",
    });
    setProfilePreview("");
    setPendingImageFile(null);
    // FIX (bug #3): only (re)fetch cities if we don't already have them
    // loaded for this state — avoids a redundant call + dropdown flicker
    // right after the view-mode effect above already loaded them.
    if (stateId && citiesStateId !== Number(stateId)) {
      loadCities(Number(stateId));
    }
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
    setSaveError(null);
    setProfilePreview("");
    setPendingImageFile(null); // FIX (bug #1): discard any picked-but-unsaved image
  };

  const toDataUrl = (f: File) =>
    new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = reject;
      r.readAsDataURL(f);
    });

  const handleSave = async () => {
    if (!targetId) return;
    setSaving(true);
    setSaveError(null);
    try {
      if (pendingImageFile) {
        const dataUrl = await toDataUrl(pendingImageFile);
        await commonAPI.uploadBase64ToDb({
          tableName: "users",
          columnName: "profile_img",
          recordId: targetId,
          filename: pendingImageFile.name,
          content: dataUrl,
        });
      }

      await API.put("/user/update/", {
        id: targetId,
        email: data.email,
        ...form,
      });
      await fetchUserById(targetId, true);

      if (isOwnProfile && user) setUser({ ...user, ...form } as any);

      setEditing(false);
      setProfilePreview("");
      setPendingImageFile(null);
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Failed to save changes";
      setSaveError(msg);
    } finally {
      setSaving(false);
    }
  };

  const patch = (key: string, val: any) =>
    setForm((f) => ({ ...f, [key]: val }));

  const handleStateChange = (stateId: number) => {
    patch("state_id", stateId);
    patch("city_id", "");
    loadCities(stateId);
  };

  const initials = (data.name || "U")
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const resolveImg = (src?: string) => {
    if (!src) return "";
    const s = src.trim().replace(/\\/g, "/");
    if (s.startsWith("http") || s.startsWith("data:")) return s;
    const origin = API_URL.replace(/\/api\/?$/, "");
    return origin + (s.startsWith("/") ? s : "/" + s);
  };

  const avatarSrc = profilePreview || resolveImg(data.profile_img);

  const selectedStateName =
    states.find((s) => Number(s.id) === Number(data.state_id))?.name ??
    data.state;
  const selectedCityName =
    cities.find((c) => Number(c.id) === Number(data.city_id))?.name ??
    data.city;

  return (
    <>
      <div className="flex items-center justify-between">
        <PageBreadcrumb
          name={isOwnProfile ? "My Profile" : "User Profile"}
          title={isOwnProfile ? "My Profile" : "User Profile"}
          breadCrumbItems={["Home", isOwnProfile ? "Profile" : "User Detail"]}
        />
        {!isOwnProfile && (
          <button
            onClick={() => navigate("/management/users")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-slate-600 text-sm font-medium hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
          >
            <i className="mgc_arrow_left_line text-base" />
            Back to Users
          </button>
        )}
      </div>

      {loading && !selectedUser ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Hero Banner */}
          <div className="card overflow-hidden">
            <div className="h-32 bg-gradient-to-r from-primary/80 via-primary to-blue-600" />
            <div className="px-6 pb-6">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 -mt-12">
                {/* Avatar */}
                <div className="relative">
                  {avatarSrc ? (
                    <img
                      src={avatarSrc}
                      alt="profile"
                      className="h-24 w-24 rounded-full object-cover ring-4 ring-white dark:ring-slate-800 shadow-lg"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display =
                          "none";
                      }}
                    />
                  ) : (
                    <div className="h-24 w-24 rounded-full ring-4 ring-white dark:ring-slate-800 shadow-lg bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center">
                      <span className="text-white text-2xl font-bold">
                        {initials}
                      </span>
                    </div>
                  )}
                  <span
                    className={`absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-white dark:border-slate-800 ${data.status ? "bg-green-500" : "bg-red-400"}`}
                  />
                </div>

                {/* Name + role */}
                <div className="flex-1 sm:pb-1">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    {data.name || "—"}
                  </h2>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {userRole?.name || "—"}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${data.status ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"}`}
                    >
                      {data.status ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>

                {/* Edit / Save / Cancel (Only available for own profile) */}
                {isOwnProfile && (
                  !editing ? (
                    <button
                      onClick={handleEdit}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
                    >
                      <i className="mgc_edit_line text-base" />
                      Edit Profile
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={handleCancel}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        <i className="mgc_close_line text-base" />
                        Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm disabled:opacity-60"
                      >
                        {saving ? (
                          <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                        ) : (
                          <i className="mgc_check_line text-base" />
                        )}
                        {saving ? "Saving…" : "Save Changes"}
                      </button>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>

          {/* Error banner */}
          {saveError && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
              <i className="mgc_warning_line text-base flex-shrink-0" />
              <span>{saveError}</span>
              <button
                onClick={() => setSaveError(null)}
                className="ml-auto text-red-400 hover:text-red-600"
              >
                <i className="mgc_close_line text-sm" />
              </button>
            </div>
          )}

          {/* Info Cards */}
          <div className="grid md:grid-cols-2 gap-6 items-stretch">
            {/* Personal Info */}
            <div className="card p-6 space-y-4 h-full">
              <div className="flex items-center gap-2 mb-2">
                <span className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <i className="mgc_user_3_line text-base" />
                </span>
                <h3 className="font-semibold text-gray-800 dark:text-gray-200">
                  Personal Info
                </h3>
              </div>

              <InfoRow
                icon="mgc_user_line"
                label="Full Name"
                value={data.name}
                editKey="name"
                editing={editing}
                form={form}
                patch={patch}
              />

              {/* Profile Image */}
              {editing ? (
                <div className="flex items-center gap-3">
                  <span className="h-8 w-8 rounded-md bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 flex items-center justify-center flex-shrink-0">
                    <i className="mgc_camera_line text-sm" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <ImageUploader
                      accept="image/*"
                      maxSize={5}
                      centered={true}
                      previewSize={80}
                      label="Profile Image"
                      required={false}
                      preview={profilePreview}
                      onImageUpload={(file: File, preview: string) => {
                        // FIX (bug #1): only stage the file + preview locally.
                        // The actual upload happens in handleSave, so Cancel
                        // can discard it like every other field.
                        if (preview) setProfilePreview(preview);
                        setPendingImageFile(file);
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span className="h-8 w-8 rounded-md bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 flex items-center justify-center flex-shrink-0">
                    <i className="mgc_camera_line text-sm" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">
                      Profile Image
                    </p>
                    {avatarSrc ? (
                      <img
                        src={avatarSrc}
                        alt="profile"
                        className="h-10 w-10 rounded-full object-cover border border-gray-200 dark:border-slate-600"
                      />
                    ) : (
                      <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                        —
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Email — always disabled */}
              <div className="flex items-center gap-3">
                <span className="h-8 w-8 rounded-md bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 flex items-center justify-center flex-shrink-0">
                  <i className="mgc_mail_line text-sm" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">
                    Email
                  </p>
                  {editing ? (
                    <input
                      type="email"
                      value={data.email ?? ""}
                      disabled
                      className="form-input w-full opacity-60 cursor-not-allowed bg-gray-100 dark:bg-slate-700"
                    />
                  ) : (
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                      {data.email || "—"}
                    </p>
                  )}
                </div>
              </div>

              <InfoRow
                icon="mgc_phone_line"
                label="Phone"
                value={data.phone}
                editKey="phone"
                editing={editing}
                form={form}
                patch={patch}
                type="tel"
              />
              <InfoRow
                icon="mgc_shield_line"
                label="Role"
                value={userRole?.name}
                readonly
              />
            </div>

            {/* Address */}
            <div className="card p-6 space-y-4 h-full">
              <div className="flex items-center gap-2 mb-2">
                <span className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center">
                  <i className="mgc_location_line text-base" />
                </span>
                <h3 className="font-semibold text-gray-800 dark:text-gray-200">
                  Address
                </h3>
              </div>

              <InfoRow
                icon="mgc_home_3_line"
                label="Street"
                value={data.address_line1 ?? data.street}
                editKey="address_line1"
                editing={editing}
                form={form}
                patch={patch}
              />
              <InfoRow
                icon="mgc_mail_send_line"
                label="Postal Code"
                value={data.postal_code}
                editKey="postal_code"
                editing={editing}
                form={form}
                patch={patch}
              />

              {/* State dropdown */}
              <div className="flex items-center gap-3">
                <span className="h-8 w-8 rounded-md bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 flex items-center justify-center flex-shrink-0">
                  <i className="mgc_map_line text-sm" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">
                    State
                  </p>
                  {editing ? (
                    <select
                      className="form-select w-full"
                      value={form.state_id ?? ""}
                      onChange={(e) =>
                        handleStateChange(Number(e.target.value))
                      }
                    >
                      <option value="">— Select State —</option>
                      {states.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                      {selectedStateName || "—"}
                    </p>
                  )}
                </div>
              </div>

              {/* City dropdown */}
              <div className="flex items-center gap-3">
                <span className="h-8 w-8 rounded-md bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 flex items-center justify-center flex-shrink-0">
                  <i className="mgc_building_2_line text-sm" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">
                    City
                  </p>
                  {editing ? (
                    <select
                      className="form-select w-full"
                      value={form.city_id ?? ""}
                      onChange={(e) => patch("city_id", Number(e.target.value))}
                      disabled={!form.state_id || cities.length === 0}
                    >
                      <option value="">— Select City —</option>
                      {cities.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                      {selectedCityName || "—"}
                    </p>
                  )}
                </div>
              </div>

              <InfoRow
                icon="mgc_earth_line"
                label="Country"
                value={data.country}
                editKey="country"
                editing={editing}
                form={form}
                patch={patch}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

/* ── InfoRow sub-component ── */
interface InfoRowProps {
  icon: string;
  label: string;
  value?: string | number;
  editKey?: string;
  editing?: boolean;
  form?: Record<string, any>;
  patch?: (key: string, val: string) => void;
  type?: string;
  readonly?: boolean;
}

const InfoRow = ({
  icon,
  label,
  value,
  editKey,
  editing,
  form,
  patch,
  type = "text",
  readonly,
}: InfoRowProps) => {
  const isEditable = editing && !readonly && editKey;
  return (
    <div className="flex items-center gap-3">
      <span className="h-8 w-8 rounded-md bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 flex items-center justify-center flex-shrink-0">
        <i className={`${icon} text-sm`} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-0.5">
          {label}
        </p>
        {isEditable ? (
          <input
            type={type}
            value={form?.[editKey] ?? ""}
            onChange={(e) => patch?.(editKey, e.target.value)}
            className="form-input w-full"
          />
        ) : (
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
            {value || "—"}
          </p>
        )}
      </div>
    </div>
  );
};

export default Profile;
