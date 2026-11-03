"""
Genera plano_casa_12x30_completo.dxf
Residencia unifamiliar 12.00 x 30.00 m - Planta Arquitectonica (Plano A-01)
Basado en MEMORIA_DESCRIPTIVA_ARQUITECTURA.md
Capas, colores y espesores segun seccion 10 (Matriz Tecnica de Capas y Entidades CAD).
"""
import ezdxf
from ezdxf.enums import TextEntityAlignment

doc = ezdxf.new("R2018", setup=True)
doc.units = ezdxf.units.M
msp = doc.modelspace()

# ---------------------------------------------------------------- CAPAS ----
LAYERS = {
    "00_LINDEROS_TERRENO":        dict(color=7,   lw=35),
    "01_MUROS_CARGA":             dict(color=7,   lw=50),
    "01_MUROS_PIEDRA":            dict(color=253, lw=50),
    "01_TABIQUES":                dict(color=8,   lw=25),
    "02_PUERTAS":                 dict(color=1,   lw=20),
    "02_PUERTA_PIVOTANTE":        dict(color=30,  lw=35),
    "03_VENTANALES_CORREDIZOS":   dict(color=4,   lw=25),
    "04_MOBILIARIO_INTERIOR":     dict(color=2,   lw=18),
    "04_HOME_OFFICE":             dict(color=210, lw=25),
    "04_WINDOW_SEAT":             dict(color=32,  lw=30),
    "05_SANITARIOS_COCINA":       dict(color=3,   lw=25),
    "06_PISCINA_SOLARIUM":        dict(color=140, lw=30),
    "07_VEGETACION_PAISAJE":      dict(color=60,  lw=18),
    "08_COTAS_ARQUITECTURA":      dict(color=1,   lw=15),
    "09_ROTULOS_AMBIENTES":       dict(color=7,   lw=25),
    "10_CIRCULACION_ESCALERAS":   dict(color=8,   lw=20),
    "11_CARATULA_TECNICA":        dict(color=7,   lw=35),
    "12_LINEAS_DE_CORTE":         dict(color=1,   lw=35, linetype="DASHDOT"),
    "13_ESTRUCTURA_CORTES":       dict(color=7,   lw=50),
    "14_LUZ_CENITAL_TRAGALUZ":    dict(color=130, lw=20, linetype="DASHED"),
    "15_NIVELES_ARQUITECTURA":    dict(color=4,   lw=18),
    "16_FOGON_FIRE_PIT":          dict(color=20,  lw=30),
    "17_CASCADA_LAMINAR":         dict(color=150, lw=30),
    "18_DOBLE_ALTURA_VACIO":      dict(color=6,   lw=35, linetype="DASHED"),
    "19_CHIMENEA_ESCULTORICA":    dict(color=12,  lw=40),
}

for name, props in LAYERS.items():
    lt = props.get("linetype", "CONTINUOUS")
    if lt not in doc.linetypes:
        pass  # DASHED/DASHDOT already in ezdxf setup=True
    layer = doc.layers.add(name=name, color=props["color"])
    layer.dxf.lineweight = props["lw"]
    try:
        layer.dxf.linetype = lt
    except Exception:
        pass

def L(name):
    return {"layer": name}

# ----------------------------------------------------------- HELPERS -------

def wall(points, layer="01_MUROS_CARGA", width=0.20, closed=False):
    pl = msp.add_lwpolyline(points, dxfattribs=L(layer))
    pl.dxf.const_width = width
    pl.closed = closed
    return pl

