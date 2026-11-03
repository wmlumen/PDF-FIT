"""
Genera plano_fachadas.dxf - FACHADAS NORTE / SUR / ESTE / OESTE
Plano A-04 - Escala 1:100
Cuatro elevaciones ortogonales dispuestas en una misma lamina.
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from plano_common import new_doc, Draw, Z, L

doc = new_doc()
msp = doc.modelspace()
d = Draw(msp)


def ground(ox, w):
    d.line((ox, 0.0), (ox + w, 0.0), "20_TERRENO_NATURAL")
    d.terrain_hatch(ox, ox + w, 0.0)


def niveles_lado(ox, w, levels):
    for zz, label in levels:
        d.line((ox - 0.3, zz), (ox + w + 0.3, zz), "15_NIVELES_ARQUITECTURA")
        d.text(label, ox - 0.5, zz, h=0.12, layer="15_NIVELES_ARQUITECTURA", align="MIDDLE_RIGHT")


# =========================================================================
# FACHADA NORTE (frente, mira hacia la calle) - ancho 12.00 m
# =========================================================================
OX = 0.0
ground(OX, 12.0)
d.rect(OX, Z["NPT"], OX + 12.0, Z["PRETIL"], "01_MUROS_CARGA")  # paramento frontal
# estacionamiento techado en primer plano (dashed, estructura mas baja y set-back)
d.dashed_rect(OX + 6.0, Z["VEREDA_ESTAC"], OX + 12.0, Z["ESTAC_LOSA"], "01_TABIQUES")
d.text("PERGOLA\nESTACIONAMIENTO", OX + 9.0, Z["ESTAC_LOSA"] + 0.3, h=0.12, layer="01_TABIQUES")
# puerta pivotante
d.rect(OX + 4.2, Z["NPT"], OX + 5.6, Z["NPT"] + 2.80, "02_PUERTA_PIVOTANTE")
d.line((OX + 4.9, Z["NPT"]), (OX + 4.9, Z["NPT"] + 2.80), "02_PUERTA_PIVOTANTE")
d.text("PUERTA PIVOTANTE\n1.40 x 2.80", OX + 4.9, Z["NPT"] - 0.35, h=0.1, layer="02_PUERTA_PIVOTANTE")
# ventana / window seat
d.rect(OX + 8.5, Z["NPT"] + 0.1, OX + 10.4, Z["NPT"] + 1.5, "04_WINDOW_SEAT")
d.text("WINDOW SEAT", OX + 9.45, Z["NPT"] + 1.75, h=0.1, layer="04_WINDOW_SEAT")
# muro de piedra en acceso
d.rect(OX + 0.2, Z["NPT"], OX + 2.0, Z["NPT"] + 2.2, "01_MUROS_PIEDRA")
d.text("MURO DE PIEDRA\nNATURAL SECA", OX + 1.1, Z["NPT"] + 2.5, h=0.1, layer="01_MUROS_PIEDRA")
d.text("FACHADA NORTE (FRENTE)", OX + 6.0, -1.0, h=0.25, layer="11_CARATULA_TECNICA")
niveles_lado(OX, 12.0, [(Z["NPT"], "+0.45"), (Z["PRETIL"], "+3.85"), (Z["CALLE"], "±0.00")])
d.dim_h(OX, OX + 12.0, -1.6, -0.3)

# =========================================================================
# FACHADA SUR (posterior, mira hacia piscina/jardin) - ancho 12.00 m
# =========================================================================
OX = 16.0
ground(OX, 12.0)
# cocina (izq) y bano/dormitorio (der): altura normal
d.rect(OX + 0.2, Z["NPT"], OX + 3.0, Z["PRETIL"], "01_MUROS_CARGA")
d.rect(OX + 8.2, Z["NPT"], OX + 11.8, Z["PRETIL"], "01_MUROS_CARGA")
# sala: muro cortina vidriado doble altura
d.rect(OX + 3.0, Z["NPT"], OX + 8.2, Z["PRETIL_ALTO"], "01_MUROS_CARGA")
d.line((OX + 3.2, Z["NPT"] + 0.1), (OX + 3.2, Z["PRETIL_ALTO"] - 0.1), "03_VENTANALES_CORREDIZOS")
for vx in range(0, 10):
    xx = OX + 3.3 + vx * 0.47
    if xx < OX + 8.0:
        d.line((xx, Z["NPT"] + 0.1), (xx, Z["PRETIL_ALTO"] - 0.1), "03_VENTANALES_CORREDIZOS")
d.text("MURO CORTINA VIDRIADO\nDOBLE ALTURA H=5.80 m", OX + 5.6, Z["PRETIL_ALTO"] + 0.3, h=0.12,
       layer="03_VENTANALES_CORREDIZOS")
# chimenea escultorica
d.rect(OX + 3.4, Z["NPT"], OX + 4.4, Z["LOSA_ALTA"], "19_CHIMENEA_ESCULTORICA")
d.text("CHIMENEA\nESCULTORICA", OX + 3.9, Z["LOSA_ALTA"] + 0.3, h=0.1, layer="19_CHIMENEA_ESCULTORICA")
# quincho (primer plano, mas bajo)
d.dashed_rect(OX + 0.2, Z["QUINCHO_NPT"], OX + 4.5, Z["QUINCHO_PRETIL"], "01_TABIQUES")
d.text("QUINCHO\nSEMICUBIERTO", OX + 2.3, Z["QUINCHO_PRETIL"] + 0.3, h=0.1, layer="01_TABIQUES")
# coping piscina
d.line((OX + 4.8, Z["SOLARIUM"]), (OX + 11.8, Z["SOLARIUM"]), "06_PISCINA_SOLARIUM")
d.text("PISCINA / SOLARIUM", OX + 8.3, Z["SOLARIUM"] + 0.2, h=0.1, layer="06_PISCINA_SOLARIUM")
d.text("FACHADA SUR (POSTERIOR)", OX + 6.0, -1.0, h=0.25, layer="11_CARATULA_TECNICA")
niveles_lado(OX, 12.0, [(Z["NPT"], "+0.45"), (Z["PRETIL"], "+3.85"), (Z["LOSA_ALTA"], "+6.05"),
                        (Z["PRETIL_ALTO"], "+6.65")])
d.dim_h(OX, OX + 12.0, -1.6, -0.3)

# =========================================================================
# FACHADA ESTE (lateral derecha / medianera) - ancho 30.00 m (eje Y)
# =========================================================================
OX = 34.0
ground(OX, 30.0)
d.rect(OX + 1.0, Z["VEREDA_ESTAC"], OX + 9.67, Z["ESTAC_LOSA"], "01_MUROS_CARGA")      # estacionamiento
d.rect(OX + 10.0, Z["NPT"], OX + 16.8, Z["PRETIL"], "01_MUROS_CARGA")                  # bloque central (bajo)
d.dashed_rect(OX + 10.0, Z["PRETIL"], OX + 16.8, Z["PRETIL_ALTO"], "18_DOBLE_ALTURA_VACIO")  # proy. sala detras
d.text("PROYECCION SALA\nDOBLE ALTURA (DETRAS)", OX + 13.4, Z["PRETIL_ALTO"] + 0.3, h=0.1,
       layer="18_DOBLE_ALTURA_VACIO")
d.rect(OX + 16.8, Z["QUINCHO_NPT"], OX + 24.1, Z["QUINCHO_PRETIL"], "01_TABIQUES")      # quincho/galeria
d.line((OX + 24.1, Z["SOLARIUM"]), (OX + 30.0, Z["SOLARIUM"]), "06_PISCINA_SOLARIUM")  # solarium/piscina
d.text("FACHADA ESTE (MEDIANERA)", OX + 15.0, -1.0, h=0.25, layer="11_CARATULA_TECNICA")
niveles_lado(OX, 30.0, [(Z["NPT"], "+0.45"), (Z["PRETIL"], "+3.85"), (Z["ESTAC_LOSA"], "+2.75")])
d.dim_h(OX, OX + 30.0, -1.6, -0.3)

# =========================================================================
# FACHADA OESTE (lateral izquierda / medianera) - ancho 30.00 m (eje Y)
# =========================================================================
OX = 70.0
ground(OX, 30.0)
d.rect(OX + 1.0, Z["VEREDA_ESTAC"], OX + 9.67, Z["ESTAC_LOSA"], "01_MUROS_CARGA")
d.rect(OX + 10.0, Z["NPT"], OX + 16.8, Z["PRETIL"], "01_MUROS_CARGA")
d.dashed_rect(OX + 10.0, Z["PRETIL"], OX + 16.8, Z["PRETIL_ALTO"], "18_DOBLE_ALTURA_VACIO")
d.text("PROYECCION SALA\nDOBLE ALTURA (DETRAS)", OX + 13.4, Z["PRETIL_ALTO"] + 0.3, h=0.1,
       layer="18_DOBLE_ALTURA_VACIO")
d.rect(OX + 16.8, Z["QUINCHO_NPT"], OX + 24.1, Z["QUINCHO_PRETIL"], "01_TABIQUES")
d.line((OX + 24.1, Z["SOLARIUM"]), (OX + 30.0, Z["SOLARIUM"]), "06_PISCINA_SOLARIUM")
d.text("FACHADA OESTE (MEDIANERA)", OX + 15.0, -1.0, h=0.25, layer="11_CARATULA_TECNICA")
niveles_lado(OX, 30.0, [(Z["NPT"], "+0.45"), (Z["PRETIL"], "+3.85"), (Z["ESTAC_LOSA"], "+2.75")])
d.dim_h(OX, OX + 30.0, -1.6, -0.3)

# =========================================================================
# CAJETIN
# =========================================================================
d.title_block(34.0, -6.5, "PLANO A-04  -  FACHADAS NORTE / SUR / ESTE / OESTE",
              "Elevaciones ortogonales",
              "Escala 1:100",
              "Norte: frente a calle. Sur: posterior (piscina).\nEste / Oeste: medianeras.",
              "plano_fachadas.dxf")

doc.saveas(r"C:\Users\HP 250 G10\Documents\GITHUT\ksa\plano_fachadas.dxf")
print("Fachadas generadas correctamente.")
