# Editors, canvas, and exports

## Shared editor composition — published interface images

The published Flowchart and Plot product images show a two-pane editor:

- **Left conversation pane**: user prompt, assistant processing text, generated-result thumbnails, follow-up composer, source upload, and small utility actions.
- **Main canvas**: a large grid or neutral stage with the current output, selection handles, zoom controls, and page/frame controls.
- **Top toolbar**: formatting, selection mode, undo/redo, save, source/code, and export depending on mode.

This editor is the real product center of gravity; the dashboard pages are support surfaces.

## Flowchart editor — published interface images

Top toolbar labels observed:

- Format;
- Multi Select;
- Undo;
- Redo;
- Save;
- Source Code;
- Export.

Canvas behavior shown:

- light grid background;
- white page/frame centered on the canvas;
- pan/zoom control with percentage, minus, plus, and reset/fit action;
- page indicator for multi-page/source states;
- selectable vector elements.

Selected-element Format panel shown:

- selection type (`Selected Rect` in the example);
- X and Y position;
- Scale;
- Width;
- Duplicate Element;
- Copy Source;
- Delete Element;
- Reset.

Global Format panel shown:

- Color vs Grayscale mode;
- Original and named palette/theme presets;
- global font growth slider shown as `Grow Font`;
- Reset.

Published docs additionally support fill color by HEX, stroke color, stroke width, dash pattern, element opacity, and stroke opacity in the vector canvas.

## Plot editor — published interface images

The plot editor uses the same conversational layout but treats a rendered chart or panel assembly as a selectable image/frame.

Observed controls:

- top-left object tools: Frame and Text;
- undo/redo;
- rectangular selection handles around the plot;
- zoom controls;
- Export menu anchored under the selected output;
- left-pane dataset preview and `Upload CSV / Excel or paste data directly`;
- conversational follow-up composer with `Auto` option.

Observed Export menu entries:

- PNG;
- JPG;
- SVG;
- PDF;
- Download Code.

Official product copy also promises PPT export. The screenshot menu did not show PPT; treat this as a configuration/version discrepancy until exercised.

## Illustration infinite canvas — published docs

Published capabilities:

- upload external images;
- add annotations;
- insert text, shapes, and lines;
- pencil drawing;
- organize assets with frames;
- manual or automatic layouts;
- AI editing tools on selected regions or text;
- aspect-ratio and recolor operations.

The exact live toolbar, layer model, shortcuts, and selection mechanics were not verified in the signed workspace during this pass.

### Live Illustration canvas — verified

The generated image was selected on the right-hand canvas and exposed:

- canvas zoom percentage, Zoom out, Zoom in, and Reset view;
- current credit balance and avatar in the canvas header;
- Select mode;
- Upload image;
- Mark images for chat;
- Frame;
- Text;
- Shapes;
- Lines;
- Pencil;
- Add comment;
- Undo and Redo;
- object dimensions (`Image 560 × 313` for the test result).

The selected Illustration exposed these object actions:

- Quick Edit;
- Region Redraw;
- Text Edit;
- Upscale;
- White BG;
- Aspect Ratio;
- Recolor;
- Edit in Canvas;
- Export.

After the first image appeared, Undo was enabled while Redo remained disabled. The canvas zoom automatically fit the generated image at 58% in the inspected Dia window.

The exact Export submenu was not opened because Dia's accessibility bridge could identify but not activate that popover reliably. Export formats in the matrix therefore remain official published claims, not live-download proof.

## Export matrix — published

| Mode/output | PNG | JPG | PDF | SVG | PPT/PPTX | Source/code | Built-in canvas |
|---|---:|---:|---:|---:|---:|---:|---:|
| Illustration | Yes | Yes | Yes | Yes | Editable PPTX | No published code | Yes after vectorization |
| Flowchart | Yes | Yes | Not consistently stated | Yes | Native/editable PPTX | Source file/source code stated | Yes |
| Plot | Yes | Yes | Yes | Yes | PPT claimed | Python code | Main plot canvas |

Published quality claims:

- raster upscaling through 8K, advertised as approximately 1200 DPI;
- infinitely scalable vector output;
- layered/editable SVG and PPTX;
- publication authorization PDF certificate with a unique verification ID on eligible paid plans.

## Sharing — published

- Password-protected share link.
- Recipient can see conversation process and image.
- Recipient cannot modify the project.

Unknowns to verify:

- link expiration;
- password reset/revocation;
- whether download is allowed;
- whether viewers need accounts;
- analytics/audit trail;
- whether shared links expose source uploads.
