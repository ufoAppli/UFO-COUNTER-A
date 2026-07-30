Place the provided app icon image(s) in this folder with the following names:

- `icon.png`     — original image (used in the UI header)
- `icon-192.png` — 192×192 PNG (used for favicon / manifest)
- `icon-512.png` — 512×512 PNG (used for manifest / splash)

Tips to create the PNGs:
- Use an image editor or web tool to crop any transparent/white margin and export square PNGs.
- Example ImageMagick commands (Windows, with ImageMagick installed):

  magick convert input.png -resize 512x512 -gravity center -background none -extent 512x512 icons/icon-512.png
  magick convert input.png -resize 192x192 -gravity center -background none -extent 192x192 icons/icon-192.png

After placing files, reload the app in the browser. If you want, I can create the PNG sizes for you if you upload the original image file into the workspace at `icons/icon.png`.
