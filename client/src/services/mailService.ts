import API from "@/config";

export interface EmailItem {
  id: number;
  subject: string;
  source: string;
  user_type: string;
  name: string;
  reply: string;
  is_read: boolean;
  folders: string[];
  from_email: { name?: string; email?: string } | null;
  sender: { name?: string; email?: string } | null;
  reply_to: string[] | null;
  cc: string[] | null;
  bcc: string[] | null;
  unique_id: string | null;
  message_id: string | null;
  person_id: number | null;
  person_name?: string | null;
  person_emails?: any;
  lead_id: number | null;
  lead_title?: string | null;
  parent_id: number | null;
  user_id: number | null;
  user_name?: string | null;
  attachments_count?: number;
  replies_count?: number;
  attachments?: EmailAttachment[];
  emails?: EmailItem[];
  created_at: string;
  updated_at: string;
}

export interface EmailAttachment {
  id: number;
  name: string;
  path: string;
  size: number;
  content_type: string;
  content_id?: string;
  email_id: number;
  created_at: string;
}

export interface FolderCounts {
  inbox_unread: number;
  inbox_total: number;
  important_total: number;
  starred_total: number;
  draft_total: number;
  outbox_total: number;
  sent_total: number;
  spam_total: number;
  trash_total: number;
}

export const getEmails = async (params: { folder?: string; search?: string; page?: number; limit?: number }) => {
  const response = await API.get("/mail", { params });
  return response.data;
};

export const getFolderCounts = async () => {
  const response = await API.get("/mail/counts");
  return response.data;
};

export const getEmailById = async (id: number) => {
  const response = await API.get(`/mail/${id}`);
  return response.data;
};

export const sendEmail = async (formData: FormData) => {
  const response = await API.post("/mail", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const updateDraft = async (id: number, formData: FormData) => {
  const response = await API.put(`/mail/${id}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const toggleReadStatus = async (id: number, isRead: boolean) => {
  const response = await API.patch(`/mail/${id}/read`, { is_read: isRead });
  return response.data;
};

export const deleteEmail = async (id: number, type: "trash" | "delete" = "trash") => {
  const response = await API.delete(`/mail/${id}`, { params: { type } });
  return response.data;
};

export const massUpdateEmails = async (indices: number[], folders: string[], isRead?: boolean) => {
  const response = await API.post("/mail/mass-update", { indices, folders, is_read: isRead });
  return response.data;
};

export const massDeleteEmails = async (indices: number[], type: "trash" | "delete" = "trash") => {
  const response = await API.post("/mail/mass-destroy", { indices, type });
  return response.data;
};

export const linkEmailEntities = async (
  id: number,
  data: { person_id?: number | null; lead_id?: number | null }
) => {
  const response = await API.put(`/mail/${id}/link`, data);
  return response.data;
};

