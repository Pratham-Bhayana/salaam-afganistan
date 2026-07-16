"use client";

import Link from "next/link";
import { FormEvent, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  DollarSign,
  FileText,
  IdCard,
  Info,
  Laptop,
  MapPin,
  Stamp,
  X,
} from "lucide-react";
import {
  APPLY_PAGE,
  APPLY_STEPS,
  REVIEW_FIELDS,
  SITUATION_FIELDS,
  UNIVERSAL_PERSONAL_FIELDS,
  UNIVERSAL_TRAVEL_FIELDS,
  VISA_TYPES,
  checkEvisaEligibility,
  getVisaType,
  getVisaTypesByChannel,
  requirementLabel,
  type EligibilityResult,
} from "@/data/apply";
import { APPLYING_FROM_OPTIONS } from "@/data/home";
import type { VisaChannel } from "@/types/apply";
import { FormFields } from "./FormFields";
import styles from "./ApplyFlow.module.css";

type Values = Record<string, string | boolean>;

/** Same country options as personal info (FormFields) + eligibility list coverage */
const COUNTRY_OPTIONS = [
  ...APPLYING_FROM_OPTIONS,
  { value: "afghanistan", label: "Afghanistan" },
  { value: "pakistan", label: "Pakistan" },
  { value: "iran", label: "Iran" },
  { value: "uae", label: "United Arab Emirates" },
  { value: "russia", label: "Russia" },
  { value: "turkey", label: "Turkey" },
  { value: "saudi-arabia", label: "Saudi Arabia" },
  { value: "tajikistan", label: "Tajikistan" },
  { value: "uzbekistan", label: "Uzbekistan" },
  { value: "turkmenistan", label: "Turkmenistan" },
  { value: "kazakhstan", label: "Kazakhstan" },
  { value: "israel", label: "Israel" },
  { value: "azerbaijan", label: "Azerbaijan" },
  { value: "indonesia", label: "Indonesia" },
  { value: "kyrgyzstan", label: "Kyrgyzstan" },
  { value: "malaysia", label: "Malaysia" },
  { value: "oman", label: "Oman" },
  { value: "qatar", label: "Qatar" },
];

