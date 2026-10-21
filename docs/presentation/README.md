# MedGuard AWS Presentation

AWS subject deck for **MedGuard** (counterfeit medicine detection). No SIH branding.

## Files

| File | Use |
|------|-----|
| [`medguard-aws.html`](./medguard-aws.html) | Primary deck — dark UI, Mermaid diagrams, keyboard animations |
| [`MedGuard_AWS.pptx`](./MedGuard_AWS.pptx) | PowerPoint export for upload / offline |
| [`generate_pptx.py`](./generate_pptx.py) | Regenerates the PPTX |

## Present the HTML deck

```bash
open docs/presentation/medguard-aws.html
# or
npx --yes serve docs/presentation
```

- `←` `→` or `Space` — navigate  
- `F` — fullscreen  

## Team

- Tanay Mitra · 24BCE1287  
- Rishav Kumar  
- Aditya Arora  

## Note on AWS

Slides mark AWS as a **planned target architecture**. Current lab stack remains Node + SQLite; the deck maps how that migrates onto Amplify, App Runner/ECS, RDS, KMS, Cognito, WAF, and related services.
