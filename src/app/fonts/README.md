# Fonts

Self-hosted, subset WOFF2 files loaded with `next/font/local` (see `../fonts.ts`). Subsetting to
the characters the shop actually prints cuts ~25% (≈ 280 KB → 210 KB for all faces), which
matters on a slow phone connection where fonts were most of the page weight.

| File                                     | Family             | License    |
| ---------------------------------------- | ------------------ | ---------- |
| `im-fell-english-{regular,italic}.woff2` | IM FELL English    | OFL 1.1    |
| `im-fell-english-sc.woff2`               | IM FELL English SC | OFL 1.1    |
| `oswald.woff2` (variable, wght 400–700)  | Oswald             | OFL 1.1    |
| `rye.woff2`                              | Rye                | OFL 1.1    |
| `ultra.woff2`                            | Ultra              | Apache 2.0 |
| `courier-prime-{regular,bold}.woff2`     | Courier Prime      | OFL 1.1    |
| `homemade-apple.woff2`                   | Homemade Apple     | Apache 2.0 |

Source: the Google Fonts "latin" subsets, further subset with
[fonttools](https://github.com/fonttools/fonttools) to Basic Latin, the Latin-1 letters
Portuguese uses, and the shop's punctuation (curly quotes, dashes, ·, º, ×, arrows):

```sh
pyftsubset <font>.woff2 --flavor=woff2 \
  --layout-features='kern,liga,clig,calt,ccmp,locl,mark,mkmk' \
  --unicodes='U+0020-007E,U+00A0,U+00AA,U+00AB,U+00B0,U+00B7,U+00BA,U+00BB,U+00C0-00C3,U+00C7,U+00C9,U+00CA,U+00CD,U+00D3-00D5,U+00D7,U+00DA,U+00DC,U+00E0-00E3,U+00E7,U+00E9,U+00EA,U+00ED,U+00F3-00F5,U+00FA,U+00FC,U+2013,U+2014,U+2018,U+2019,U+201C,U+201D,U+2022,U+2026,U+2190,U+2192,U+2212'
```

Characters outside that set (a customer typing "ñ") fall back to the metric-matched system
font for that glyph only.
