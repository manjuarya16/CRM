import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import ImageResize from "tiptap-extension-resize-image";
import { Trash2 } from "lucide-react";
import { API } from "@/config";
import { getSuperAdminToken } from "@/lib/auth-utils";

interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  content: string;
  updated_at: string;
}

interface EmailTemplatesPageProps {
  title: string;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

const PLACEHOLDERS: Record<string, string[]> = {
  demo_received: ["name", "company"],
  trial_activation: ["name", "company", "trial_days", "login_url", "slug", "email", "trial_expiry"],
  plan_activation: ["name", "company", "plan_name", "login_url"],
  payment_confirmation: ["name", "company", "amount", "currency", "payment_reference", "plan_name"],
  new_user_welcome: ["name", "company", "email", "login_url"],
  new_organization_created: ["name", "company", "slug", "login_url", "plan_name"],
};

const SAMPLE_VALUES: Record<string, string> = {
  name: "Jordan Smith",
  company: "Northwind Co.",
  trial_days: "14",
  login_url: "https://northwind.crm.example.com/auth/login",
  slug: "northwind",
  email: "jordan@example.com",
  trial_expiry: "November 12, 2026",
  plan_name: "Professional",
  amount: "₹4,200",
  currency: "INR",
  payment_reference: "PAY-2026-00124",
};

const apiPath = (path: string) => `/super-admin/modules${path}`;

const formatError = (error: unknown) => {
  if (typeof error === "object" && error !== null && "response" in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) return response.data.message;
  }
  return error instanceof Error ? error.message : "The request could not be completed.";
};

