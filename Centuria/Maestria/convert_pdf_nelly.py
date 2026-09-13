import win32com.client
import os

def process_word_document():
    word = win32com.client.Dispatch("Word.Application")
    word.Visible = False
    word.DisplayAlerts = 0 # wdAlertsNone
    
    current_dir = r"c:\Users\HP 250 G10\Documents\GITHUT\Centuria\Maestria\Borradores"
    docx_path = os.path.join(current_dir, "TP-TRABAJO_DE_INVESTIGACION_MONOGRAFIA_NellyDeKeim_FINAL.docx")
    pdf_path = os.path.join(current_dir, "TP-TRABAJO_DE_INVESTIGACION_MONOGRAFIA_NellyDeKeim_FINAL.pdf")
    
    try:
        doc = word.Documents.Open(docx_path)
        
        # Update TOC is disabled because it hangs in COM
        
        doc.Save()
        doc.ExportAsFixedFormat(pdf_path, 17)
        print(f"Successfully generated PDF: {pdf_path}")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        try:
            doc.Close()
        except:
            pass
        word.Quit()

if __name__ == "__main__":
    process_word_document()
