import docx

doc = docx.Document("TP- TRABAJO DE INVESTIGACIÓN-MONOGRAFÍA.docx")
for i, para in enumerate(doc.paragraphs[:50]):
    if para.text.strip():
        print(f"{i}: {para.text}")
