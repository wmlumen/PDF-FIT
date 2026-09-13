import os

filepath = 'Portal_TIC_Final/index.html'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

new_block = """
        <div class="mt-5 pt-3 border-top border-2 border-secondary border-opacity-25 text-center">
            <h6 class="text-secondary mb-3"><i class="bi bi-shield-lock-fill"></i> Acceso Administrativo Docente</h6>
            <a href="Materiales_HTML_Sabados/planilla.html" class="btn btn-outline-secondary shadow-sm">
                <i class="bi bi-table me-2"></i>Ver Progreso y Asistencia General
            </a>
        </div>
    </div>
</body>"""

# We look for the end of the btn-group-custom div
# </div>
# </div>
# </body>
# So replacing "    </div>\n</body>" might be tricky if line endings are different.
content = content.replace("    </div>\n</body>", new_block)
# fallback if it's \r\n
content = content.replace("    </div>\r\n</body>", new_block)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
