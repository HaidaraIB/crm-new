/** Cross-client catalog types. Field names match the API catalog JSON. */

export interface RuleSpec {
  type: string;
  params?: Record<string, unknown>;
  when?: string | { flag?: string; equals?: unknown; not?: unknown };
  client_only?: boolean;
}

export interface FieldSpec {
  type: string;
  label_key: string;
  rules?: RuleSpec[];
  hint_key?: string;
  ui_key?: string;
  item?: FieldSpec;
  fields?: Record<string, FieldSpec>;
}

export interface FormSpec {
  public?: boolean;
  fields: Record<string, FieldSpec>;
  aliases?: Record<string, string>;
}

export interface CatalogDocument {
  version: string;
  forms: Record<string, FormSpec>;
  context?: Record<string, unknown>;
}

export interface ValidationIssue {
  code: string;
  params: Record<string, unknown>;
  message?: string;
}

export type IssueMap = Record<string, ValidationIssue[]>;
