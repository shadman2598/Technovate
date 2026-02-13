# Technovate

Professional website for **Technovate** — a technology and AI startup. Designed to impress grant reviewers, government agencies, accelerators, and enterprise clients. Clean, credible, and innovation-focused.

## Run locally

Open `index.html` in a browser, or:

```bash
python3 -m http.server 8080
# Then visit http://localhost:8080
```

## Site structure

Single-page site with these sections:

1. **Home** — Mission, problem we solve, who we serve, why it matters  
2. **About** — Vision, leadership, responsibility & ethics  
3. **Technology** — AI/software approach, innovation, plain-language benefits  
4. **Solutions** — Products, industry use cases, roadmap  
5. **Impact** — Economic impact, job creation, public good alignment  
6. **Grants & Partnerships** — Commitment to compliance and accountability  
7. **Contact** — Form, email, location  

## Customization

- **Contact form:** The form currently shows a “Message sent” state without sending. To receive submissions, set the form `action` to your endpoint (e.g. [Formspree](https://formspree.io)) or add your own backend.
- **Email & location:** Update `hello@technovate.io` and “Toronto, Ontario, Canada” in the Contact section to your real details.
- **Leadership:** Replace the generic leadership copy in the About section with founder names and roles.
- **Colors:** Edit `:root` in `styles.css` (e.g. `--primary`, `--text-primary`).

No build step. Deploy the folder to any static host (Netlify, Vercel, GitHub Pages, etc.).
