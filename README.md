# bookbindass.com — website

Static marketing site for Bookbindass: personalised holidays, visa services and
event management.

## Structure

```
.
├── index.html      # single-page site (hero, offers, destinations, visas,
│                   # why us, how it works, events, stories, enquiry, bank details)
├── about.html      # about the company and the team
├── css/
│   └── style.css   # all styles, organised in 9 numbered sections
├── js/
│   └── script.js   # sticky header, mobile nav, scroll reveal, destination
│                   # filter, visa tabs, bank disclosure, copy buttons, form
└── images/
    ├── logo.png    # wordmark, transparent background
    ├── favicon.png # square "b" mark
    ├── hero.jpg    # hero background
    └── qr-upi.png  # UPI payment QR
```

No build step, no dependencies. Every file is served as-is.

## Running locally

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

## Brand

Colours are taken from the logo and defined as custom properties at the top of
`css/style.css`:

| Token | Value | Use |
| --- | --- | --- |
| `--indigo-700` | `#26186e` | logo indigo — dark sections, links |
| `--orange-500` | `#e87b18` | logo orange — CTAs, accents |

Fonts are Fraunces (headings) and Plus Jakarta Sans (body), loaded from Google
Fonts.

## Before going live

Some content is placeholder and needs replacing with real figures:

- **Enquiry form has no backend.** It validates and shows a success message but
  sends nothing. Wire the submit handler in `js/script.js` to a form service or
  CRM.
- **Destination prices** in `index.html` are indicative examples.
- **Company stats** ("3,400+ trips", "founded 2016") and the four team members
  on `about.html` are placeholders.
- **UK visa** is listed once at ₹5,899. The previous site listed UK twice, at
  ₹5,899 and ₹13,999 — confirm whether these are different visa types.
- **Bank branch** is Ambala City, Haryana, matching IFSC `HDFC0000654`. The rest
  of the site lists Mohali as the office address.

## Accessibility

Skip link, keyboard-navigable visa tabs (arrow/Home/End), `aria-pressed` filter
chips, visible focus rings, and `prefers-reduced-motion` support. Checked for
horizontal overflow, 16px form inputs (no iOS zoom), and touch target sizes at
320–844px.
