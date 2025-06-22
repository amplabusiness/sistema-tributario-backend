import { DocumentType } from './document';

export interface BaseJob {
  type: string;
}

export interface DocumentJob extends BaseJob {
  documentId: string;
  userId: string;
  filePath: string;
  type: DocumentType;
  metadata?: Record<string, any>;
}

export interface AIJob extends BaseJob {
  documentId: string;
  content: string;
  model: string;
  metadata?: Record<string, any>;
}