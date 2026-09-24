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

export interface MailState {
  activeFolder: string;
  emails: EmailItem[];
  selectedEmailIds: number[];
  currentEmail: EmailItem | null;
  counts: FolderCounts;
  search: string;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  loading: boolean;
  actionLoading: boolean;

  // Actions
  setActiveFolder: (folder: string) => void;
  setSearch: (search: string) => void;
  setPage: (page: number) => void;
  toggleSelectEmail: (id: number) => void;
  selectAllEmails: () => void;
  clearSelection: () => void;
  fetchEmails: (folder?: string, page?: number, search?: string) => Promise<void>;
  fetchCounts: () => Promise<void>;
  fetchEmailDetails: (id: number) => Promise<EmailItem | null>;
  markAsRead: (id: number, isRead: boolean) => Promise<void>;
  removeEmail: (id: number, type?: "trash" | "delete") => Promise<void>;
  bulkMoveToFolder: (folder: string) => Promise<void>;
  bulkDelete: (type?: "trash" | "delete") => Promise<void>;
  sendEmail: (formData: FormData) => Promise<any>;
  updateDraft: (id: number, formData: FormData) => Promise<any>;
  linkEmailEntities: (id: number, data: { person_id?: number | null; lead_id?: number | null }) => Promise<any>;
}

export interface ComposeMailModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: "compose" | "reply" | "reply-all" | "forward";
  replyToEmail?: EmailItem | null;
  initialLeadId?: number | null;
  initialPersonId?: number | null;
  onSuccess?: (message?: string) => void;
  initialData?: {
    to?: string[];
    cc?: string[];
    bcc?: string[];
    subject?: string;
    reply?: string;
    lead_id?: number | null;
    person_id?: number | null;
    parent_id?: number | null;
    draftId?: number | null;
  };
}
