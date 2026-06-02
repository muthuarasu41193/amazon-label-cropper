# Amazon Label Cropper

A small browser-only tool for converting Amazon shipping PDFs from two labels per page into one thermal-printer label per page.

## Use

1. Open the web app.
2. Upload the official Amazon shipping PDF.
3. Keep the source layout as `Labels on left, invoices on right`.
4. Click `Crop labels`.
5. Download the cropped PDF.

The PDF is processed inside the browser. Files are not uploaded to a server.

The output can also paste only a tight cropped product-details and quantity row from the matching invoice below each shipping label.
