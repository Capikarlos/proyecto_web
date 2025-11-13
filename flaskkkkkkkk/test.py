from weasyprint import HTML

HTML(string="<h1>Hola Flask</h1><p>PDF generado correctamente.</p>").write_pdf("test.pdf")
print("✅ PDF generado correctamente.")
