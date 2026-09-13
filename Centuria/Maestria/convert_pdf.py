import win32com.client
import os
import time

def process_word_document():
    word = win32com.client.Dispatch("Word.Application")
    word.Visible = False
    word.DisplayAlerts = 0 # wdAlertsNone
    
    current_dir = r"c:\Users\HP 250 G10\Documents\GITHUT\Centuria\Maestria\Borradores"
    docx_path = os.path.join(current_dir, "TP-TRABAJO_DE_INVESTIGACION_MONOGRAFIA_ChristhianKeim_RealContent.docx")
    final_docx = os.path.join(current_dir, "TP-TRABAJO_DE_INVESTIGACION_MONOGRAFIA_ChristhianKeim_FINAL.docx")
    pdf_path = os.path.join(current_dir, "TP-TRABAJO_DE_INVESTIGACION_MONOGRAFIA_ChristhianKeim_FINAL.pdf")
    
    try:
        doc = word.Documents.Open(docx_path)
        
        # Update TOC is disabled because it hangs in COM
        
        doc.SaveAs(final_docx)
        
        # Footnote 1
        sel = word.Selection
        sel.HomeKey(Unit=6) # wdStory
        sel.Find.ClearFormatting()
        sel.Find.Text = "[FOOTNOTE]"
        
        if sel.Find.Execute():
            sel.Text = "" # Delete the placeholder
            ref_text = "Diario Última Hora. (10 de octubre de 2021). Fallas catastrales derivan en duplicación de impuestos en la comuna capitalina."
            doc.Footnotes.Add(sel.Range, "", ref_text)
            
        # Footnote 2
        sel.HomeKey(Unit=6)
        sel.Find.Text = "[FOOTNOTE]"
        if sel.Find.Execute():
            sel.Text = ""
            ref_text = "Diario ABC Color. (15 de marzo de 2022). Municipalidad de Asunción planea enviar a morosos a Inforconf."
            doc.Footnotes.Add(sel.Range, "", ref_text)

        # Footnote 3
        sel.HomeKey(Unit=6)
        sel.Find.Text = "[FOOTNOTE]"
        if sel.Find.Execute():
            sel.Text = ""
            ref_text = "Diario ABC Color. (2023). Alta morosidad por desidia administrativa en pagos de impuestos."
            doc.Footnotes.Add(sel.Range, "", ref_text)

        # Update TOC
        if doc.TablesOfContents.Count > 0:
            doc.TablesOfContents(1).Update()
            
        # Limpiar páginas en blanco al final (eliminar saltos de página extra al final)
        # Esto es complejo en COM, pero ya arreglé el script de python-docx para que no deje hojas en blanco al final.
        
        # Save changes to docx
        doc.Save()
        
        # Export to PDF
        # wdExportFormatPDF = 17
        doc.ExportAsFixedFormat(pdf_path, 17)
        print(f"Successfully generated PDF: {pdf_path}")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        doc.Close()
        word.Quit()

if __name__ == "__main__":
    process_word_document()
