"""
Genera plano_corte_BB.dxf - CORTE TRANSVERSAL B-B' (eje Este-Oeste, a Y=14.80 m)
Plano A-03 - Escala 1:50
Recorrido del corte (X: 0.00 a 12.00 m):
  medianera izquierda -> cocina In&Out -> sala de estar (doble altura) ->
  patio de luz / bano 360 -> dormitorio + home office -> medianera derecha.
"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from plano_common import new_doc, Draw, Z, L

doc = new_doc()
msp = doc.modelspace()
d = Draw(msp)

X0, X1 = -2.0, 14.0

# ---- Terreno / piso exterior referencial ---------------------------------
d.line((X0, Z["NPT"] - 0.3), (X1, Z["NPT"] - 0.3), "20_TERRENO_NATURAL")

# ---- Fundacion corrida ----------------------------------------------------
d.rect(0.0, Z["FUNDACION"], 12.0, Z["NPT"] - 0.3, "13_ESTRUCTURA_CORTES")
d.text("VIGA DE ENCADENADO INFERIOR + ZAPATA CORRIDA", 6.0, Z["FUNDACION"] - 0.3, h=0.12,
       layer="13_ESTRUCTURA_CORTES")

# ---- Piso interior (contrapiso + NPT) -------------------------------------
d.line((0.0, Z["NPT"]), (12.0, Z["NPT"]), "13_ESTRUCTURA_CORTES")
d.level_line(-0.9, -0.2, Z["NPT"], "+0.45", side="left")

# =========================================================================
# MEDIANERAS (X=0.00 y X=12.00, e=0.20 m)
# =========================================================================
d.rect(0.0, Z["NPT"], 0.20, Z["PRETIL"], "01_MUROS_CARGA")
d.rect(11.80, Z["NPT"], 12.00, Z["PRETIL"], "01_MUROS_CARGA")
d.text("MEDIANERA\nIZQUIERDA", -1.3, Z["NPT"] + 1.6, h=0.12, layer="01_MUROS_CARGA")
d.text("MEDIANERA\nDERECHA", 13.2, Z["NPT"] + 1.6, h=0.12, layer="01_MUROS_CARGA")

# =========================================================================
# COCINA IN&OUT (X 0.20 - 3.00) - altura normal
# =========================================================================
d.rect(3.00, Z["NPT"], 3.15, Z["PRETIL"], "01_TABIQUES")  # tabique cocina/sala
d.rect(0.8, Z["NPT"], 2.2, Z["NPT"] + 0.9, "05_SANITARIOS_COCINA")  # mesada / bajo mesada
d.text("COCINA\nIN & OUT", 1.6, Z["NPT"] + 1.8, h=0.14, layer="09_ROTULOS_AMBIENTES")
d.rect(0.20, Z["CIELORRASO"], 3.00, Z["CIELORRASO"] + 0.03, "13_ESTRUCTURA_CORTES")
d.rect(0.20, Z["LOSA"], 3.00, Z["LOSA"] + 0.12, "13_ESTRUCTURA_CORTES")

# =========================================================================
# SALA DE ESTAR - DOBLE ALTURA (X 3.15 - 5.80)  H = 5.80 m libre
# =========================================================================
d.rect(5.80, Z["NPT"], 5.95, Z["PRETIL_ALTO"], "01_TABIQUES")  # tabique sala/patio luz
d.dashed_rect(3.15, Z["NPT"], 5.80, Z["LOSA_ALTA"], "18_DOBLE_ALTURA_VACIO")
d.rect(3.4, Z["NPT"], 5.6, Z["NPT"] + 0.9, "04_MOBILIARIO_INTERIOR")  # sofa (silueta)
d.text("SALA DE ESTAR\nDOBLE ALTURA  H=5.80 m", 4.5, Z["NPT"] + 3.0, h=0.15, layer="09_ROTULOS_AMBIENTES")
d.rect(3.15, Z["LOSA_ALTA"], 5.95, Z["LOSA_ALTA"] + 0.14, "13_ESTRUCTURA_CORTES")
d.level_line(5.95, 7.0, Z["LOSA_ALTA"], "+6.05  LOSA ALTA SALA")
d.level_line(5.95, 7.0, Z["PRETIL_ALTO"], "+6.65  PRETIL ALTO")
# luminarias suspendidas (referencial)
for lx in (3.9, 4.6, 5.3):
    d.line((lx, Z["LOSA_ALTA"]), (lx, Z["NPT"] + 2.80), "04_MOBILIARIO_INTERIOR")

# =========================================================================
# PATIO DE LUZ / BAÑO 360 (X 5.95 - 8.20) - altura normal
# =========================================================================
d.rect(8.20, Z["NPT"], 8.35, Z["PRETIL"], "01_TABIQUES")  # tabique bano/dormitorio
d.pline([(6.3, Z["PRETIL"]), (6.6, Z["PRETIL"] + 0.3), (7.1, Z["PRETIL"] + 0.45), (7.6, Z["PRETIL"] + 0.3),
         (7.8, Z["PRETIL"])], "07_VEGETACION_PAISAJE")  # copa del arbol del patio de luz (si cae en el eje)
d.rect(6.8, Z["NPT"], 7.6, Z["NPT"] + 1.9, "05_SANITARIOS_COCINA")  # box de ducha / vanitory
d.dashed_rect(6.6, Z["PRETIL"], 7.9, Z["PRETIL"] + 0.15, "14_LUZ_CENITAL_TRAGALUZ")
d.text("PATIO DE LUZ / BAÑO 360°\nCLARABOYA", 7.1, Z["NPT"] + 2.6, h=0.12, layer="09_ROTULOS_AMBIENTES")
d.rect(5.95, Z["CIELORRASO"], 8.20, Z["CIELORRASO"] + 0.03, "13_ESTRUCTURA_CORTES")
d.rect(5.95, Z["LOSA"], 8.20, Z["LOSA"] + 0.12, "13_ESTRUCTURA_CORTES")

# =========================================================================
# DORMITORIO PRINCIPAL + HOME OFFICE (X 8.35 - 11.80) - altura normal
# =========================================================================
d.rect(9.3, Z["NPT"], 11.1, Z["NPT"] + 0.55, "04_MOBILIARIO_INTERIOR")  # cama (silueta)
d.rect(10.6, Z["NPT"], 11.6, Z["NPT"] + 0.75, "04_HOME_OFFICE")  # escritorio / biblioteca
d.dashed_rect(10.4, Z["PRETIL"], 11.8, Z["PRETIL"] + 0.15, "14_LUZ_CENITAL_TRAGALUZ")
d.text("DORMITORIO PPAL. / HOME OFFICE", 10.0, Z["NPT"] + 1.8, h=0.13, layer="09_ROTULOS_AMBIENTES")
d.rect(8.35, Z["CIELORRASO"], 11.80, Z["CIELORRASO"] + 0.03, "13_ESTRUCTURA_CORTES")
d.rect(8.35, Z["LOSA"], 11.80, Z["LOSA"] + 0.12, "13_ESTRUCTURA_CORTES")

d.level_line(-0.9, -0.2, Z["CIELORRASO"], "+3.25", side="left")
d.level_line(-0.9, -0.2, Z["LOSA"], "+3.45", side="left")
d.level_line(-0.9, -0.2, Z["PRETIL"], "+3.85", side="left")

# =========================================================================
# COTAS HORIZONTALES (ISO 129, tres lineas)
# =========================================================================
y0 = Z["NPT"] - 1.0
d.dim_h(0.00, 3.00, y0, -0.45)
d.dim_h(3.00, 5.80, y0, -0.45)
d.dim_h(5.80, 8.20, y0, -0.45)
d.dim_h(8.20, 12.00, y0, -0.45)
d.dim_h(0.00, 12.00, y0 - 0.9, -0.45)

# =========================================================================
# CAJETIN
# =========================================================================
d.title_block(2.0, -5.5, "PLANO A-03  -  CORTE TRANSVERSAL B-B'",
              "Eje Este-Oeste, a Y = 14.80 m",
              "Escala 1:50",
              "Pasa por: cocina, sala (doble altura H=5.80 m), patio de luz,\nbano 360 y dormitorio principal + home office.",
              "plano_corte_BB.dxf")

doc.saveas(r"C:\Users\HP 250 G10\Documents\GITHUT\ksa\plano_corte_BB.dxf")
print("Corte B-B' generado correctamente.")
