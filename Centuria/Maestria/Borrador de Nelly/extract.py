import docx
import sys

def extract_text(filename):
    doc = docx.Document(filename)
    fullText = []
    for para in doc.paragraphs:
        fullText.append(para.text)
    return '\n'.join(fullText)

if __name__ == '__main__':
    text = extract_text("TRABAJO DE INVESTIGACIÓN-MONOGRAFÍA de Nelly.docx")
    with open("extracted_text.txt", "w", encoding="utf-8") as f:
        f.write(text)
    print("Extraction done.")
