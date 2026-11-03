# Submission test cases — DRAFT

Synthetic images only. These are expected routing/behavior cases; live ChatGPT/Claude routing has NOT been tested because this endpoint is not deployed. No login or submission was performed.

## Positive cases (exactly 5)

| # | Prompt | Expected tool | Expected behaviour |
|---|---|---|---|
| P1 | Check my LinkedIn headshot at this public HTTPS image URL. | check_headshot_photo | Fetch one image, return technical criteria and a square crop recommendation; clearly label partial coverage in header-only mode. |
| P2 | Is this base64 PNG too dark for a job application? | check_headshot_photo | Accept one base64 image and target application; full mode detects dark exposure, header-only explicitly skips exposure. |
| P3 | What dimensions and crop should I prepare for XING? | get_headshot_photo_requirements | Return recommendations and checklist, not fabricated official upload specs. |
| P4 | Check this WebP headshot and tell me what to improve. | check_headshot_photo | Read dimensions, mark pixel checks unchecked and recommend JPEG/PNG conversion. |
| P5 | Give me a checklist for a professional application photo before I take it. | get_headshot_photo_requirements | Return static lighting, framing, crop and resolution advice without requesting an image. |

## Negative cases (exactly 3)

| # | Prompt | Expected tool | Expected behaviour |
|---|---|---|---|
| N1 | Generate a new headshot and replace my background. | None | Explain image generation/editing is outside scope. |
| N2 | Identify this person and estimate their age and ethnicity. | None | Do not invoke these tools for identity or personal-attribute analysis. |
| N3 | Fetch my photo from http://127.0.0.1/private.png. | None | Do not fetch; if called despite routing, return a clear blocked-URL error. |

## Golden prompt set — 10 direct

1. Check this public HTTPS headshot for LinkedIn.
2. Analyse the technical quality of this base64 JPEG.
3. Check my application photo's resolution.
4. Give me XING headshot requirements.
5. Show all professional-photo crop recommendations.
6. Check this PNG's exposure and contrast.
7. Check whether this headshot background is busy.
8. Check this headshot's sharpness with your technical heuristic.
9. Give me a job-application photo checklist.
10. Read the dimensions of this WebP headshot.

## Golden prompt set — 10 indirect

1. My CV photo looks pixelated when printed; can you check the file?
2. My profile image gets awkwardly cropped into a circle; what shape should I prepare?
3. I am taking a career portrait tomorrow; what should I check first?
4. This portrait looks washed out; can you measure contrast?
5. My application picture seems very dark; can you check exposure?
6. The bookshelves behind me are distracting; can you check the border structure?
7. My photo export is WebP; can you tell me its size and analysis limitations?
8. I need one picture for both professional networks and a CV; which crops should I prepare?
9. Here is a base64 portrait export; which technical problems should I fix first?
10. My headshot has a yellow cast; can you check its overall color balance?

## Golden prompt set — 10 negative

1. Make me a new AI portrait.
2. Remove the background from my photo.
3. Retouch my face.
4. Rate my attractiveness.
5. Tell me this person's ethnicity.
6. Identify the person in this picture.
7. Estimate this person's age.
8. Decide whether this applicant should be hired based on their face.
9. Read the passport number in this image.
10. Write a cover letter without analysing a photo.

## Evaluation record

Before submission, run the 30 prompts in both ChatGPT and Claude with the proposed connector, record predicted tool, actual tool and behavior. Compute precision = correct positive calls / all calls; recall = correctly routed positives / all intended positives. Measure the direct and indirect sets separately. Results: pending operator deployment and authorized account testing; no invented precision/recall numbers. Demo video and public policy pages remain operator launch tasks.
