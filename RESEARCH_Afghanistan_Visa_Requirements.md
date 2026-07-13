# Salaam Afghanistan — Visa Research Document (Step 1)

**Status:** Awaiting approval  
**Date:** 13 July 2026  
**Purpose:** Define visa types, eVisa eligibility, and document/field requirements so we can later store them in MongoDB (Step 2) and expose admin-editable APIs (Step 3).

> **Important:** Official rules change and vary by mission. This document consolidates public sources (E-Afghans portal, Dubai Consulate, MFA e-consulate, Islamabad/Bonn/New Delhi consular pages, and secondary travel guides). Treat figures as a **configurable baseline** for the platform — not immutable law. Admin Panel must be able to override fees, documents, and country rules without a code deploy.

---

## 1. Work plan (as agreed)

| Step | What | Gate |
|------|------|------|
| **1 – Research (this doc)** | Visa types, eVisa eligibility, docs/fields by type (and country where relevant) | **Your approval required** |
| **2 – DB seed** | Store visa types, country eligibility, document checklists, form fields, fees as editable config | After Step 1 approval |
| **3 – APIs** | Backend CRUD + public read endpoints so Admin Panel can edit and Website can consume | After Step 2 |

---

## 2. High-level findings

1. **Almost all foreign nationals need a visa** to enter Afghanistan. Limited visa-free cases apply mainly to people born in Afghanistan / to Afghan parents (ordinary passport exception).
2. **Two application channels exist:**
   - **eVisa (E-Afghans)** — currently **Tourist only**, online, Kabul Airport entry only.
   - **Embassy / Consulate visa** — Tourist, Business, Work, Transit, Visit/Family, Journalist/Media, Official/Diplomatic, Multi-entry, Stay, etc.
3. **eVisa eligibility is dual-filtered:** both **nationality (passport country)** and **country of residence** must be allowed.
4. **Document needs differ by visa type** (and sometimes by nationality for fees). Residence ID / parent passport can also apply by applicant situation.
5. For Salaam Afghanistan (PRD), content must be **admin-configurable**: visa types, fees, currencies, required documents, form fields, processing times, and eligibility rules.

---

## 3. Visa types (proposed platform catalog)

### 3.1 Online channel — eVisa

| Code | Name | Channel | Entries | Stay | Validity to enter | Entry point | Notes |
|------|------|---------|---------|------|-------------------|-------------|-------|
| `evisa_tourist` | Tourist eVisa | Online (E-Afghans / Salaam) | Single | Up to **30 days** from entry | **90 days** from issue | **Kabul International Airport only** | Not valid for land borders. Exit may be any point. Business/work/student **not** offered as eVisa today. |

**Processing (official Dubai Consulate / E-Afghans):**
- Standard: ~1–4 weeks  
- Express: up to 1 business day (+ express surcharge)

**Fee pattern (official Dubai Consulate — indicative):**

| Stage | Who | Amount (USD) |
|-------|-----|--------------|
| Initial (non-refundable, pay within 48h or app cancels) | All | ~8.25 (8 + 0.25 processing) |
| Remainder — Standard | USA | ~206.19 (200 + 6.19) |
| Remainder — Standard | Others | ~123.71 (120 + 3.71) |
| Remainder — Express | USA | ~257.73 (200 + 50 + 7.73) |
| Remainder — Express | Others | ~175.26 (120 + 50 + 5.26) |

> Platform should store fees as **rules** (by nationality / processing speed), editable in Admin — not hard-coded.

---

### 3.2 Embassy / Consulate channel (traditional)

Common types referenced across MFA / mission sites:

| Code | Name | Typical validity / stay | Entries | Typical purpose |
|------|------|-------------------------|---------|-----------------|
| `embassy_tourist` | Tourist Visa | Often 1 month stay; single entry (mission-dependent) | Usually single | Tourism, sightseeing, short cultural visits |
| `embassy_visit_family` | Visit / Family Visa | Often ~1 month stay | Usually single | Visiting relatives/friends |
| `embassy_business` | Business Visa | Up to **3 years** possible; multiple entries (mission-dependent) | Single or multiple | Trade, investment, commercial meetings |
| `embassy_work` | Work / Employment Visa | Per MoFA authorization | Per authorization | Employment with Afghan host/employer |
| `embassy_non_work` | Non-Work Entry Visa | ~3 months validity / ~1 month stay (per New Delhi types page) | Usually single | Study, research, media/cultural, seminars, family/legal affairs |
| `embassy_transit` | Transit Visa | Validity ~1 month; stay **72h air** / **6 days land** | Transit | Passing through Afghanistan |
| `embassy_journalist` | Journalist / Media Visa | Mission-dependent | Usually single | Reporting; MoFA Press Office coordination often required |
| `embassy_official` | Official / Diplomatic | Per mission / MoFA | Per authorization | Government / official assignment |
| `embassy_single_entry` | Single Entry (general) | ~3 months validity / ~1 month stay (after MoFA approval letter — New Delhi) | Single | General entry; may convert/extend inside AF with MoI |
| `embassy_multiple_entry` | Multiple Entry | 3 months–1 year (org staff, crews, drivers, etc.) | Multiple | Repeated travel for authorized categories |
| `embassy_stay` | Stay Visa | 1–2 years, extendable | — | Issued mainly inside AF by MoFA/MoI to holders of other visas |

