import fitz

pdf_path = r"C:\Users\HP 250 G10\Downloads\TF MONOGRAFIA VAK - Christhian Keim2025.pdf"
doc = fitz.open(pdf_path)
page = doc[0]
image_list = page.get_images(full=True)

if image_list:
    xref = image_list[0][0]
    base_image = doc.extract_image(xref)
    image_bytes = base_image["image"]
    image_ext = base_image["ext"]
    
    with open(f"logo.{image_ext}", "wb") as f:
        f.write(image_bytes)
    print(f"Extracted logo.{image_ext}")
else:
    print("No images found on page 1")
