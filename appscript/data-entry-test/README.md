# Data Entry Form — Test Setup

## Files
- `Code.gs` — Apps Script backend (validation, sheet writing)
- `form.html` — The HTML data entry form

---

## How to Deploy (5 steps)

### Step 1 — Open a new Apps Script project
Go to → https://script.google.com → click **New project**

### Step 2 — Add Code.gs
- Paste the entire contents of `Code.gs` into the default `Code.gs` file

### Step 3 — Add form.html
- Click **+** next to Files → choose **HTML**
- Name it exactly: `form` (no extension needed)
- Paste the entire contents of `form.html` into it

### Step 4 — Deploy as Web App
- Click **Deploy** → **New deployment**
- Type: **Web app**
- Execute as: **Me**
- Who has access: **Only myself**  ← keeps it private
- Click **Deploy** → copy the URL

### Step 5 — Open the form
- Paste the URL in your browser (must be logged into your Google account)
- The form loads, fill it in, submit
- A sheet named `Service_Providers` is auto-created in the spreadsheet on first submission

---

## What the form does

| Field | Validation |
|---|---|
| Provider Name | Required |
| Mobile 1 | Required, exactly 10 digits, duplicate check |
| Mobile 2 | Optional, 10 digits if provided |
| Area | Required, dropdown |
| Sub-Area | Optional text |
| Address | Optional text |
| Service 1 | Required, dropdown |
| Service 2 & 3 | Optional dropdowns |
| Reference Source | Optional text |
| Status | Default: Active |
| Featured | Default: No |

- `provider_id` is auto-generated (sequential)
- `submitted_at` timestamp is recorded automatically
- Duplicate phone numbers are rejected with the existing provider name shown
