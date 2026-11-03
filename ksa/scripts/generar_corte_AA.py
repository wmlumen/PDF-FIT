"""
Genera plano_corte_AA.dxf - CORTE LONGITUDINAL A-A' (eje Norte-Sur, a X=6.00 m)
Plano A-02 - Escala 1:50
Recorrido del corte (segun plano de planta a X=6.00):
  calle -> estacionamiento techado -> acceso -> distribuidor -> patio de luz /
  claraboya -> bano 360 -> muro cortina -> solarium / piscina -> jardin de fondo.
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from plano_common import new_doc, Draw, Z, L

doc = new_doc()
msp = doc.modelspace()
d = Draw(msp)

Y0, Y1 = -2.0, 32.0

# ---- Linea de terreno natural / nivel calle -----------------------------
d.line((Y0, 0.0), (Y1, 0.0), "20_TERRENO_NATURAL")
d.terrain_hatch(Y0, Y1, 0.0)
d.text("NIVEL CALLE ± 0.00", 1.0, -0.35, h=0.15, layer="15_NIVELES_ARQUITECTURA", align="MIDDLE_LEFT")

# ---- Fundacion corrida (referencial) -------------------------------------
d.rect(0.0, Z["FUNDACION"], 30.0, 0.0, "13_ESTRUCTURA_CORTES")
d.text("ZAPATA CORRIDA DE HORMIGON CICLOPEO\n+ VIGA DE ENCADENADO INFERIOR", 15.0, Z["FUNDACION"] - 0.35,
       h=0.12, layer="13_ESTRUCTURA_CORTES")

# =========================================================================
# 1. ESTACIONAMIENTO TECHADO (Y 1.00 - 9.67)
# =========================================================================
d.rect(1.0, Z["VEREDA_ESTAC"], 9.67, Z["VEREDA_ESTAC"] + 0.10, "13_ESTRUCTURA_CORTES")  # contrapiso
for yc in (1.5, 4.0, 6.5, 9.2):
    d.rect(yc, Z["VEREDA_ESTAC"], yc + 0.20, Z["ESTAC_LOSA"], "01_MUROS_CARGA")  # columnas pergola
d.line((1.0, Z["ESTAC_LOSA"]), (9.67, Z["ESTAC_LOSA"]), "03_VENTANALES_CORREDIZOS")  # cubierta translucida
d.text("PERGOLA METALICA\nCUBIERTA TRANSLUCIDA", 5.3, Z["ESTAC_LOSA"] + 0.25, h=0.13,
       layer="03_VENTANALES_CORREDIZOS")
d.level_line(9.67, 11.0, Z["VEREDA_ESTAC"], "+0.15  VEREDA / ESTACIONAMIENTO")

# ---- Acceso ceremonial (espejo de agua, Y 0-10) --------------------------
d.line((0.2, 0.05), (10.0, 0.05), "06_PISCINA_SOLARIUM")
d.text("ESPEJO DE AGUA / ACCESO 45°", 4.5, 0.35, h=0.12, layer="06_PISCINA_SOLARIUM")

# =========================================================================
# 2. BLOQUE CENTRAL (Y 10.00 - 16.80) - corte pasa por distribuidor,
#    patio de luz (claraboya) y bano 360
# =========================================================================
# Muro frontal (Y=10)
d.rect(10.0, Z["NPT"], 10.2, Z["PRETIL"], "01_MUROS_CARGA")
d.level_line(10.2, 11.2, Z["NPT"], "+0.45  N.P.T. INTERIOR")

# Entrepiso / piso interior
d.line((10.2, Z["NPT"]), (16.8, Z["NPT"]), "13_ESTRUCTURA_CORTES")

# Distribuidor (Y 10.2-13.0) altura normal
d.rect(10.2, Z["LOSA"], 13.0, Z["LOSA"] + 0.12, "13_ESTRUCTURA_CORTES")
d.text("DISTRIBUIDOR", 11.6, Z["NPT"] + 1.3, h=0.14, layer="09_ROTULOS_AMBIENTES")

# Patio de luz con claraboya cenital (Y 13.0-15.5)
d.rect(13.0, Z["NPT"], 13.2, Z["PRETIL"], "01_TABIQUES")
d.rect(15.3, Z["NPT"], 15.5, Z["PRETIL"], "01_TABIQUES")
d.line((13.2, Z["NPT"] + 0.2), (13.2, Z["PRETIL"]), "03_VENTANALES_CORREDIZOS")  # vidrio patio
d.line((15.3, Z["NPT"] + 0.2), (15.3, Z["PRETIL"]), "03_VENTANALES_CORREDIZOS")
d.pline([(13.0, Z["PRETIL"]), (13.3, Z["PRETIL"] + 0.35), (13.9, Z["PRETIL"] + 0.55), (14.6, Z["PRETIL"] + 0.55),
         (15.2, Z["PRETIL"] + 0.35), (15.5, Z["PRETIL"])], "07_VEGETACION_PAISAJE")  # copa de arbol
d.line((13.9, Z["NPT"]), (13.9, Z["PRETIL"] + 0.15), "07_VEGETACION_PAISAJE")  # tronco
d.dashed_rect(13.0, Z["PRETIL"], 15.5, Z["PRETIL"] + 0.15, "14_LUZ_CENITAL_TRAGALUZ")  # claraboya
d.text("CLARABOYA CENITAL\nPATIO DE LUZ - ARBOL", 14.25, Z["PRETIL"] + 0.9, h=0.12, layer="14_LUZ_CENITAL_TRAGALUZ")

# Bano 360 (Y 15.5-16.8) con ducha y claraboya
d.rect(15.5, Z["NPT"], 16.8, Z["PRETIL"], "01_TABIQUES", )
d.text("BAÑO 360°", 16.15, Z["NPT"] + 1.3, h=0.13, layer="09_ROTULOS_AMBIENTES")

# Cielorraso y losa de cubierta zona normal
d.rect(10.2, Z["CIELORRASO"], 16.8, Z["CIELORRASO"] + 0.03, "13_ESTRUCTURA_CORTES")
d.rect(10.2, Z["LOSA"], 16.8, Z["LOSA"] + 0.12, "13_ESTRUCTURA_CORTES")
d.level_line(16.8, 17.8, Z["CIELORRASO"], "+3.25  CIELORRASO SUSPENDIDO")
d.level_line(16.8, 17.8, Z["LOSA"], "+3.45  LOSA / CUBIERTA")
d.level_line(16.8, 17.8, Z["PRETIL"], "+3.85  PRETIL DE CARGA")

# =========================================================================
# 3. MURO CORTINA VIDRIADO POSTERIOR (Y=16.80)
# =========================================================================
d.line((16.8, Z["NPT"]), (16.8, Z["PRETIL"]), "03_VENTANALES_CORREDIZOS")
d.line((16.85, Z["NPT"]), (16.85, Z["PRETIL"]), "03_VENTANALES_CORREDIZOS")
d.text("MURO CORTINA\nVIDRIADO", 17.6, 2.0, h=0.12, layer="03_VENTANALES_CORREDIZOS", rotation=90)

# =========================================================================
# 4. GALERIA / SOLARIUM / PISCINA (Y 16.80 - 23.66)
# =========================================================================
d.line((16.8, Z["SOLARIUM"]), (18.0, Z["SOLARIUM"]), "06_PISCINA_SOLARIUM")
d.level_line(18.0, 19.0, Z["SOLARIUM"], "+0.35  SOLARIUM")

# Vaso de piscina (seccion)
px0, px1 = 18.0, 23.66
d.pline([(px0, Z["SOLARIUM"]), (px0, Z["AGUA_PISCINA"]), (px0 + 0.4, Z["FONDO_PISCINA"]),
         (px1 - 0.4, Z["FONDO_PISCINA"]), (px1, Z["AGUA_PISCINA"]), (px1, Z["SOLARIUM"])],
        "06_PISCINA_SOLARIUM")
d.line((px0, Z["AGUA_PISCINA"]), (px1, Z["AGUA_PISCINA"]), "06_PISCINA_SOLARIUM")
d.level_line(px1, px1 + 1.0, Z["AGUA_PISCINA"], "+0.25  PELO DE AGUA")
d.level_line(px1, px1 + 1.0, Z["FONDO_PISCINA"], "-1.25  FONDO PISCINA")
d.text("PISCINA (CORTE)\nPROF. UTIL 1.50 m", 20.8, Z["FONDO_PISCINA"] - 0.5, h=0.13, layer="06_PISCINA_SOLARIUM")

# =========================================================================
# 5. SOLARIUM / JARDIN DE FONDO (Y 23.66 - 30.00)
# =========================================================================
d.line((23.66, Z["SOLARIUM"]), (30.0, Z["SOLARIUM"]), "06_PISCINA_SOLARIUM")
for ty in (25.5, 27.0, 28.5):
    d.pline([(ty, Z["SOLARIUM"]), (ty + 0.25, Z["SOLARIUM"] + 1.6), (ty + 0.5, Z["SOLARIUM"])],
            "07_VEGETACION_PAISAJE")
    d.line((ty + 0.25, Z["SOLARIUM"]), (ty + 0.25, Z["SOLARIUM"] + 1.4), "07_VEGETACION_PAISAJE")
d.rect(29.8, Z["SOLARIUM"], 30.0, Z["SOLARIUM"] + 1.9, "01_MUROS_CARGA")  # muro de fondo
d.level_line(23.66, 24.66, Z["SOLARIUM"], "+0.35  JARDIN / SOLARIUM")

# =========================================================================
# 6. REGLA GENERAL DE NIVELES (margen izquierdo)
# =========================================================================
ref_x = -1.6
niveles_orden = [
    (Z["LOSA_ALTA"] + 0.0, "SALA (REF. ADYAC.) +6.05"),
    (Z["PRETIL"], "+3.85  PRETIL DE CARGA"),
    (Z["LOSA"], "+3.45  LOSA / CUBIERTA"),
    (Z["CIELORRASO"], "+3.25  CIELORRASO SUSPENDIDO"),
    (Z["NPT"], "+0.45  N.P.T. INTERIOR"),
    (Z["VEREDA_ESTAC"], "+0.15  VEREDA / ESTAC."),
    (Z["CALLE"], "±0.00  NIVEL CALLE"),
    (Z["AGUA_PISCINA"], "+0.25  PELO DE AGUA"),
    (Z["FONDO_PISCINA"], "-1.25  FONDO PISCINA"),
    (Z["FUNDACION"], "-0.60  FUNDACION"),
]
for zz, label in niveles_orden:
    d.line((ref_x, zz), (ref_x + 0.3, zz), "15_NIVELES_ARQUITECTURA")
    d.text(label, ref_x - 0.15, zz, h=0.12, layer="15_NIVELES_ARQUITECTURA", align="MIDDLE_RIGHT")

# =========================================================================
# 7. COTAS VERTICALES GENERALES
# =========================================================================
d.dim_v(Z["CALLE"], Z["NPT"], 31.2, offset=0.5)
d.dim_v(Z["NPT"], Z["PRETIL"], 31.2, offset=0.5)
d.dim_v(Z["CALLE"], Z["PRETIL"], 32.3, offset=0.5)

# =========================================================================
# 8. CAJETIN
# =========================================================================
d.title_block(21.0, -6.5, "PLANO A-02  -  CORTE LONGITUDINAL A-A'",
              "Eje Norte-Sur, a X = 6.00 m",
              "Escala 1:50",
              "Pasa por: estacionamiento, acceso, distribuidor, patio de luz,\nbano 360, muro cortina, piscina y jardin de fondo.",
              "plano_corte_AA.dxf")

doc.saveas(r"C:\Users\HP 250 G10\Documents\GITHUT\ksa\plano_corte_AA.dxf")
print("Corte A-A' generado correctamente.")
