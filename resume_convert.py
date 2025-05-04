from docx import Document
from pathlib import Path

source_dir = Path("sources/resumedox")
output_dir = Path("sources/resumetxt")
output_dir.mkdir(parents=True, exist_ok=True)

for docx_file in source_dir.glob("*.docx"):
    try:
        doc = Document(docx_file)
        text = "\n".join(paragraph.text for paragraph in doc.paragraphs if paragraph.text.strip())
        output_path = output_dir / (docx_file.stem + ".txt")
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(text)
        print(f"Converted: {docx_file.name} → {output_path.name}")
    except Exception as e:
        print(f"Failed to convert {docx_file.name}: {e}")