**Phase 1 recommendation for Salaam:**  
Start with a **practical subset** that matches applicant demand and PRD scope:

1. Tourist eVisa  
2. Tourist (Embassy)  
3. Visit / Family  
4. Business  
5. Work  
6. Transit  
7. Journalist / Media  

Keep the rest in DB as inactive/configurable for later.

---

## 4. Who can get an eVisa?

Eligibility = **passport nationality allowed** AND **country of residence allowed**.  
If either fails → applicant must use **embassy/consulate** path (or is refused for Israel citizens).

### 4.1 Nationalities generally **ineligible** for eVisa (citizen of)

| Country | Notes |
|---------|--------|
| Afghanistan | Use other channels / not tourist eVisa for nationals |
| Pakistan | Neighbor; portal exclusion |
| Iran | Neighbor; portal exclusion |
| Tajikistan | Neighbor; portal exclusion |
| Uzbekistan | Neighbor; portal exclusion |
| Turkmenistan | Neighbor; portal exclusion |
| Kazakhstan | Listed as citizen+resident ineligible (Wikipedia / eligibility checker summaries) |
| Israel | **Admission refused** — no visa of any category; passport not recognized |

> China as a **citizen** is generally treated as eligible for eVisa **unless** the person **resides** in a restricted country (China is on the residence block list). Confirm against live E-Afghans eligibility checker before go-live.

### 4.2 Countries of **residence** that block eVisa (regardless of passport)

Even a French/Canadian/US passport holder is blocked if residing in:

| Restricted residence |
|----------------------|
| Azerbaijan |
| China |
| India |
| Indonesia |
| Kyrgyzstan |
| Malaysia |
| Oman |
| Qatar |
| Russia |
| Turkey |
| Saudi Arabia |
| United Arab Emirates |
| Kazakhstan *(also appears on citizen ineligible lists in some summaries)* |

**Also:** Non-citizen residents of **Israel** cannot get an eVisa.

### 4.3 Who *is* eligible (working rule for the platform)

- Citizens of **most other countries** (including Taiwan, Kosovo, Palestine, Vatican per secondary summaries), **and**
- Currently residing in a **non-restricted** country, **and**
- Not an Israeli citizen (hard refuse).

**Platform logic (for Step 2/3):**

```
IF nationality IN evisa_blocked_nationalities → eVisa = false
ELSE IF residence IN evisa_blocked_residences → eVisa = false
ELSE IF nationality == IL → refuse all
ELSE → eVisa tourist available
```

Admin must be able to edit both blocklists.

---

## 5. Documents & form fields

### 5.1 Universal fields (almost every application)

| Field / Document | Type | Required? | Notes |
|------------------|------|-----------|-------|
| Full name | Form | Yes | Match passport |
| Date of birth | Form | Yes | |
| Sex / gender | Form | Yes | |
| Nationality | Form | Yes | Drives eligibility + fees |
| Country of residence | Form | Yes | Drives eVisa eligibility |
| Passport number | Form | Yes | OCR target |
| Passport issuing country | Form | Yes | |
| Passport issue date | Form | Yes | |
| Passport expiry date | Form | Yes | Must be **≥ 6 months** validity typically |
| Passport bio-page scan | Upload | Yes | Clear, uncropped |
| Passport photo (applicant) | Upload | Yes | Color, **white background**, commonly **45×35 mm** (eVisa) or **5×4 cm** (some MFA pages) |
| Email / phone | Form | Yes | Notifications |
| Purpose of travel / reason | Form | Yes | Free text or structured |
| Intended entry date | Form | Yes | |
| Intended exit / stay duration | Form | Yes | Must fit visa max stay |
| Address in Afghanistan | Form | Often yes | Hotel / host address |
| Digital signature / declaration | Form | eVisa often yes | |

### 5.2 Situation-based universal extras

| Condition | Extra requirement |
|-----------|-------------------|
| Applicant under 18 | Parent/guardian passport copy; parental written consent (MFA) |
| Non-citizen resident abroad | National ID **or residence permit** copy |
| Contagious disease concern (rare / transit exceptions) | Health clearance letter |

