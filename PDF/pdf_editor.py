import json
import shutil
from pathlib import Path

import fitz

EXTRACT_DIR = Path("PDF_Imagenes_Extraidas")
METADATA_FILE = "metadata.json"


def build_image_metadata(doc):
    metadata_by_xref = {}

    for page_num in range(len(doc)):
        page = doc[page_num]
        for image_index, image in enumerate(page.get_images()):
            xref = image[0]
            entry = metadata_by_xref.get(xref)
            if entry is None:
                base = doc.extract_image(xref)
                ext = base["ext"]
                entry = {
                    "xref": xref,
                    "name": f"xref_{xref:05d}.{ext}",
                    "ext": ext,
                    "width": base["width"],
                    "height": base["height"],
                    "pages": [],
                    "bbox": None,
                }
                metadata_by_xref[xref] = entry

            bbox = None
            try:
                rect = page.get_image_bbox(image)
                bbox = [rect.x0, rect.y0, rect.x1, rect.y1]
            except Exception:
                bbox = None

            entry["pages"].append({
                "page": page_num,
                "index": image_index,
                "bbox": bbox,
            })

    return list(metadata_by_xref.values())


def extraer_imagenes(pdf_path):
    folder = EXTRACT_DIR
    if folder.exists():
        shutil.rmtree(folder)
    folder.mkdir(parents=True, exist_ok=True)

    with fitz.open(pdf_path) as doc:
        metadata = build_image_metadata(doc)

        for item in metadata:
            base = doc.extract_image(item["xref"])
            output_path = folder / item["name"]
            ext = item["ext"].lower()

            if ext in {"jpg", "jpeg"}:
                output_path.write_bytes(base["image"])
                continue

            pixmap = fitz.Pixmap(doc, item["xref"])
            try:
                if pixmap.alpha or pixmap.n > 4:
                    pixmap = fitz.Pixmap(fitz.csRGB, pixmap)
                pixmap.save(str(output_path))
            finally:
                pixmap = None

    (folder / METADATA_FILE).write_text(
        json.dumps(metadata, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    print(f"\n  Imagenes extraidas: {len(metadata)}")
    print(f"  Carpeta: {folder}")
    print("  Edita las imagenes y luego ejecuta la opcion 2.\n")


def regenerar_pdf(pdf_path, output_pdf):
    folder = EXTRACT_DIR
    meta_path = folder / METADATA_FILE

    if not meta_path.exists():
        print("  Error: No hay imagenes extraidas. Ejecuta primero la opcion 1.")
        return False

    metadata = json.loads(meta_path.read_text(encoding="utf-8"))
    replaced = 0

    with fitz.open(pdf_path) as doc:
        for item in metadata:
            image_path = folder / item["name"]
            if not image_path.exists():
                continue

            try:
                pixmap = fitz.Pixmap(str(image_path))
                if pixmap.alpha or pixmap.n > 4:
                    pixmap = fitz.Pixmap(fitz.csRGB, pixmap)
                target_page = item["pages"][0]["page"]
                doc[target_page].replace_image(item["xref"], pixmap=pixmap)
                replaced += 1
            except Exception as error:
                print(f"  [!] Error en {item['name']}: {error}")

        doc.save(output_pdf, deflate=True, garbage=4, clean=True)

    print(f"\n  Imagenes reemplazadas: {replaced}")
    print(f"  PDF generado: {output_pdf}\n")
    return True


def main():
    print("=" * 52)
    print("            GESTOR DE IMAGENES EN PDF")
    print("=" * 52)

    pdf_input = input("\n  Archivo PDF (ej: documento.pdf): ").strip()
    pdf_path = Path(pdf_input)

    if not pdf_path.exists():
        print(f"  Error: No se encuentra '{pdf_input}'")
        return

    print("\n  [1] Extraer imagenes a carpeta")
    print("  [2] Regenerar PDF con imagenes editadas")
    option = input("\n  Selecciona (1/2): ").strip()

    if option == "1":
        extraer_imagenes(str(pdf_path))
    elif option == "2":
        output = pdf_path.stem + "_editado.pdf"
        regenerar_pdf(str(pdf_path), str(pdf_path.parent / output))
    else:
        print("  Opcion no valida.")


if __name__ == "__main__":
    main()
