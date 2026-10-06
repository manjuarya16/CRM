export type WhatsAppMessageType = 'text' | 'image' | 'document' | 'audio' | 'voice' | 'unknown';

export interface IWhatsAppMediaAttachment {
  mediaId?: string;
  mediaUrl?: string;
  mimeType?: string;
  filename?: string;
  caption?: string;
  fileBuffer?: Buffer;
}

export interface IWhatsAppInboundMessage {
  messageId: string;
  senderPhoneNumber: string;
  senderName?: string;
  timestamp: string;
  messageType: WhatsAppMessageType;
  textBody?: string;
  media?: IWhatsAppMediaAttachment;
}

export interface IWhatsAppExtractedProduct {
  name: string;
  quantity?: number;
  price?: number;
  sku?: string;
  description?: string;
}

export interface IWhatsAppExtractedLead {
  leadTitle?: string;
  contactPersonName?: string;
  contactPhone?: string;
  contactEmail?: string;
  organizationName?: string;
  jobTitle?: string;
  leadValue?: number | null;
  expectedCloseDate?: string | null;
  source?: string;
  type?: string;
  products?: IWhatsAppExtractedProduct[];
  description?: string;
  rawText?: string;
  confidenceScore?: number;
}

export interface IWhatsAppLeadCreationResult {
  success: boolean;
  leadId: number;
  leadTitle: string;
  personId: number | null;
  personName: string | null;
  isPersonCreated: boolean;
  organizationId: number | null;
  organizationName: string | null;
  isOrganizationCreated: boolean;
  attachedProductsCount: number;
  activityId: number | null;
  senderPhoneNumber: string;
  mediaUrl: string | null;
  extractedData: IWhatsAppExtractedLead;
  replyMessage: string;
}

export interface IWhatsAppWebhookVerificationQuery {
  'hub.mode'?: string;
  'hub.verify_token'?: string;
  'hub.challenge'?: string;
}

export interface IWhatsAppConfigSettings {
  enabled: boolean;
  verifyToken?: string;
  phoneNumberId?: string;
  accessToken?: string;
  businessAccountId?: string;
  autoReplyEnabled?: boolean;
}
