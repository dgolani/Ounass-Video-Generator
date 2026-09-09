Nunito Sans
===========

Designer: Vernon Adams (sansoxygen.com)
Version:  2.001
License:  SIL Open Font License 1.1 (see OFL.txt)
Source:   Static TTF release supplied by the Ounass marketing team
          (Nunito Sans.zip, 14 faces), converted here to woff2.

Faces shipped (7 weights x roman/italic = 14 files)
---------------------------------------------------
  ExtraLight  200  (usWeightClass 275 upstream; declared 200 in CSS,
                    which is the conventional mapping for ExtraLight)
  Light       300
  Regular     400
  SemiBold    600
  Bold        700
  ExtraBold   800
  Black       900

Note there is NO 500 (Medium) cut in this family. Weight pickers are
driven by FAMILY_WEIGHTS in app/src/engine/typography.ts so the UI only
offers weights that actually ship — picking a missing weight would let
the browser silently substitute or synthesise a face, which is exactly
the class of preview/export mismatch we fixed in Build 0.2.

Conversion
----------
Subset to Latin + Latin-Extended (accented brand names such as CHLOE,
HERMES, LOEWE render correctly) and converted to woff2:

  pyftsubset NunitoSans-<Style>.ttf \
    --unicodes="U+0000-00FF,U+0100-02BA,U+02BD-02C5,U+02C7-02CC,\
U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,\
U+1EF2-1EFF,U+2000-206F,U+2074,U+20A0-20C0,U+2113,U+2122,U+2191,U+2193,\
U+2212,U+2215,U+2C60-2C7F,U+A720-A7FF,U+FEFF,U+FFFD" \
    --layout-features='*' --flavor=woff2 \
    --output-file=NunitoSans-<Style>.woff2

Subsetting matters for export: html-to-image embeds web fonts by FAMILY
NAME, not by the weights actually used, so all 14 faces are inlined into
every rasterized frame. Full unsubset faces would add roughly 600 KB of
base64 per frame instead of ~390 KB.

The @font-face declarations live in app/src/styles/fonts.css. Nunito Sans
was previously pulled from Google Fonts via app/src/styles/google-fonts.css
(5 weights, no italics); those files were removed so exactly one source
declares this family — two sources for one family name means the later
import wins and silently changes which cut renders.