---

### 5.3 By visa type — document & data checklist

#### A) Tourist eVisa (`evisa_tourist`)

| Item | Required / Optional | Source basis |
|------|---------------------|--------------|
| Passport bio page (≥6 months validity) | **Required** | Dubai Consulate / E-Afghans |
| Color photo 45×35 mm, white background | **Required** | Dubai Consulate |
| National ID / residence permit | **Required if applicable** | Dubai Consulate |
| Live facial / liveness verification | **Required** (official portal) | E-Afghans |
| Parent passport (if <18) | **Required if minor** | Dubai Consulate |
| Invitation letter / LOI | Optional (often strongly recommended / sometimes treated as needed by operators) | Mixed: Dubai = optional; some tour operators = required |
| Travel itinerary | Optional (recommended) | Dubai Consulate |
| Accommodation proof / hotel booking | Optional (recommended) | Dubai Consulate |
| Flight tickets | Often recommended; not always listed as mandatory on Dubai eVisa page | Secondary / embassy tourist checklists |
| Sponsor details (name, Tazkira, address) | Required **if** applicant selects sponsor/LOI path | Operator guides |
| Reason / cities to visit | Form fields | Operator + embassy tourist guidance |
| Stay duration (≤30 days) | Form | Official eVisa rules |

**Salaam Phase 1 suggestion:** mark passport, photo, travel dates, stay duration, AF address, purpose as required; LOI / flights / hotel / itinerary as **configurable required flags** in Admin.

---

#### B) Tourist — Embassy (`embassy_tourist`)

| Item | Required? |
|------|-----------|
| Completed visa application form | Yes |
| Passport (≥6 months + blank pages) | Yes |
| 2 passport photos (white background) | Yes |
| Invitation letter from sponsor / tour company | Yes (typical) |
| Confirmed flight bookings | Yes (typical) |
| Confirmed hotel / accommodation | Yes (typical) |
| Travel insurance | Yes (typical — Bonn/AU/CA style missions) |
| Bank statement (sufficient funds) | Yes (typical) |
| Tour operator license copy (if via operator) | Often yes |
| Detailed itinerary / places to visit | Yes |
| Proof of residence / local ID (mission-specific, e.g. German ID in Bonn) | Mission-specific |

---

#### C) Visit / Family (`embassy_visit_family`)

| Item | Required? |
|------|-----------|
| All universal passport + photo + form items | Yes |
| Letter of introduction from host in Afghanistan | Yes |
| Host identity / contact details | Yes |
| Relationship to host | Yes |
| Travel dates + stay duration | Yes |
| Flight + accommodation (or host address) | Usually yes |
| MoFA authorization letter (alternative path some missions accept) | Sometimes |

---

#### D) Business (`embassy_business`)

| Item | Required? |
|------|-----------|
| Universal passport + photos + form | Yes |
| Employer / company introduction letter (purpose, duration) | Yes |
| MoFA authorization / reference number | Yes (widely stated) |
| Company address in Afghanistan | Yes |
| Business license / work permit (investment path) | Often yes |
| Proof of commercial activity / tax / bank details | Often yes (investment) |
| Chamber of Commerce / related official letter | Sometimes |
| Intended meetings / commercial purpose | Form |

---

#### E) Work / Employment (`embassy_work`)

| Item | Required? |
|------|-----------|
| Universal passport + photos + form | Yes |
| Invitation / introduction from Afghan employer | Yes |
| MoFA Consular Affairs confirmation / authorization | Yes |
| Educational documents | Yes (typical) |
| Proof applicant below retirement age (~65) | Yes (mission guidance) |
| Financial guarantee / sponsorship for expenses | Often yes |
| Employment contract / job details / duration | Yes |

---

#### F) Transit (`embassy_transit`)

| Item | Required? |
|------|-----------|
| Universal passport + photos + form | Yes |
| Proof of onward travel (ticket to final destination) | Yes |
| Visa for destination country (if required) | Usually yes |
| Entry/exit dates within 72h (air) or 6 days (land) | Yes |
| Health clearance (exceptional cases) | Sometimes |

---

#### G) Journalist / Media (`embassy_journalist`)

| Item | Required? |
|------|-----------|
| Universal passport + photos + form | Yes |
| Introduction letter from news agency | Yes |
| Press card | Often yes |
| Purpose of reporting, destinations, who to meet, duration | Yes |
| Coordination with MoFA Directorate of Media Relations (Kabul) | Strongly required per missions |
| Accommodation / itinerary | Usually yes |

---

#### H) Official / Diplomatic (`embassy_official`)