const EmailTemplatesPage = ({ title, canCreate, canEdit, canDelete }: EmailTemplatesPageProps) => {
  const token = getSuperAdminToken();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === selectedId) ?? null,
    [selectedId, templates],
  );
  const placeholders = PLACEHOLDERS[name.trim().toLowerCase()] ?? [];
  const editor = useEditor({
    extensions: [
      StarterKit,
      ImageResize,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content,
    onUpdate: ({ editor: currentEditor }) => setContent(currentEditor.getHTML()),
    editorProps: {
      attributes: {
        class: "min-h-64 bg-white p-4 text-sm leading-6 text-slate-900 outline-none",
      },
    },
  });

  const loadTemplates = useCallback(async () => {
    const currentToken = getSuperAdminToken();
    if (!currentToken) {
      setLoading(false);
      setError("Super Admin session has expired. Sign in again to manage templates.");
      return;
    }
    try {
      const { data } = await API.get<{ success: boolean; data: EmailTemplate[] }>(
        apiPath("/email-templates"),
        { headers: { Authorization: `Bearer ${currentToken}` } },
      );
      setTemplates(data.data);
      setError("");
      return data.data;
    } catch (requestError) {
      setError(formatError(requestError));
      return undefined;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  useEffect(() => {
    if (!editor) return;
    const nextContent = isCreating ? content : selectedTemplate?.content ?? "";
    if (editor.getHTML() !== nextContent) editor.commands.setContent(nextContent);
  }, [content, editor, isCreating, selectedTemplate]);

  useEffect(() => {
    if (!isCreating && selectedId === null && templates.length > 0) {
      const firstTemplate = templates[0];
      setSelectedId(firstTemplate.id);
      setName(firstTemplate.name);
      setSubject(firstTemplate.subject);
      setContent(firstTemplate.content);
    }
  }, [isCreating, selectedId, templates]);

  useEffect(() => {
    editor?.setEditable(isCreating || canEdit);
  }, [canEdit, editor, isCreating]);

  const selectTemplate = (template: EmailTemplate) => {
    setSelectedId(template.id);
    setIsCreating(false);
    setName(template.name);
    setSubject(template.subject);
    setContent(template.content);
    setError("");
    setNotice("");
  };

  const startCreate = () => {
    setSelectedId(null);
    setIsCreating(true);
    setName("");
    setSubject("");
    setContent("<p></p>");
    editor?.commands.setContent("<p></p>");
    setError("");
    setNotice("");
  };

  const cancelEdit = () => {
    setIsCreating(false);
    if (selectedTemplate) {
      setName(selectedTemplate.name);
      setSubject(selectedTemplate.subject);
      setContent(selectedTemplate.content);
      editor?.commands.setContent(selectedTemplate.content);
    } else {
      setName("");
      setSubject("");
      setContent("");
      editor?.commands.clearContent();
    }
    setError("");
  };

  const insertPlaceholder = (placeholder: string) => {
    const value = `{{${placeholder}}}`;
    if (document.activeElement?.id === "email-template-subject") {
      const input = document.activeElement as HTMLInputElement;
      const start = input.selectionStart ?? input.value.length;
      const end = input.selectionEnd ?? start;
      const next = `${input.value.slice(0, start)}${value}${input.value.slice(end)}`;
      setSubject(next);
      requestAnimationFrame(() => {
        input.focus();
        input.setSelectionRange(start + value.length, start + value.length);
      });
    } else {
      editor?.chain().focus().insertContent(value).run();
    }
  };

  const saveTemplate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const currentToken = getSuperAdminToken();
    if (!currentToken) {
      setError("Super Admin session has expired. Sign in again to save templates.");
      return;
    }
    if (!name.trim() || !subject.trim() || !editor?.getHTML().trim()) {
      setError("Template name, subject, and message body are required.");
      return;
    }
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const payload = { name: name.trim(), subject: subject.trim(), content: editor.getHTML() };
      const requestConfig = { headers: { Authorization: `Bearer ${currentToken}` } };
      if (isCreating) {
        await API.post(apiPath("/email-templates"), payload, requestConfig);
        setNotice("Email template created successfully.");
      } else if (selectedId !== null) {
        await API.put(apiPath(`/email-templates/${selectedId}`), payload, requestConfig);
        setNotice("Email template updated successfully.");
      }
      const updated = await loadTemplates();
      const matching = updated?.find((template) => template.name === payload.name);
      if (matching) selectTemplate(matching);
      setIsCreating(false);
    } catch (requestError) {
      setError(formatError(requestError));
    } finally {
      setSaving(false);
    }
  };

  const deleteTemplate = async (template: EmailTemplate) => {
    const currentToken = getSuperAdminToken();
    if (!currentToken) {
      setError("Super Admin session has expired. Sign in again to manage templates.");
      return;
    }
    if (!window.confirm(`Delete the "${template.name}" email template?`)) return;
    try {
      await API.delete(apiPath(`/email-templates/${template.id}`), {
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      setTemplates((current) => current.filter((item) => item.id !== template.id));
      if (selectedId === template.id) {
        setSelectedId(null);
        setName("");
        setSubject("");
        setContent("");
        editor?.commands.clearContent();
      }
      setNotice("Email template deleted.");
      setError("");
    } catch (requestError) {
      setError(formatError(requestError));
    }
  };

  const previewContent = content.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) =>
    SAMPLE_VALUES[key] ?? `[${key}]`,
  );
  const previewSubject = subject.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) =>
    SAMPLE_VALUES[key] ?? `[${key}]`,
  );
  const previewDocument = `<!doctype html><html><body style="margin:0;padding:24px;background:#f1f5f9;font-family:Arial,sans-serif;color:#334155"><main style="max-width:600px;margin:auto;border:1px solid #e2e8f0;border-radius:12px;background:white;overflow:hidden"><header style="padding:24px;background:#312e81;color:white"><strong>MORSE CRM</strong><div style="margin-top:8px">${previewSubject || "Email subject preview"}</div></header><article style="padding:24px;line-height:1.6">${previewContent || "<p>Your email body preview appears here.</p>"}</article><footer style="padding:16px;background:#f8fafc;text-align:center;color:#64748b;font-size:12px">MORSE CRM</footer></main></body></html>`;

  return (
    <section className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">Super Admin Console</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">{title}</h1>
          <p className="mt-1 text-sm text-slate-600">Create and edit reusable platform email templates.</p>
        </div>
        {canCreate && (
          <button type="button" onClick={startCreate} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">
            Create template
          </button>
        )}
      </header>

      {error && <p role="alert" className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>}
      {notice && <p role="status" className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">{notice}</p>}

      {loading ? (
        <p role="status" className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">Loading email templates…</p>
      ) : (
        <div className="space-y-5">
          <label className="block max-w-xl text-xs font-medium text-slate-700">
            Select email template
            <select
              value={isCreating ? "" : selectedId === null ? "" : String(selectedId)}
              onChange={(event) => {
                const template = templates.find((item) => String(item.id) === event.target.value);
                if (template) selectTemplate(template);
              }}
              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-indigo-500"
            >
              <option value="" disabled>Select a template…</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} — {template.subject}
                </option>
              ))}
            </select>
          </label>

          {templates.length === 0 && !isCreating && (
            <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">No templates yet. Create one to get started.</p>
          )}

          {(isCreating || selectedTemplate) && (
            <div className="grid min-w-0 gap-5 xl:grid-cols-2">
              <form onSubmit={(event) => void saveTemplate(event)} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-slate-900">{isCreating ? "Create email template" : "Edit email template"}</h2>
                  {!isCreating && canDelete && selectedTemplate && (
                    <button type="button" aria-label="Delete email template" title="Delete email template" onClick={() => void deleteTemplate(selectedTemplate)} className="super-admin-action-icon super-admin-action-icon-danger">
                      <Trash2 aria-hidden="true" size={17} />
                    </button>
                  )}
                </div>
                <label className="block text-xs font-medium text-slate-700">
                  Template name
                  <input value={name} onChange={(event) => setName(event.target.value)} required maxLength={191} disabled={!isCreating} placeholder="e.g. demo_received" className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 disabled:bg-slate-100 disabled:opacity-100" />
                </label>
                <label className="block text-xs font-medium text-slate-700">
                  Subject
                  <input id="email-template-subject" value={subject} onChange={(event) => setSubject(event.target.value)} required maxLength={255} disabled={!isCreating && !canEdit} placeholder="Email subject" className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 disabled:bg-slate-100 disabled:opacity-100" />
                </label>
                {placeholders.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-medium text-slate-700">Insert dynamic placeholder</p>
                    <div className="flex flex-wrap gap-2">
                      {placeholders.map((placeholder) => (
                        <button key={placeholder} type="button" disabled={!isCreating && !canEdit} onClick={() => insertPlaceholder(placeholder)} className="rounded-md border border-indigo-500/30 bg-indigo-500/10 px-2 py-1 font-mono text-xs text-indigo-200 disabled:opacity-50">
                          {`{{${placeholder}}}`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <p className="mb-2 text-xs font-medium text-slate-700">Message body</p>
                  <div className="overflow-hidden rounded-lg border border-slate-300">
                    <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-slate-50 p-2">
                      <button type="button" disabled={!isCreating && !canEdit} onClick={() => editor?.chain().focus().toggleBold().run()} className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-100 disabled:opacity-50">Bold</button>
                      <button type="button" disabled={!isCreating && !canEdit} onClick={() => editor?.chain().focus().toggleItalic().run()} className="rounded border border-slate-300 bg-white px-2 py-1 text-xs italic text-slate-700 hover:bg-slate-100 disabled:opacity-50">Italic</button>
                      <button type="button" disabled={!isCreating && !canEdit} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-100 disabled:opacity-50">Heading</button>
                      <button type="button" disabled={!isCreating && !canEdit} onClick={() => editor?.chain().focus().toggleBulletList().run()} className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-100 disabled:opacity-50">Bullet list</button>
                      <button type="button" disabled={!isCreating && !canEdit} onClick={() => editor?.chain().focus().setTextAlign("center").run()} className="rounded border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 hover:bg-slate-100 disabled:opacity-50">Center</button>
                    </div>
                    <EditorContent editor={editor} />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={cancelEdit} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Cancel</button>
                  {(isCreating ? canCreate : canEdit) && (
                    <button type="submit" disabled={saving} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
                      {saving ? "Saving…" : isCreating ? "Create template" : "Save changes"}
                    </button>
                  )}
                </div>
              </form>

              <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-200 p-4">
                  <h2 className="text-sm font-semibold text-slate-900">Live email preview</h2>
                  <p className="mt-1 text-xs text-slate-600">Dynamic placeholders are shown with sample values.</p>
                </div>
                <iframe
                  title="Email template preview"
                  sandbox=""
                  srcDoc={previewDocument}
                  className="h-[34rem] w-full bg-slate-100"
                />
              </section>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default EmailTemplatesPage;