export function ApplyFlow() {
  const searchParams = useSearchParams();
  const fromParam = searchParams.get("from") ?? "";

  const [stepIndex, setStepIndex] = useState(0);
  const [selectedChannel, setSelectedChannel] = useState<VisaChannel>("evisa");
  const [visaTypeCode, setVisaTypeCode] = useState(VISA_TYPES[0]?.code ?? "");
  const [values, setValues] = useState<Values>(() => ({
    countryOfResidence: fromParam,
    nationality: "",
    digitalSignature: false,
    isMinor: false,
    isNonCitizenResident: false,
  }));
  const [fileNames, setFileNames] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const [eligibilityOpen, setEligibilityOpen] = useState(false);
  const [modalNationality, setModalNationality] = useState("");
  const [modalResidence, setModalResidence] = useState("");
  const [eligibilityResult, setEligibilityResult] = useState<EligibilityResult | null>(null);

  const frontInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const visa = useMemo(() => getVisaType(visaTypeCode), [visaTypeCode]);
  const embassyTypes = useMemo(() => getVisaTypesByChannel("embassy"), []);
  const currentStep = APPLY_STEPS[stepIndex];

  function setField(key: string, value: string | boolean) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function setFile(key: string, file: File | null) {
    setFileNames((prev) => {
      const next = { ...prev };
      if (file) next[key] = file.name;
      else delete next[key];
      return next;
    });
  }

  function goNext() {
    setStepIndex((i) => Math.min(i + 1, APPLY_STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goPrev() {
    setStepIndex((i) => Math.max(i - 1, 0));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const passportUploaded = Boolean(fileNames.passportBioScan && fileNames.passportPhoto);

  function openEligibilityModal() {
    setModalNationality(typeof values.nationality === "string" ? values.nationality : "");
    setModalResidence(
      typeof values.countryOfResidence === "string" ? values.countryOfResidence : ""
    );
    setEligibilityResult(null);
    setEligibilityOpen(true);
  }

  function closeEligibilityModal() {
    setEligibilityOpen(false);
    setEligibilityResult(null);
  }

  function handleCheckEligibility() {
    if (!modalNationality || !modalResidence) return;
    setEligibilityResult(checkEvisaEligibility(modalNationality, modalResidence));
  }

  function handleEligibleContinue() {
    setValues((prev) => ({
      ...prev,
      nationality: modalNationality,
      countryOfResidence: modalResidence,
    }));
    closeEligibilityModal();
    goNext();
  }

  function handleSwitchToEmbassy() {
    closeEligibilityModal();
    setSelectedChannel("embassy");
    setVisaTypeCode("embassy_tourist");
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (currentStep?.id === "passport" && !passportUploaded) return;
    if (stepIndex === 0 && selectedChannel === "evisa") {
      openEligibilityModal();
      return;
    }
    if (stepIndex < APPLY_STEPS.length - 1) {
      goNext();
      return;
    }
    setSubmitted(true);
  }

  function handleChannelSwitch(channel: VisaChannel) {
    setSelectedChannel(channel);
    const types = channel === "evisa"
      ? VISA_TYPES.filter((v) => v.channel === "evisa")
      : embassyTypes;
    if (types.length > 0) setVisaTypeCode(types[0].code);
  }

  const documentUploadFields = (visa?.documents ?? []).map((doc) => ({
    key: `doc_${doc.key}`,
    label: doc.label,
    dataType: "file" as const,
    required: doc.required === "required",
    notes: requirementLabel(doc.required),
  }));

  const travelFields = [
    ...UNIVERSAL_TRAVEL_FIELDS.filter((f) => {
      if (
        f.key === "stayDurationDays" &&
        visa?.extraFormFields?.some((x) => x.key === "stayDurationDays")
      ) {
        return false;
      }
      return true;
    }),
    ...(visa?.extraFormFields ?? []),
  ];

  const personalFields = [
    ...UNIVERSAL_PERSONAL_FIELDS,
    ...(visa?.extraFormFields?.filter(
      (f) =>
        f.key === "hostName" ||
        f.key === "relationshipToHost" ||
        f.key === "hostContact" ||
        f.key === "companyName" ||
        f.key === "designation" ||
        f.key === "employerName" ||
        f.key === "jobTitle" ||
        f.key === "newsAgency" ||
        f.key === "pressCardNumber"
    ) ?? []),
  ];

  const travelExtraFields = [
    ...UNIVERSAL_TRAVEL_FIELDS,
    ...(visa?.extraFormFields?.filter(
      (f) =>
        f.key !== "hostName" &&
        f.key !== "relationshipToHost" &&
        f.key !== "hostContact" &&
        f.key !== "companyName" &&
        f.key !== "designation" &&
        f.key !== "employerName" &&
        f.key !== "jobTitle" &&
        f.key !== "newsAgency" &&
        f.key !== "pressCardNumber"
    ) ?? []),
  ];

  return (
    <div className={styles.page}>
      <nav className={styles.stepper} aria-label="Application steps">
        {APPLY_STEPS.map((step, index) => {
          const active = index === stepIndex;
          const done = index < stepIndex;
          return (
            <button
              key={step.id}
              type="button"
              className={`${styles.stepItem} ${active ? styles.stepActive : ""} ${done ? styles.stepDone : ""}`}
              onClick={() => {
                if (index <= stepIndex) setStepIndex(index);
              }}
              aria-current={active ? "step" : undefined}
            >
              <span className={styles.stepNum}>
                {done ? <Check size={14} aria-hidden /> : step.number}
              </span>
              <span className={styles.stepLabel}>{step.label}</span>
            </button>
          );
        })}
      </nav>

      <div className={styles.card}>
        {submitted ? (
          <div className={styles.success}>
            <div className={styles.successIcon}>
              <Check size={28} aria-hidden />
            </div>
            <h2>Application Ready</h2>
            <p>
              Your {visa?.name ?? "visa"} details have been collected. Backend submit connects in a
              later phase.
            </p>
            <Link href="/" className={`btn btn-primary ${styles.navPrimary}`}>
              Back to Home
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {currentStep?.id === "visa-type" ? (
              <section>
                <div className={styles.cardHead}>
                  <FileText size={22} aria-hidden />
                  <div>
                    <h2>{APPLY_PAGE.requirementsHeading}</h2>
                    <p>{APPLY_PAGE.requirementsSubtitle}</p>
                  </div>
                </div>

                {/* ── Channel selector: eVisa / Embassy — square cards like SS2 ── */}
                <div className={styles.channelGrid}>
                  <button
                    type="button"
                    className={`${styles.visaCard} ${selectedChannel === "evisa" ? styles.visaCardSelected : ""}`}
                    onClick={() => handleChannelSwitch("evisa")}
                    aria-pressed={selectedChannel === "evisa"}
                  >
                    <span className={styles.visaIcon}><Laptop size={26} aria-hidden /></span>
                    <span className={styles.visaName}>eVisa</span>
                    <span className={styles.visaDesc}>Electronic visa (online)</span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.visaCard} ${selectedChannel === "embassy" ? styles.visaCardSelected : ""}`}
                    onClick={() => handleChannelSwitch("embassy")}
                    aria-pressed={selectedChannel === "embassy"}
                  >
                    <span className={styles.visaIcon}><Stamp size={26} aria-hidden /></span>
                    <span className={styles.visaName}>Embassy</span>
                    <span className={styles.visaDesc}>Traditional visa in passport</span>
                  </button>
                </div>

                {/* ── Embassy sub-type selector — square cards ── */}
                {selectedChannel === "embassy" ? (
                  <div className={styles.visaGrid}>
                    {embassyTypes.map((option) => {
                      const selected = option.code === visaTypeCode;
                      return (
                        <button
                          key={option.code}
                          type="button"
                          className={`${styles.visaCard} ${selected ? styles.visaCardSelected : ""}`}
                          onClick={() => setVisaTypeCode(option.code)}
                          aria-pressed={selected}
                        >
                          <span className={styles.visaName}>{option.name}</span>
                          <span className={styles.visaDesc}>{option.shortDescription}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                {visa ? (
                  <>
                    <div className={styles.detailsPanel}>
                      <div className={styles.infoGrid}>
                        <div className={styles.infoBlock}>
                          <h3>
                            <FileText size={18} aria-hidden />
                            {APPLY_PAGE.documentsHeading}
                          </h3>
                          <ul className={styles.docList}>
                            {visa.documentLabels.map((label) => (
                              <li key={label}>
                                <Check size={16} className={styles.check} aria-hidden />
                                <span>{label}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className={styles.infoBlock}>
                          <h3>
                            <DollarSign size={18} aria-hidden />
                            {APPLY_PAGE.feesHeading}
                          </h3>
                          <ul className={styles.feeList}>
                            {visa.fees.lines.map((line) => (
                              <li key={line.label}>
                                <span>{line.label}</span>
                                <strong>{line.amount}</strong>
                              </li>
                            ))}
                          </ul>
                          {visa.fees.totalLabel && visa.fees.totalAmount ? (
                            <div className={styles.feeTotal}>
                              <span>{visa.fees.totalLabel}</span>
                              <strong>{visa.fees.totalAmount}</strong>
                            </div>
                          ) : null}
                        </div>
                      </div>

                      <div className={styles.processing}>
                        <h3>
                          <Clock size={18} aria-hidden />
                          {APPLY_PAGE.processingHeading}
                        </h3>
                        <div className={styles.processingBar}>{visa.processingTime}</div>
                        <p>{visa.processingNote}</p>
                      </div>
                    </div>

                    <div className={styles.notice}>
                      <AlertTriangle size={18} aria-hidden />
                      <div>
                        <h3>{APPLY_PAGE.importantNoticeTitle}</h3>
                        <p>{APPLY_PAGE.importantNoticeBody}</p>
                      </div>
                    </div>
                  </>
                ) : null}
              </section>
            ) : null}

            {currentStep?.id === "passport" ? (
              <section>
                <div className={styles.cardHead}>
                  <IdCard size={22} aria-hidden />
                  <div>
                    <h2>{APPLY_PAGE.passportHeading}</h2>
                    <p>{APPLY_PAGE.passportSubtitle}</p>
                  </div>
                </div>

                <div className={styles.infoAlert}>
                  <Info size={18} aria-hidden />
                  <p>{APPLY_PAGE.passportInfo}</p>
                </div>

                <div className={styles.uploadGrid}>
                  <button
                    type="button"
                    className={styles.uploadBox}
                    onClick={() => frontInputRef.current?.click()}
                  >
                    <IdCard size={28} aria-hidden />
                    <strong>{APPLY_PAGE.passportFrontTitle}</strong>
                    <span>{APPLY_PAGE.passportFrontHint}</span>
                    {fileNames.passportBioScan ? (
                      <em className={styles.uploadFileName}>{fileNames.passportBioScan}</em>
                    ) : null}
                    <input
                      ref={frontInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,.pdf"
                      className={styles.hiddenInput}
                      onChange={(e) => setFile("passportBioScan", e.target.files?.[0] ?? null)}
                    />
                  </button>

                  <button
                    type="button"
                    className={styles.uploadBox}
                    onClick={() => photoInputRef.current?.click()}
                  >
                    <MapPin size={28} aria-hidden />
                    <strong>{APPLY_PAGE.passportPhotoTitle}</strong>
                    <span>{APPLY_PAGE.passportPhotoHint}</span>
                    {fileNames.passportPhoto ? (
                      <em className={styles.uploadFileName}>{fileNames.passportPhoto}</em>
                    ) : null}
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,.pdf"
                      className={styles.hiddenInput}
                      onChange={(e) => setFile("passportPhoto", e.target.files?.[0] ?? null)}
                    />
                  </button>
                </div>
              </section>
            ) : null}

            {currentStep?.id === "personal" ? (
              <section>
                <div className={styles.cardHead}>
                  <FileText size={22} aria-hidden />
                  <div>
                    <h2>Personal Info</h2>
                    <p>Details as shown on your passport</p>
                  </div>
                </div>
                <FormFields fields={personalFields} values={values} onChange={setField} />
                <h3 className={styles.subHeading}>Additional</h3>
                <FormFields fields={SITUATION_FIELDS} values={values} onChange={setField} />
              </section>
            ) : null}

            {currentStep?.id === "travel" ? (
              <section>
                <div className={styles.cardHead}>
                  <FileText size={22} aria-hidden />
                  <div>
                    <h2>Travel Details</h2>
                    <p>Your planned travel to Afghanistan</p>
                  </div>
                </div>
                <FormFields fields={travelExtraFields} values={values} onChange={setField} />
              </section>
            ) : null}

            {currentStep?.id === "documents" ? (
              <section>
                <div className={styles.cardHead}>
                  <FileText size={22} aria-hidden />
                  <div>
                    <h2>Documents</h2>
                    <p>Upload documents for {visa?.name ?? "your visa"}</p>
                  </div>
                </div>
                <FormFields
                  fields={documentUploadFields}
                  values={values}
                  onChange={setField}
                  fileNames={fileNames}
                  onFileChange={setFile}
                />
              </section>
            ) : null}

            {currentStep?.id === "review" ? (
              <section>
                <div className={styles.cardHead}>
                  <FileText size={22} aria-hidden />
                  <div>
                    <h2>Review</h2>
                    <p>Confirm details before submitting</p>
                  </div>
                </div>

                <div className={styles.reviewGrid}>
                  <div className={styles.reviewBlock}>
                    <h3>Visa type</h3>
                    <p><strong>{visa?.name}</strong></p>
                    <p className={styles.muted}>{visa?.shortDescription}</p>
                  </div>
                  <div className={styles.reviewBlock}>
                    <h3>Personal</h3>
                    <ul>
                      <li>Name: {String(values.fullName || "—")}</li>
                      <li>Nationality: {String(values.nationality || "—")}</li>
                      <li>Residence: {String(values.countryOfResidence || "—")}</li>
                      <li>Passport: {String(values.passportNumber || "—")}</li>
                      <li>Email: {String(values.email || "—")}</li>
                    </ul>
                  </div>
                  <div className={styles.reviewBlock}>
                    <h3>Passport uploads</h3>
                    <ul>
                      <li>Front: {fileNames.passportBioScan || "—"}</li>
                      <li>Photo: {fileNames.passportPhoto || "—"}</li>
                    </ul>
                  </div>
                  <div className={styles.reviewBlock}>
                    <h3>Travel</h3>
                    <ul>
                      <li>Entry: {String(values.intendedEntryDate || "—")}</li>
                      <li>Exit: {String(values.intendedExitDate || "—")}</li>
                      <li>Address: {String(values.addressInAfghanistan || "—")}</li>
                    </ul>
                  </div>
                </div>

                {visa?.fees ? (
                  <div className={styles.reviewBlock} style={{ marginBottom: "1.25rem" }}>
                    <h3>Fees</h3>
                    <ul>
                      {visa.fees.lines.map((line) => (
                        <li key={line.label}>{line.label}: {line.amount}</li>
                      ))}
                      {visa.fees.totalLabel ? (
                        <li><strong>{visa.fees.totalLabel}: {visa.fees.totalAmount}</strong></li>
                      ) : null}
                    </ul>
                    {visa.fees.disclaimer ? <p className={styles.muted}>{visa.fees.disclaimer}</p> : null}
                  </div>
                ) : null}

                <FormFields fields={REVIEW_FIELDS} values={values} onChange={setField} />
              </section>
            ) : null}

            <div className={styles.actions}>
              {stepIndex === 0 ? (
                <Link href="/" className={`btn btn-outline ${styles.navSecondary}`}>
                  <ArrowLeft size={16} aria-hidden />
                  {APPLY_PAGE.backToHome}
                </Link>
              ) : (
                <button
                  type="button"
                  className={`btn btn-outline ${styles.navSecondary}`}
                  onClick={goPrev}
                >
                  <ArrowLeft size={16} aria-hidden />
                  {APPLY_PAGE.previous}
                </button>
              )}

              {stepIndex === 0 ? (
                <button type="submit" className={`btn btn-primary ${styles.navPrimary}`}>
                  {APPLY_PAGE.startApplication}
                  <ArrowRight size={16} aria-hidden />
                </button>
              ) : stepIndex === APPLY_STEPS.length - 1 ? (
                <button
                  type="submit"
                  className={`btn btn-primary ${styles.navPrimary}`}
                  disabled={!values.digitalSignature}
                >
                  {APPLY_PAGE.submit}
                  <ArrowRight size={16} aria-hidden />
                </button>
              ) : (
                <button
                  type="submit"
                  className={`btn btn-primary ${styles.navPrimary}`}
                  disabled={currentStep?.id === "passport" && !passportUploaded}
                >
                  {APPLY_PAGE.continue}
                  <ArrowRight size={16} aria-hidden />
                </button>
              )}
            </div>
          </form>
        )}
      </div>

      {eligibilityOpen ? (
        <div
          className={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="eligibility-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeEligibilityModal();
          }}
        >
          <div className={styles.modalBox}>
            <button
              type="button"
              className={styles.modalClose}
              onClick={closeEligibilityModal}
              aria-label="Close"
            >
              <X size={18} aria-hidden />
            </button>

            {!eligibilityResult ? (
              <>
                <h2 id="eligibility-modal-title" className={styles.modalTitle}>
                  eVisa Eligibility Check
                </h2>
                <p className={styles.modalSubtitle}>
                  Confirm your nationality and country of residence before continuing.
                </p>

                <div className={styles.modalFields}>
                  <div className={styles.field}>
                    <label htmlFor="eligibility-nationality" className={styles.fieldLabel}>
                      Nationality<span className={styles.req}> *</span>
                    </label>
                    <select
                      id="eligibility-nationality"
                      className={styles.input}
                      value={modalNationality}
                      onChange={(e) => {
                        setModalNationality(e.target.value);
                        setEligibilityResult(null);
                      }}
                    >
                      <option value="">Select…</option>
                      {COUNTRY_OPTIONS.map((opt) => (
                        <option key={`nat-${opt.value}`} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="eligibility-residence" className={styles.fieldLabel}>
                      Country of residence<span className={styles.req}> *</span>
                    </label>
                    <select
                      id="eligibility-residence"
                      className={styles.input}
                      value={modalResidence}
                      onChange={(e) => {
                        setModalResidence(e.target.value);
                        setEligibilityResult(null);
                      }}
                    >
                      <option value="">Select…</option>
                      {COUNTRY_OPTIONS.map((opt) => (
                        <option key={`res-${opt.value}`} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className={styles.modalActions}>
                  <button
                    type="button"
                    className={`btn btn-primary ${styles.navPrimary}`}
                    onClick={handleCheckEligibility}
                    disabled={!modalNationality || !modalResidence}
                  >
                    Check Eligibility
                  </button>
                </div>
              </>
            ) : eligibilityResult.eligible ? (
              <div className={styles.modalResult}>
                <div className={styles.modalResultIcon}>
                  <Check size={28} aria-hidden />
                </div>
                <h3 id="eligibility-modal-title">You&apos;re eligible for eVisa!</h3>
                <p>You can continue with your online tourist eVisa application.</p>
                <div className={styles.modalActions} style={{ width: "100%", justifyContent: "center" }}>
                  <button
                    type="button"
                    className={`btn btn-primary ${styles.navPrimary}`}
                    onClick={handleEligibleContinue}
                  >
                    Continue
                    <ArrowRight size={16} aria-hidden />
                  </button>
                </div>
              </div>
            ) : eligibilityResult.reason === "hard_refuse" ? (
              <div className={styles.modalResult}>
                <div className={`${styles.modalResultIcon} ${styles.modalResultIconWarn}`}>
                  <AlertTriangle size={28} aria-hidden />
                </div>
                <h3 id="eligibility-modal-title">
                  Unfortunately, visa applications are not available for your nationality.
                </h3>
                <div className={styles.modalActions} style={{ width: "100%", justifyContent: "center" }}>
                  <button
                    type="button"
                    className={`btn btn-outline ${styles.navSecondary}`}
                    onClick={closeEligibilityModal}
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.modalResult}>
                <div className={`${styles.modalResultIcon} ${styles.modalResultIconWarn}`}>
                  <AlertTriangle size={28} aria-hidden />
                </div>
                <h3 id="eligibility-modal-title">
                  You&apos;re not eligible for eVisa based on your{" "}
                  {eligibilityResult.reason === "blocked_nationality"
                    ? "nationality"
                    : "country of residence"}
                  .
                </h3>
                <p>You can apply through an Embassy instead.</p>
                <div className={styles.modalActions} style={{ width: "100%", justifyContent: "center" }}>
                  <button
                    type="button"
                    className={`btn btn-primary ${styles.navPrimary}`}
                    onClick={handleSwitchToEmbassy}
                  >
                    Apply via Embassy
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}