| Item | Required? |
|------|-----------|
| Diplomatic/official passport (as applicable) | Yes |
| Employer letter of introduction | Yes |
| MoFA Kabul authorization to the mission | Yes |
| Purpose, duration, locations | Yes |

---

## 6. Country-wise notes (fees & process — not full unique checklists)

Most **document** differences are by **visa type**, not by every country. Country mainly affects:

1. **eVisa eligibility** (nationality + residence) — Section 4  
2. **Fees** (e.g. USA higher on eVisa tourist remainder)  
3. **Which mission** the applicant must visit if eVisa-ineligible  
4. **Mission-local extras** (e.g. German residence ID in Bonn)

### 6.1 Example fee variance (eVisa tourist remainder)

| Nationality bucket | Standard total (approx.) | Express total (approx.) |
|--------------------|--------------------------|-------------------------|
| United States | USD 206.19 | USD 257.73 |
| All other eligible | USD 123.71 | USD 175.26 |

### 6.2 Example embassy fee tables (vary heavily by mission — store as config)

Examples only:
- Bonn: Tourist €80, Single Entry €100, Urgent +€50  
- Australia mission (older public page): Tourist AUD 240, Single AUD 275, Urgent higher  
- New Delhi public fee matrix: varies by passport nationality (India/Pakistan/Iran/Turkey/UAE/USA/Others) and duration

**Do not hard-code mission fees in app logic** — Admin configures fee tables per visa type × nationality × duration × processing speed.

### 6.3 Special country rules to encode

| Rule | Behavior |
|------|----------|
| Israel (nationality) | Hard block — no application |
| eVisa blocked nationality | Hide eVisa; offer embassy types only |
| eVisa blocked residence | Hide eVisa; offer embassy types only |
| USA (eVisa fee rule) | Apply USA fee tier |
| Minor applicant | Require parent docs |
| Resident ≠ citizen | Require residence permit / national ID |

---

## 7. Proposed data shape (for Step 2 — preview only, not building yet)

So Admin can edit everything without deploys:

```
VisaType {
  code, name, channel: evisa|embassy,
  entries, maxStayDays, validityDays,
  entryPoints[], isActive, description
}

EligibilityRule {
  visaTypeCode,
  blockedNationalities[],
  blockedResidences[],
  hardRefuseNationalities[]  // e.g. IL
}

DocumentRequirement {
  visaTypeCode,
  key, label, type: upload|form_field,
  required: boolean,
  conditions[]  // e.g. age<18, isResidentForeigner
}

FormField {
  visaTypeCode,
  key, label, dataType, required, validation
}

FeeRule {
  visaTypeCode,
  nationality: ALL|ISO2,
  processing: standard|express,
  currency, amount, stage: initial|remainder|flat
}
```

This matches the PRD: *fees, processing-time estimates, and required-document checklists per visa type editable from Admin Panel*.

---

## 8. Sources used

| Source | URL / reference |
|--------|-----------------|
| Dubai Consulate — Applying for Visa (eVisa docs/fees) | https://afghanconsulate.ae/services/applying-for-visa/ |
| E-Afghans portal | https://eafghans.com/e-visa/ · https://visaportal.eafghans.com/ |
| MFA e-consulate instructions | http://econsulate.mfa.gov.af/InfoVisa.aspx |
| Islamabad Embassy visa page | https://islamabad.mfa.gov.af/visa/ |
| Bonn Consulate visa services | https://afghanmissionbonn.de/visa-services.php |
| New Delhi — Types of Visas | https://newdelhi.consular.af/visa-services-types-of-visas/ |
| Visa policy summary (eligibility lists) | https://en.wikipedia.org/wiki/Visa_policy_of_Afghanistan |
| Secondary operator guides | Visamundi, Young Pioneer Tours, Koryo Tours |

---

## 9. Open questions for you (please confirm)

1. **Phase 1 visa set:** Proceed with the 7 recommended types (Section 3.2), or only **Tourist eVisa** first?  
2. **LOI / flights / hotel for eVisa:** Treat as **optional**, **recommended**, or **mandatory** on our platform?  
3. **Fees:** Seed official Dubai eVisa fees as defaults, knowing Admin can edit later?  
4. **Blocked lists:** Approve Section 4 nationality + residence blocklists as initial seed?  
5. **Hard refuse Israel:** Encode as system rule from day one?  
6. **Liveness / selfie check:** In scope for Phase 1 backend, or defer (PRD OCR is in; liveness was not explicitly in PRD)?  
7. **Any Raizing-specific extra documents** beyond official lists?

---

## 10. Approval gate

Please reply with:

- **Approved as-is**, or  
- **Approved with changes** (list edits), or  
- **Revise** (what to change)

After your approval I will move to **Step 2: store this config in MongoDB**, then **Step 3: APIs** (read for website + CRUD for admin).