def rect(x0, y0, x1, y1, layer, closed=True):
    pts = [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
    pl = msp.add_lwpolyline(pts, dxfattribs=L(layer))
    pl.closed = closed
    return pl

def dashed_rect(x0, y0, x1, y1, layer):
    pts = [(x0, y0), (x1, y0), (x1, y1), (x0, y1), (x0, y0)]
    pl = msp.add_lwpolyline(pts, dxfattribs=L(layer))
    pl.closed = True
    return pl

def text(s, x, y, h=0.22, layer="09_ROTULOS_AMBIENTES", align="MIDDLE_CENTER", rotation=0):
    t = msp.add_text(s, dxfattribs={"layer": layer, "height": h, "rotation": rotation})
    t.set_placement((x, y), align=getattr(TextEntityAlignment, align))
    return t

def room_label(name, area, x_center, y_center, npt=None):
    text(name, x_center, y_center + 0.18, h=0.24, layer="09_ROTULOS_AMBIENTES")
    sub = f"{area:.2f} m²" + (f"   N.P.T. {npt}" if npt else "")
    text(sub, x_center, y_center - 0.14, h=0.16, layer="09_ROTULOS_AMBIENTES")

def door_block(x, y, w, hinge="right", swing="up", layer="02_PUERTAS"):
    """Puerta batiente simple: marco + arco de barrido de 90°."""
    import math
    if hinge == "right":
        hx, hy = x + w, y
        start_angle, end_angle = (90, 180) if swing == "up" else (180, 270)
    else:
        hx, hy = x, y
        start_angle, end_angle = (0, 90) if swing == "up" else (270, 360)
    msp.add_line((x, y), (x + w, y), dxfattribs=L(layer))
    if hinge == "right":
        leaf_end = (hx - w * math.cos(math.radians(0)), hy + w) if swing == "up" else (hx, hy - w)
        msp.add_line((hx, hy), (hx, hy + w) if swing == "up" else (hx, hy - w), dxfattribs=L(layer))
    else:
        msp.add_line((hx, hy), (hx, hy + w) if swing == "up" else (hx, hy - w), dxfattribs=L(layer))
    center = (hx, hy)
    msp.add_arc(center=center, radius=w, start_angle=start_angle, end_angle=end_angle, dxfattribs=L(layer))

def pivot_door_block(x, y, w=1.40, layer="02_PUERTA_PIVOTANTE"):
    """Puerta pivotante excentrica (eje a 0.25 m del marco)."""
    import math
    msp.add_line((x, y), (x + w, y), dxfattribs=L(layer))
    pivot_x = x + 0.25
    msp.add_line((pivot_x, y), (pivot_x, y + w - 0.25), dxfattribs=L(layer))
    msp.add_arc(center=(pivot_x, y), radius=w - 0.25, start_angle=90, end_angle=180, dxfattribs=L(layer))

def window_block(x0, y0, x1, y1, layer="03_VENTANALES_CORREDIZOS"):
    """Ventana de dos lineas paralelas sobre el eje de muro (horizontal u vertical)."""
    if abs(x1 - x0) >= abs(y1 - y0):
        msp.add_line((x0, y0 - 0.05), (x1, y1 - 0.05), dxfattribs=L(layer))
        msp.add_line((x0, y0 + 0.05), (x1, y1 + 0.05), dxfattribs=L(layer))
    else:
        msp.add_line((x0 - 0.05, y0), (x1 - 0.05, y1), dxfattribs=L(layer))
        msp.add_line((x0 + 0.05, y0), (x1 + 0.05, y1), dxfattribs=L(layer))

def dim_h(x0, x1, y, offset, text_override=None):
    dim = msp.add_linear_dim(
        base=(x0, y + offset), p1=(x0, y), p2=(x1, y),
        dxfattribs=L("08_COTAS_ARQUITECTURA"), override={"dimtxt": 0.14},
    )
    dim.render()
    return dim

def dim_v(y0, y1, x, offset, text_override=None):
    dim = msp.add_linear_dim(
        base=(x + offset, y0), p1=(x, y0), p2=(x, y1), angle=90,
        dxfattribs=L("08_COTAS_ARQUITECTURA"), override={"dimtxt": 0.14},
    )
    dim.render()
    return dim

def tree(x, y, r=0.55, layer="07_VEGETACION_PAISAJE"):
    msp.add_circle((x, y), r, dxfattribs=L(layer))
    msp.add_circle((x, y), r * 0.55, dxfattribs=L(layer))
    msp.add_line((x, y - r), (x, y + r), dxfattribs=L(layer))

def npt_symbol(x, y, value, layer="15_NIVELES_ARQUITECTURA"):
    msp.add_line((x - 0.18, y), (x + 0.18, y), dxfattribs=L(layer))
    msp.add_line((x - 0.18, y), (x, y + 0.18), dxfattribs=L(layer))
    msp.add_line((x + 0.18, y), (x, y + 0.18), dxfattribs=L(layer))
    text(f"N.P.T. {value}", x + 0.35, y, h=0.13, layer=layer, align="MIDDLE_LEFT")

# =========================================================================
# 0. LINDEROS DEL TERRENO (12.00 x 30.00 m)
# =========================================================================
rect(0, 0, 12.00, 30.00, "00_LINDEROS_TERRENO")
text("LINEA MUNICIPAL / CALLE", 6.00, -0.35, h=0.18, layer="00_LINDEROS_TERRENO")

# Norte (flecha simple arriba a la izquierda del cajetin, ver seccion cajetin)

# =========================================================================
# 1. MEDIANERAS (muros perimetrales izq/der, e=0.20) y MUROS DE FONDO/FRENTE
# =========================================================================
wall([(0.00, 0.00), (0.00, 30.00)], "01_MUROS_CARGA", 0.20)
wall([(12.00, 0.00), (12.00, 30.00)], "01_MUROS_CARGA", 0.20)
wall([(0.00, 30.00), (12.00, 30.00)], "01_MUROS_CARGA", 0.20)

# =========================================================================
# 2. FRANJA FRONTAL  Y: 0.00 - 10.00  (Acceso ceremonial + Estacionamiento)
# =========================================================================
# -- Estacionamiento techado doble (52.00 m2) ----------------------------
rect(6.00, 1.00, 12.00, 9.67, "01_TABIQUES")
room_label("ESTACIONAMIENTO\nTECHADO (2 AUTOS)", 52.00, 9.00, 5.30, npt="+0.15")
text("ESTACIONAMIENTO TECHADO (2 AUTOS)", 9.00, 5.55, h=0.22, layer="09_ROTULOS_AMBIENTES")
text("52.00 m²   N.P.T. +0.15", 9.00, 5.05, h=0.16, layer="09_ROTULOS_AMBIENTES")
# pergola (linea discontinua de proyeccion)
dashed_rect(6.30, 1.30, 11.70, 9.37, "01_TABIQUES")

# -- Acceso ceremonial a 45 grados + espejo de agua (46.50 m2) ----------
dashed_rect(0.80, 1.00, 5.20, 9.20, "06_PISCINA_SOLARIUM")
text("ESPEJO DE AGUA", 3.00, 7.60, h=0.16, layer="09_ROTULOS_AMBIENTES")
# huellas flotantes (pasarela diagonal 45°)
pasos = [(1.30, 1.50), (2.10, 2.60), (2.90, 3.70), (3.55, 4.95), (3.90, 6.30),
         (4.10, 7.65), (4.20, 9.00)]
for (px, py) in pasos:
    rect(px - 0.35, py - 0.25, px + 0.35, py + 0.25, "10_CIRCULACION_ESCALERAS")
text("ACCESO CEREMONIAL 45°\nESPEJO DE AGUA 46.50 m²", 3.00, 2.10, h=0.16, layer="09_ROTULOS_AMBIENTES")
for (tx, ty) in [(0.40, 8.50), (1.10, 1.30), (5.00, 1.30)]:
    tree(tx, ty, 0.30)

msp.add_lwpolyline([(4.00, -0.60), (4.00, -0.20), (4.40, -0.20)], dxfattribs=L("00_LINDEROS_TERRENO"))
text("ACCESO", 4.20, -0.85, h=0.18, layer="11_CARATULA_TECNICA")

# =========================================================================
# 3. FRANJA CENTRAL  Y: 10.00 - 16.80  (Bloque edificado, prof. 6.80 m)
# =========================================================================
# -- Muro frontal del bloque con puerta pivotante y window seat ---------
wall([(0.20, 10.00), (4.20, 10.00)], "01_MUROS_CARGA", 0.20)
pivot_door_block(4.20, 10.00, 1.40)
wall([(5.60, 10.00), (8.50, 10.00)], "01_MUROS_CARGA", 0.20)
window_block(8.50, 10.00, 10.40, 10.00)
wall([(10.40, 10.00), (11.80, 10.00)], "01_MUROS_CARGA", 0.20)

# -- Tabiques internos divisorios de zonas (X) ---------------------------
wall([(3.00, 10.00), (3.00, 16.80)], "01_TABIQUES", 0.15)      # cocina/sala
wall([(5.80, 13.00), (5.80, 16.80)], "01_TABIQUES", 0.15)      # sala/bano
wall([(7.20, 13.00), (7.20, 16.80)], "01_TABIQUES", 0.15)      # patio luz/bano
wall([(8.20, 10.00), (8.20, 16.80)], "01_TABIQUES", 0.15)      # bano/dormitorio

# -- Muro cortina vidriado posterior en doble altura (Y=16.80) ----------
window_block(0.20, 16.80, 11.80, 16.80, "03_VENTANALES_CORREDIZOS")
text("MURO CORTINA VIDRIADO - DOBLE ALTURA H=5.80 m", 6.00, 17.10, h=0.14, layer="03_VENTANALES_CORREDIZOS")

# -- Cocina (In&Out) 8.90 m2 ---------------------------------------------
dashed_rect(0.20, 13.50, 3.00, 16.80, "01_TABIQUES")
room_label("COCINA (IN & OUT)", 8.90, 1.60, 15.15, npt="+0.45")
# mesada pasante
msp.add_line((0.40, 16.50), (2.80, 16.50), dxfattribs=L("05_SANITARIOS_COCINA"))
msp.add_line((0.90, 13.80), (0.90, 15.90), dxfattribs=L("05_SANITARIOS_COCINA"))  # anafe/bacha ref
text("MESADA PASANTE / PASAPLATOS", 1.60, 16.62, h=0.11, layer="05_SANITARIOS_COCINA")
# apertura guillotina en muro cortina frente a cocina
msp.add_line((0.20, 16.80), (3.00, 16.80), dxfattribs=L("03_VENTANALES_CORREDIZOS"))

# -- Comedor Diario 13.80 m2 ----------------------------------------------
dashed_rect(0.20, 10.00, 3.00, 13.50, "04_MOBILIARIO_INTERIOR")
room_label("COMEDOR DIARIO", 13.80, 1.60, 11.75, npt="+0.45")
rect(1.00, 11.00, 2.30, 12.80, "04_MOBILIARIO_INTERIOR")  # mesa
for mx in (1.15, 1.65, 2.15):
    rect(mx, 10.65, mx + 0.20, 10.95, "04_MOBILIARIO_INTERIOR")

# -- Sala de Estar (doble altura) 21.40 m2 --------------------------------
dashed_rect(3.00, 10.00, 5.80, 16.80, "04_MOBILIARIO_INTERIOR")
room_label("SALA DE ESTAR\n(DOBLE ALTURA H=5.80 m)", 21.40, 4.40, 13.40, npt="+0.45")
rect(3.40, 15.20, 5.40, 16.30, "04_MOBILIARIO_INTERIOR")  # sofa
dashed_rect(3.00, 10.00, 5.80, 16.80, "18_DOBLE_ALTURA_VACIO")

# Chimenea escultorica monumental
rect(3.20, 15.60, 4.20, 16.50, "19_CHIMENEA_ESCULTORICA")
text("CHIMENEA\nESCULTORICA\nH=5.80 m", 3.70, 16.00, h=0.10, layer="19_CHIMENEA_ESCULTORICA")

# Columna de madera viva (live-edge) en distribuidor
msp.add_circle((5.60, 12.80), 0.18, dxfattribs=L("04_MOBILIARIO_INTERIOR"))
text("COLUMNA MADERA\nLIVE-EDGE", 5.60, 12.40, h=0.09, layer="04_MOBILIARIO_INTERIOR")

# -- Patio de luz interior con arbol (caja de cristal) --------------------
rect(5.80, 13.00, 7.20, 15.50, "03_VENTANALES_CORREDIZOS")
tree(6.50, 14.25, 0.55)
dashed_rect(5.80, 13.00, 7.20, 15.50, "14_LUZ_CENITAL_TRAGALUZ")
text("PATIO DE LUZ\nARBOL EN CAJA DE CRISTAL", 6.50, 12.70, h=0.11, layer="07_VEGETACION_PAISAJE")

# -- Bano Multifuncional 360° 7.50 m2 -------------------------------------
dashed_rect(5.80, 13.50, 8.20, 16.80, "05_SANITARIOS_COCINA")
room_label("BAÑO\nMULTIFUNCIONAL 360°", 7.50, 7.00, 15.10, npt="+0.45")
msp.add_circle((6.10, 16.40), 0.22, dxfattribs=L("05_SANITARIOS_COCINA"))  # inodoro aprox
rect(5.95, 16.10, 6.25, 16.60, "05_SANITARIOS_COCINA")
rect(6.50, 13.70, 8.00, 14.30, "05_SANITARIOS_COCINA")  # vanitory doble bacha
rect(7.30, 14.60, 8.05, 16.70, "05_SANITARIOS_COCINA")  # ducha / box
text("DUCHA\nDESAGÜE LINEAL", 7.68, 15.60, h=0.09, layer="05_SANITARIOS_COCINA")
dashed_rect(7.30, 14.60, 8.05, 16.70, "14_LUZ_CENITAL_TRAGALUZ")  # claraboya sobre ducha
# puerta exterior directa a piscina (acceso 360)
msp.add_line((7.60, 16.80), (8.05, 16.80), dxfattribs=L("02_PUERTAS"))

# -- Dormitorio Principal + Home Office -----------------------------------
dashed_rect(8.20, 10.00, 11.80, 16.80, "04_MOBILIARIO_INTERIOR")
room_label("DORMITORIO PRINCIPAL\n+ HOME OFFICE", 20.70, 10.00, 13.40, npt="+0.45")
rect(9.30, 13.40, 11.30, 15.40, "04_MOBILIARIO_INTERIOR")  # cama queen 1.80x2.00 aprox
text("CAMA QUEEN\n1.80x2.00", 10.30, 14.40, h=0.10, layer="04_MOBILIARIO_INTERIOR")
rect(8.40, 13.00, 10.20, 13.65, "04_HOME_OFFICE")  # placard 3.40 frente (ref)
text("PLACARD 3.40 m", 9.30, 13.30, h=0.09, layer="04_HOME_OFFICE")

# Window seat (asiento de ventana) + biblioteca
rect(8.50, 10.00, 10.40, 10.70, "04_WINDOW_SEAT")
text("WINDOW SEAT 1.90x0.70", 9.45, 10.35, h=0.10, layer="04_WINDOW_SEAT")
rect(10.40, 10.00, 11.40, 16.80, "04_HOME_OFFICE")
text("BIBLIOTECA\nEMPOTRADA", 10.90, 12.00, h=0.10, layer="04_HOME_OFFICE", rotation=90)
rect(10.60, 12.60, 11.80, 13.25, "04_HOME_OFFICE")  # escritorio 1.70x0.65
text("ESCRITORIO\nHOME OFFICE", 11.20, 12.90, h=0.09, layer="04_HOME_OFFICE")

# Claraboya cenital sobre vestidor / zona de trabajo
dashed_rect(10.40, 11.80, 11.80, 13.60, "14_LUZ_CENITAL_TRAGALUZ")

# Puertas interiores tipicas (bano social/suite, dormitorio)
door_block(5.80, 14.60, 0.80, hinge="left", swing="up")   # bano social desde sala
door_block(8.20, 14.60, 0.80, hinge="right", swing="down")  # bano en suite desde dormitorio
door_block(8.20, 11.50, 0.90, hinge="right", swing="up")   # acceso dormitorio

# =========================================================================
# 4. FRANJA POSTERIOR  Y: 16.80 - 30.00  (Quincho, piscina, patio, fogon)
# =========================================================================
# -- Muro / alero divisorio quincho-piscina con cascada laminar ---------
wall([(4.50, 16.80), (4.50, 24.07)], "01_TABIQUES", 0.15)
msp.add_line((4.80, 17.30), (7.50, 17.30), dxfattribs=L("17_CASCADA_LAMINAR"))
msp.add_line((4.80, 17.45), (7.50, 17.45), dxfattribs=L("17_CASCADA_LAMINAR"))
text("CASCADA LAMINAR (WATER CURTAIN)", 6.15, 17.65, h=0.12, layer="17_CASCADA_LAMINAR")

# -- Quincho semicubierto 31.20 m2 ---------------------------------------
dashed_rect(0.20, 16.80, 4.50, 24.07, "01_TABIQUES")
room_label("QUINCHO\nSEMICUBIERTO", 31.20, 2.35, 20.40, npt="+0.35")
rect(0.50, 17.00, 2.50, 18.00, "05_SANITARIOS_COCINA")  # barra in&out + parrilla
text("BARRA IN&OUT\nPARRILLA / CAMPANA", 1.50, 17.50, h=0.10, layer="05_SANITARIOS_COCINA")
dashed_rect(0.40, 16.90, 4.40, 23.97, "01_TABIQUES")  # proyeccion pergola

# -- Piscina + Solarium atermico 76.40 m2 ---------------------------------
rect(4.80, 18.00, 11.80, 23.66, "06_PISCINA_SOLARIUM")
text("PISCINA\n39.60 m²  N.P.T. -1.25 / +0.25", 8.30, 20.80, h=0.16, layer="06_PISCINA_SOLARIUM")
dashed_rect(0.20, 16.80, 11.80, 27.00, "06_PISCINA_SOLARIUM")
text("SOLARIUM ATERMICO", 9.50, 25.50, h=0.14, layer="06_PISCINA_SOLARIUM")

# -- Sunken Fire Pit Lounge (living hundido) ------------------------------
rect(1.00, 25.50, 4.40, 28.90, "16_FOGON_FIRE_PIT")
rect(1.50, 26.00, 3.90, 28.40, "16_FOGON_FIRE_PIT")
text("SUNKEN FIRE PIT LOUNGE\n3.40x3.40 m  N.P.T. -0.45", 2.70, 27.20, h=0.12, layer="16_FOGON_FIRE_PIT")

# -- Jardin / vegetacion de fondo -----------------------------------------
for (tx, ty) in [(5.50, 29.00), (7.00, 29.20), (9.00, 28.80), (10.80, 27.80),
                  (0.70, 20.00), (0.70, 23.00)]:
    tree(tx, ty, 0.45)
text("AREA VERDE / PAISAJISMO", 8.00, 29.60, h=0.13, layer="07_VEGETACION_PAISAJE")

# =========================================================================
# 5. CIRCULACION: huellas flotantes de acceso y escalones de piscina
# =========================================================================
for i, py in enumerate([18.30, 18.90, 19.50]):
    rect(4.55, py, 4.78, py + 0.45, "10_CIRCULACION_ESCALERAS")

# =========================================================================
# 6. NIVELES PRINCIPALES (N.P.T.) referenciales en planta
# =========================================================================
npt_symbol(9.70, 2.00, "+0.15")
npt_symbol(0.50, 9.80, "+0.30")
npt_symbol(0.50, 10.30, "+0.45")
npt_symbol(1.00, 20.80, "+0.35")
npt_symbol(8.30, 18.30, "+0.25 / -1.25")

# =========================================================================
# 7. LINEAS DE CORTE A-A' y B-B'
# =========================================================================
# Corte A-A' (longitudinal, Norte-Sur) a X=6.00
msp.add_line((6.00, -1.20), (6.00, 31.20), dxfattribs=L("12_LINEAS_DE_CORTE"))
text("A", 6.00, 31.50, h=0.30, layer="12_LINEAS_DE_CORTE")
text("A'", 6.00, -1.55, h=0.30, layer="12_LINEAS_DE_CORTE")

# Corte B-B' (transversal, Este-Oeste) a Y=14.80
msp.add_line((-1.20, 14.80), (13.20, 14.80), dxfattribs=L("12_LINEAS_DE_CORTE"))
text("B", -1.55, 14.80, h=0.30, layer="12_LINEAS_DE_CORTE")
text("B'", 13.55, 14.80, h=0.30, layer="12_LINEAS_DE_CORTE")

# =========================================================================
# 8. ACOTADO ISO 129 (tres lineas: muros/particiones, ambientes, total)
# =========================================================================
# -- Horizontal (franja inferior, fuera del lote) ------------------------
y0 = -0.5
dim_h(0.00, 3.00, y0, -0.45)
dim_h(3.00, 5.80, y0, -0.45)
dim_h(5.80, 8.20, y0, -0.45)
dim_h(8.20, 12.00, y0, -0.45)
dim_h(0.00, 6.00, y0 - 0.9, -0.45)
dim_h(6.00, 12.00, y0 - 0.9, -0.45)
dim_h(0.00, 12.00, y0 - 1.8, -0.45)

# -- Vertical (franja izquierda, fuera del lote) -------------------------
x0 = -0.5
dim_v(0.00, 10.00, x0, -0.45)
dim_v(10.00, 16.80, x0, -0.45)
dim_v(16.80, 30.00, x0, -0.45)
dim_v(0.00, 16.80, x0 - 0.9, -0.45)
dim_v(16.80, 30.00, x0 - 0.9, -0.45)
dim_v(0.00, 30.00, x0 - 1.8, -0.45)

# =========================================================================
# 9. CAJETIN / CARATULA TECNICA (formato A1, esquina inferior derecha)
# =========================================================================
cx0, cy0 = 13.60, -2.00
cx1, cy1 = 22.60, 1.40
rect(cx0, cy0, cx1, cy1, "11_CARATULA_TECNICA")
msp.add_line((cx0, 0.80), (cx1, 0.80), dxfattribs=L("11_CARATULA_TECNICA"))
msp.add_line((cx0, -0.60), (cx1, -0.60), dxfattribs=L("11_CARATULA_TECNICA"))
msp.add_line((cx0 + 4.00, cy0), (cx0 + 4.00, 0.80), dxfattribs=L("11_CARATULA_TECNICA"))

text("RESIDENCIA UNIFAMILIAR CONTEMPORANEA", cx0 + 0.20, 1.10, h=0.16,
     layer="11_CARATULA_TECNICA", align="MIDDLE_LEFT")
text("Lote 12.00 x 30.00 m  —  Sup. Terreno 360.00 m²", cx0 + 0.20, 0.10, h=0.13,
     layer="11_CARATULA_TECNICA", align="MIDDLE_LEFT")
text("PLANO A-01 / PLANTA ARQUITECTONICA", cx0 + 0.20, -0.25, h=0.13,
     layer="11_CARATULA_TECNICA", align="MIDDLE_LEFT")
text("ESCALA 1:100   -   CORTES A-A' B-B' ESCALA 1:50", cx0 + 0.20, -0.90, h=0.12,
     layer="11_CARATULA_TECNICA", align="MIDDLE_LEFT")
text("Archivo: plano_casa_12x30_completo.dxf", cx0 + 0.20, -1.25, h=0.11,
     layer="11_CARATULA_TECNICA", align="MIDDLE_LEFT")
text("Norte:", cx0 + 4.20, 1.10, h=0.13, layer="11_CARATULA_TECNICA", align="MIDDLE_LEFT")

# Simbolo de norte
nx, ny = cx0 + 5.20, -0.95
msp.add_circle((nx, ny), 0.55, dxfattribs=L("11_CARATULA_TECNICA"))
msp.add_line((nx, ny - 0.5), (nx, ny + 0.5), dxfattribs=L("11_CARATULA_TECNICA"))
msp.add_line((nx - 0.5, ny), (nx + 0.5, ny), dxfattribs=L("11_CARATULA_TECNICA"))
msp.add_line((nx, ny), (nx - 0.18, ny + 0.32), dxfattribs=L("11_CARATULA_TECNICA"))
msp.add_line((nx, ny), (nx + 0.18, ny + 0.32), dxfattribs=L("11_CARATULA_TECNICA"))
text("N", nx, ny + 0.72, h=0.18, layer="11_CARATULA_TECNICA")

doc.saveas(r"C:\Users\HP 250 G10\Documents\GITHUT\ksa\plano_casa_12x30_completo.dxf")
print("DXF generado correctamente.")
