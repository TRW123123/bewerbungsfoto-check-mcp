# Submission test cases

Canonical [five positive and three negative cases](../submission/listing-openai.md), [exact positive arguments](../submission/positive-cases.json), and [local result evidence](../submission/evidence/) are maintained together. Local code has been tested; hosted ChatGPT/Claude routing remains untested in this run. The endpoint is already live at operator-reported v0.1.1, while this branch prepares v0.1.2. No submission or deployment was performed.

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

Before submission, run the 30 prompts in both ChatGPT and Claude with the proposed connector, record predicted tool, actual tool and behavior. Compute precision = correct positive calls / all calls; recall = correctly routed positives / all intended positives. Measure the direct and indirect sets separately. Results: pending v0.1.2 deployment approval and authorized account testing; no invented precision/recall numbers. Demo video and public policy pages remain operator launch tasks.
