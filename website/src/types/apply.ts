export type VisaChannel = "evisa" | "embassy";

export type RequirementLevel = "required" | "optional" | "conditional" | "recommended";

export type FieldDataType =
  | "text"
  | "email"
  | "tel"
  | "date"
  | "select"
  | "textarea"
  | "file"
  | "checkbox"
  | "number";

export interface ApplyStepMeta {
  id: string;
  number: number;
  label: string;
}

export interface FeeLine {
  label: string;
  amount: string;
  note?: string;
}

export interface FeeSchedule {
  title: string;
  lines: FeeLine[];
  totalLabel?: string;
  totalAmount?: string;
  disclaimer?: string;
}

export interface DocumentItem {
  key: string;
  label: string;
  required: RequirementLevel;
  notes?: string;
}

export interface FormFieldDef {
  key: string;
  label: string;
  dataType: FieldDataType;
  required: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  notes?: string;
  visaTypeCodes?: string[];
}

export interface VisaTypeOption {
  code: string;
  name: string;
  channel: VisaChannel;
  shortDescription: string;
  /** Short labels for SS1-style checklist */
  documentLabels: string[];
  processingTime: string;
  processingNote: string;
  fees: FeeSchedule;
  /** Full checklist used on Documents step */
  documents: DocumentItem[];
  extraFormFields?: FormFieldDef[];
}
