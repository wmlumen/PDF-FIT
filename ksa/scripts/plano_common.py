"""Capas y helpers compartidos para los planos DXF del proyecto (plantas, cortes, fachadas)."""
import ezdxf
from ezdxf.enums import TextEntityAlignment

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
    "20_TERRENO_NATURAL":         dict(color=40,  lw=25, linetype="DASHED"),
}

# Niveles (cotas Z) segun Seccion 4 y 8 de la memoria descriptiva
Z = dict(
    CALLE=0.00,
    VEREDA_ESTAC=0.15,
    NPT=0.45,
    CIELORRASO=3.25,
    LOSA=3.45,
    PRETIL=3.85,
    LOSA_ALTA=6.05,
    PRETIL_ALTO=6.65,
    QUINCHO_NPT=0.35,
    QUINCHO_LOSA=3.05,
    QUINCHO_PRETIL=3.35,
    SOLARIUM=0.35,
    AGUA_PISCINA=0.25,
    FONDO_PISCINA=-1.25,
    ESTAC_LOSA=2.75,
    FUNDACION=-0.60,
)


def new_doc():
    doc = ezdxf.new("R2018", setup=True)
    doc.units = ezdxf.units.M
    for name, props in LAYERS.items():
        layer = doc.layers.add(name=name, color=props["color"])
        layer.dxf.lineweight = props["lw"]
        try:
            layer.dxf.linetype = props.get("linetype", "CONTINUOUS")
        except Exception:
            pass
    return doc


def L(name):
    return {"layer": name}


class Draw:
    def __init__(self, msp):
        self.msp = msp

    def rect(self, x0, y0, x1, y1, layer, closed=True):
        pts = [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
        pl = self.msp.add_lwpolyline(pts, dxfattribs=L(layer))
        pl.closed = closed
        return pl

    def dashed_rect(self, x0, y0, x1, y1, layer):
        return self.rect(x0, y0, x1, y1, layer)

    def line(self, p0, p1, layer):
        return self.msp.add_line(p0, p1, dxfattribs=L(layer))

    def pline(self, pts, layer, width=None, closed=False):
        pl = self.msp.add_lwpolyline(pts, dxfattribs=L(layer))
        if width:
            pl.dxf.const_width = width
        pl.closed = closed
        return pl

    def text(self, s, x, y, h=0.18, layer="09_ROTULOS_AMBIENTES", align="MIDDLE_CENTER", rotation=0):
        t = self.msp.add_text(s, dxfattribs={"layer": layer, "height": h, "rotation": rotation})
        t.set_placement((x, y), align=getattr(TextEntityAlignment, align))
        return t

    def level_line(self, x0, x1, z, label, layer="15_NIVELES_ARQUITECTURA", side="right"):
        """Linea de nivel horizontal con simbolo triangular y cota de texto."""
        self.line((x0, z), (x1, z), layer)
        tx = x1 + 0.3 if side == "right" else x0 - 0.3
        align = "MIDDLE_LEFT" if side == "right" else "MIDDLE_RIGHT"
        # triangulo de nivel
        tr_x = x1 if side == "right" else x0
        d = 0.14
        pts = [(tr_x, z), (tr_x + (d if side == "right" else -d), z + d), (tr_x + (d if side == "right" else -d), z - d)]
        self.pline(pts, layer, closed=True)
        self.text(label, tx, z, h=0.13, layer=layer, align=align)

    def dim_v(self, y0, y1, x, offset=0.5):
        dim = self.msp.add_linear_dim(
            base=(x + offset, y0), p1=(x, y0), p2=(x, y1), angle=90,
            dxfattribs=L("08_COTAS_ARQUITECTURA"), override={"dimtxt": 0.13},
        )
        dim.render()
        return dim

    def dim_h(self, x0, x1, y, offset=-0.5):
        dim = self.msp.add_linear_dim(
            base=(x0, y + offset), p1=(x0, y), p2=(x1, y),
            dxfattribs=L("08_COTAS_ARQUITECTURA"), override={"dimtxt": 0.13},
        )
        dim.render()
        return dim

    def terrain_hatch(self, x0, x1, z, layer="20_TERRENO_NATURAL", step=0.4, depth=0.18):
        import math
        x = x0
        while x < x1:
            self.line((x, z), (x - depth, z - depth), layer)
            x += step

    def title_block(self, x0, y0, title, subtitle1, subtitle2, subtitle3, filename):
        x1, y1 = x0 + 9.0, y0 + 3.4
        self.rect(x0, y0, x1, y1, "11_CARATULA_TECNICA")
        self.line((x0, y0 + 2.8), (x1, y0 + 2.8), "11_CARATULA_TECNICA")
        self.line((x0, y0 + 1.4), (x1, y0 + 1.4), "11_CARATULA_TECNICA")
        self.line((x0 + 4.0, y0), (x0 + 4.0, y0 + 1.4), "11_CARATULA_TECNICA")
        self.text(title, x0 + 0.2, y0 + 3.05, h=0.18, layer="11_CARATULA_TECNICA", align="MIDDLE_LEFT")
        self.text(subtitle1, x0 + 0.2, y0 + 2.45, h=0.14, layer="11_CARATULA_TECNICA", align="MIDDLE_LEFT")
        self.text(subtitle2, x0 + 0.2, y0 + 1.95, h=0.13, layer="11_CARATULA_TECNICA", align="MIDDLE_LEFT")
        self.text(subtitle3, x0 + 0.2, y0 + 0.7, h=0.14, layer="11_CARATULA_TECNICA", align="MIDDLE_LEFT")
        self.text(f"Archivo: {filename}", x0 + 0.2, y0 + 0.2, h=0.11, layer="11_CARATULA_TECNICA", align="MIDDLE_LEFT")
        self.text("RESIDENCIA UNIFAMILIAR 12x30 m\nSup. Terreno 360.00 m²", x0 + 4.2, y0 + 0.7, h=0.12,
                   layer="11_CARATULA_TECNICA", align="MIDDLE_LEFT")
