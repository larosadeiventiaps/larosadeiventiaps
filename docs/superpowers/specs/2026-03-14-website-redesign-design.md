# La Rosa dei Venti APS - Website Redesign

## Overview

Static HTML/CSS/JS multi-page website replacing the existing WordPress site. Orange-themed (#E8630A), fully responsive. Content (projects, gallery) managed via JSON files for easy updates. Auto-deployed to Ergonet FTP via GitHub Actions on push to main.

## File Structure

```
/
├── index.html              # Home
├── mission.html            # Mission
├── progetti.html           # Progetti
├── gallery.html            # Foto Gallery
├── contatti.html           # Contatti
├── css/
│   └── style.css           # Single stylesheet
├── js/
│   └── main.js             # Filters, JSON loading, lightbox, hamburger menu
├── data/
│   ├── projects.json       # Project entries
│   └── gallery.json        # Gallery entries
├── images/
│   ├── logo.png
│   ├── projects/           # Project images
│   └── gallery/            # Gallery images
├── 404.html                # Page not found
├── .htaccess               # New static-site htaccess (replaces WordPress one)
├── favicon.ico
```

No frameworks, no build tools. Pure HTML/CSS/JS.

## Shared Components

### Navbar
- Fixed to top of every page
- Background: #E8630A, text: white
- Left: logo + association name
- Right: menu links (Home, Mission, Progetti, Gallery, Contatti)
- Active page highlighted
- Mobile: hamburger menu icon, slides open a menu panel

### Footer
- Background: #333, text: white
- Contains: address, email, social media icons, copyright
- Consistent across all pages

## Pages

### Home (index.html)
- **Hero section**: full-width, orange gradient background (linear-gradient #E8630A to #F4A460), association name, tagline, CTA button "Scopri i progetti" linking to progetti.html
- **3 feature cards**: links to Mission, Progetti, Gallery with icon, title, short description
- **Latest projects section** (optional): shows the 3 most recent "in_corso" projects loaded from projects.json

### Mission (mission.html)
- **About section**: descriptive text about the association, its history and purpose
- **Values section**: cards in a grid (icon + title + description per card), e.g., Inclusione, Territorio, Cultura
- **Team section**: member cards in a grid (photo, name, role per card)
- Values and team content are hardcoded in HTML (not JSON) since they change rarely

### Progetti (progetti.html)
- **Filter bar**: sticky below navbar
  - Text search input (searches title and description)
  - Date range: "Da" and "A" date pickers
  - Filters apply to all sections simultaneously
- **3 vertical sections** with colored left border and heading:
  - "Progetti in Corso" — green accent (#28a745)
  - "Progetti Futuri" — blue accent (#007bff)
  - "Progetti Passati" — gray accent (#6c757d)
- **Project cards**: image, title, start date, end date, description
- Cards displayed in a responsive grid (3 cols desktop, 2 tablet, 1 mobile)
- Sections with no matching projects after filtering are hidden
- Data loaded from `data/projects.json` via fetch()

### Gallery (gallery.html)
- **Filter bar**: same style as progetti (text search + date range)
- **Photo grid**: responsive grid layout (3-4 cols desktop, 2 tablet, 1 mobile)
- **Photo cards**: image thumbnail, title, date, description
- Click on image opens a **lightbox** (fullscreen overlay with image, title, close button, prev/next navigation)
- Data loaded from `data/gallery.json` via fetch()

### Contatti (contatti.html)
- **Two-column layout** (stacks on mobile):
  - Left: contact info (address, phone, email, social media links with icons)
  - Right: contact form via Formspree (fields: name, email, message, submit button)
- **Google Maps embed**: full-width iframe below the two columns showing the association location

## Data Formats

### projects.json
```json
[
  {
    "title": "Nome Progetto",
    "description": "Didascalia del progetto",
    "image": "images/projects/nome.jpg",
    "startDate": "2026-01-15",
    "endDate": "2026-06-30",
    "status": "in_corso"
  }
]
```
Valid status values: `in_corso`, `futuro`, `passato`.

### gallery.json
```json
[
  {
    "title": "Titolo foto",
    "description": "Didascalia",
    "image": "images/gallery/foto.jpg",
    "date": "2026-02-10"
  }
]
```

## Adding Content

To add a project: add an entry to `data/projects.json`, place the image in `images/projects/`, commit and push.

To add a gallery photo: add an entry to `data/gallery.json`, place the image in `images/gallery/`, commit and push.

GitHub Actions auto-deploys to FTP on push to main.

## Design System

- **Primary color**: #E8630A (orange)
- **Primary gradient**: linear-gradient(135deg, #E8630A, #F4A460)
- **Accent colors**: green #28a745 (in corso), blue #007bff (futuri), gray #6c757d (passati)
- **Background light**: #FFF3E8 (light orange tint for cards/sections)
- **Dark background**: #333 (footer)
- **Text**: #333 (body), white (on dark/orange backgrounds)
- **Font**: system font stack (no external font loading)
- **Border radius**: 8px for cards, 4px for inputs/buttons
- **Responsive breakpoints**: 768px (tablet), 480px (mobile)

## JavaScript Behavior

- `main.js` handles all interactive behavior:
  - Hamburger menu toggle on mobile
  - Fetch and render projects.json on progetti.html
  - Fetch and render gallery.json on gallery.html
  - Text filter: case-insensitive match on title + description
  - Date filter: a project matches if its [startDate, endDate] range overlaps with the selected [Da, A] range; a gallery photo matches if its date falls within the range
  - Hide empty sections after filtering (projects page)
  - Lightbox: open/close, prev/next navigation, keyboard support (Escape, arrows)
  - Optional: load latest projects on home page

## Form Handling

Contact form submits to Formspree endpoint. Requires creating a free Formspree account and replacing the form action URL. Free tier: 50 submissions/month.

## Migration / Cleanup

Before or during implementation:
- Remove all WordPress files from the repository: `wp-content/`, `wp-config.php`, old `.htaccess`
- Create a new minimal `.htaccess` for the static site with: gzip compression, browser caching headers, `ErrorDocument 404 /404.html`, `Options -Indexes`
- Update `.github/workflows/deploy-ftp.yml` exclude list to also exclude `docs/**` and `.superpowers/**`

## Technical Notes

- **Social media icons**: inline SVGs (no external icon libraries)
- **Semantic HTML**: use `<nav>`, `<main>`, `<section>`, `<footer>`, `<article>` elements; provide `alt` text on all images
- **Meta tags**: each page includes viewport meta, description, and Open Graph tags
- **Local development**: use `python -m http.server` or VS Code Live Server (fetch() requires HTTP server, not file:// protocol)
- **Gallery grid**: CSS Grid with `auto-fill, minmax(280px, 1fr)` for responsive columns
