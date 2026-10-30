# Topview T1 Canvas Contract

Use this reference only after a live Canvas capability selects Topview T1. Match the user name `Topview T1` or the model id `topview-t1` to that capability. The exact `model`, task type, parameter spelling, enum values, input roles, resolution choices, and duration bounds still come from `get_topview_canvas_generation_capabilities`; this file supplies model semantics, not a substitute schema.

Never copy a resolution, duration, or ratio from this file when the selected capability disagrees. Do not send Seedance-only fields to Topview T1.

## Parameters that must not be invented

Topview T1 does not advertise these controls. Omit them unless the selected capability explicitly exposes the same key:

- `draftMode`
- `omniReferenceTaskType`
- `internetSearch`
- resolution `480` or any `480p` label

`draftMode=true` and resolution `480` are rejected. A reference video does not imply Seedance `edit` or `extend`.

## Task shapes

| Capability task | Pass | Omit |
| --- | --- | --- |
| `text_to_video` | prompt, `aspectRatio`, `resolution`, `duration` | image inputs |
| `image_to_video` | first frame; end frame only when supplied | `aspectRatio` (the input image decides it); prompt may be omitted |
| `video_edit` | at least one reference image or reference video, plus `aspectRatio`, `resolution`, `duration` | `omniReferenceTaskType`; prompt may be omitted |

Current compatibility baseline, overridden by the live enum:

- resolution is `720` or `1080`, as a number when the schema type is number;
- duration is `-1` for smart duration, or an integer from 4 through 30 seconds;
- aspect ratio, when the task accepts it, is one of `adaptive`, `9:16`, `3:4`, `1:1`, `4:3`, `16:9`, `21:9`.

For `video_edit`, keep the reference budget inside the live input roles. The current baseline is at most 30 images, 10 videos, and 10 audios, with no more than 50 media items together. A single audio and the combined audio stay within about 2 through 30.2 seconds. Those counts are not permission to invent roles the capability does not list.

## Submit

1. Resolve the exact live Topview T1 capability for the chosen task type before freezing resolution, duration, ratio, or inputs.
2. Copy only keys that capability advertises into `parameters`, using its defaults for fields the user did not set.
3. Pass the capability `model` value unchanged. Do not rewrite it to a Seedance id.
4. Keep ratio, duration, and resolution in structured parameters, not in the prompt.

## Plugin gift allowance

Eligible paid subscribers receive 5 Topview T1 video generations once after plugin authorization. Only **720p** videos with explicit requested durations greater than zero and at most **15 seconds inclusive** may use this allowance. Query the live allowance/quote before promising free generation; do not infer a balance from installation. Other resolutions, longer videos, automatic or unspecified duration, and exhausted allowances use normal credit billing. Keep the user's requested duration and resolution; do not downgrade, shorten or split a paid request just to consume gifts. Existing H3/Wan balances remain usable without conversion or a second T1 grant. The existing 10 shared GPT Image 2.5 gifts and subscription eligibility are unchanged.
