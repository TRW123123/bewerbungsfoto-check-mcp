const target = {
  type: "string",
  enum: ["linkedin", "xing", "application", "all"],
  default: "all",
  description:
    "Destination for crop recommendations: linkedin, xing, application or all (default). Example: linkedin. All includes every destination.",
  examples: ["linkedin"],
};
const object = (properties: Record<string, unknown>, required: string[]) => ({
  type: "object",
  properties,
  required,
  additionalProperties: false,
});
const criterion = object(
  {
    id: { type: "string" },
    label: { type: "string" },
    status: { type: "string", enum: ["pass", "warn", "fail", "not_checked"] },
    value: {
      type: ["object", "number", "null"],
      description: "Measured dimensions, file metadata or pixel metrics; aspect ratio is numeric and unchecked criteria are null.",
      additionalProperties: {
        anyOf: [{ type: "number" }, { type: "string" }, { type: "array", items: { type: "number" } }],
      },
    },
    threshold: { type: "string" },
    tip: { type: "string" },
  },
  ["id", "label", "status", "value", "threshold", "tip"],
);
const policy =
  " The image is analysed in memory and not stored. It does not generate images, video or audio or return edited images. It does not judge attractiveness, identity, age, gender, ethnicity or any other personal attribute; no face recognition or biometric identification.";
export const tools = [
  {
    name: "check_headshot_photo",
    title: "Check headshot photo",
    description:
      "Use this when the user wants technical checks of one professional profile or job-application photo from a public HTTPS URL or base64. Maximum 8 MB; image_url is recommended. Base64 above roughly 150 KB may exceed the Worker CPU budget. Auto mode resizes through an optional Images binding for pixel metrics, including WebP. Without it, only small JPEG/PNG inputs receive pixel checks; other inputs receive explicit header-only results. Sharpness detects coarse blur only. Face framing is not checked. URL fetching contacts user-selected external hosts and is limited to 8 seconds and 3 redirects. Cloudflare Images may internally resize the input for metrics; no edited image is returned. Operational call metadata is logged. Do not use for image creation, editing, personal-attribute judgments or identity verification." +
      policy,
    inputSchema: {
      ...object(
        {
          image_url: {
            type: "string",
            format: "uri",
            maxLength: 2048,
            minLength: 1,
            description:
              "Public HTTPS image URL without credentials or custom port. IP literals and internal hostnames are blocked. Fetching contacts the user-selected external image host and validated redirect hosts; those hosts may log requests. Maximum 2048 characters.",
            examples: ["https://images.example.org/headshot.jpg"],
          },
          image_base64: {
            type: "string",
            minLength: 1,
            maxLength: 10666720,
            description:
              "One JPEG, PNG or WebP encoded as base64, optionally prefixed by data:image/...;base64,. At most 8,000,000 decoded bytes. Prefer image_url; base64 payloads above roughly 150 KB may exceed the Worker CPU budget.",
            examples: ["data:image/png;base64,iVBORw0KGgo..."],
          },
          target,
        },
        [],
      ),
      oneOf: [
        { required: ["image_url"], not: { required: ["image_base64"] } },
        { required: ["image_base64"], not: { required: ["image_url"] } },
      ],
    },
    outputSchema: object(
      {
        overall_score: { type: "integer", minimum: 0, maximum: 100 },
        verdict: { type: "string" },
        target,
        analysis_mode: { type: "string", enum: ["full", "images-binding", "header-only"] },
        score_scope: { type: "string" },
        criteria: { type: "array", items: criterion, maxItems: 9 },
        improvement_tips: {
          type: "array",
          maxItems: 9,
          items: object(
            {
              priority: { type: "integer" },
              criterion: { type: "string" },
              tip: { type: "string" },
            },
            ["priority", "criterion", "tip"],
          ),
        },
        recommended_crops: {
          type: "object",
          additionalProperties: { type: "string" },
        },
        notes: { type: "array", items: { type: "string" } },
      },
      [
        "overall_score",
        "verdict",
        "target",
        "analysis_mode",
        "score_scope",
        "criteria",
        "improvement_tips",
        "recommended_crops",
        "notes",
      ],
    ),
    annotations: {
      title: "Check headshot photo",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
  },
  {
    name: "get_headshot_photo_requirements",
    title: "Get headshot requirements",
    description:
      "Use this when the user wants a technical headshot checklist and crop recommendations for LinkedIn, XING or job applications. Returns static recommendations, not official platform upload limits; no image input or external network access. No persistent changes; operational call metadata is logged. Do not use for assessing an actual image or confirming platform acceptance." +
      policy,
    inputSchema: object({ target }, []),
    outputSchema: object(
      {
        target,
        recommendations: object(
          {
            digital: { type: "string" },
            print: { type: "string" },
            crops: { type: "object", additionalProperties: { type: "string" } },
            formats: { type: "string" },
            max_bytes: { type: "integer" },
            brightness: { type: "string" },
            contrast: { type: "string" },
            background: { type: "string" },
            sharpness: { type: "string" },
          },
          [
            "digital",
            "print",
            "crops",
            "formats",
            "max_bytes",
            "brightness",
            "contrast",
            "background",
            "sharpness",
          ],
        ),
        checklist: { type: "array", items: { type: "string" } },
        note: { type: "string" },
      },
      ["target", "recommendations", "checklist", "note"],
    ),
    annotations: {
      title: "Get headshot requirements",
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
];
