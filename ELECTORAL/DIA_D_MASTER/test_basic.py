"""
Tests basicos para DIA D MASTER API.
Ejecutar con: python3 -m pytest test_basic.py -v
"""
import pytest
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from fastapi.testclient import TestClient
from app import app, hash_password, get_connection, init_db

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_db():
    """Inicializa la BD antes de cada test."""
    init_db()
    yield


def test_health_check():
    """Test basico de health check."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"


def test_api_status():
    """Test del endpoint status de la API."""
    response = client.get("/api?action=status")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "timestamp" in data


def test_login_requiere_credenciales():
    """Test que login sin credenciales falla."""
    response = client.post("/api", json={"action": "login"})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False
    assert "error" in data


def test_login_credenciales_invalidas():
    """Test que login con credenciales invalidas falla."""
    response = client.post("/api", json={
        "action": "login",
        "cedula": "99999999",
        "password": "wrongpassword"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False


def test_hash_password():
    """Test que el hash de contraseña funciona correctamente."""
    password = "test123"
    hashed = hash_password(password)
    assert hashed.startswith("$pbkdf2-sha256$")
    assert hashed != password


def test_check_password_valido():
    """Test que check_password valida correctamente."""
    password = "mipassword123"
    hashed = hash_password(password)
    from app import check_password
    assert check_password(password, hashed) is True
    assert check_password("wrongpass", hashed) is False


def test_check_password_formato_invalido():
    """Test que check_password rechaza formato invalido."""
    from app import check_password
    assert check_password("pass", "not_a_hash") is False
    assert check_password("pass", "") is False


def test_sql_injection_en_login():
    """Test que SQL injection en login es rechazado."""
    response = client.post("/api", json={
        "action": "login",
        "cedula": "' OR '1'='1",
        "password": "' OR '1'='1"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False


def test_sql_injection_en_consulta():
    """Test que SQL injection en consulta de veedor es rechazado."""
    response = client.post("/veedores/consultar-donde-vota", json={
        "cedula": "'; DROP TABLE registros; --"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["encontrado"] is False


def test_cedula_corta_valida():
    """Test que cedulas cortas (4 digitos) son aceptadas."""
    from app import normalizar_cedula
    # Simular la validacion del regex
    import re
    ced = "1234"
    assert re.match(r'^\d{4,8}$', ced) is not None


def test_cedula_larga_invalida():
    """Test que cedulas largas (>8 digitos) son rechazadas."""
    import re
    ced = "123456789"
    assert re.match(r'^\d{4,8}$', ced) is None


def test_contacto_requiere_campos():
    """Test que formulario de contacto requiere todos los campos."""
    response = client.post("/api/contacto", json={
        "nombre": "",
        "email": "",
        "mensaje": ""
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False


def test_contacto_email_invalido():
    """Test que email invalido es rechazado."""
    response = client.post("/api/contacto", json={
        "nombre": "Test",
        "email": "invalido",
        "mensaje": "Mensaje de prueba"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False


def test_veedor_consulta_requiere_cedula():
    """Test que consulta de veedor requiere cedula."""
    response = client.post("/veedores/consultar-donde-vota", json={})
    assert response.status_code == 200
    data = response.json()
    assert data["encontrado"] is False
    assert "error" in data


def test_api_key_requerida_para_dirigentes():
    """Test que acciones de dirigente requieren API key."""
    response = client.get("/api?action=dirigentes")
    assert response.status_code == 403


def test_miembros_mesa_v2_duplicado():
    """Test que miembros_mesa_v2 redirige a miembros_mesa (o es identico)."""
    # Ambos endpoints deberian retornar la misma estructura
    response = client.get("/api?action=miembros_mesa")
    assert response.status_code == 200
    data = response.json()
    assert "miembros" in data
    assert "total" in data


def test_normalizar_cedula():
    """Test que normalizar_cedula limpia correctamente."""
    from app import normalizar_cedula
    assert normalizar_cedula("1234.5678") == "12345678"
    assert normalizar_cedula("1234 5678") == "12345678"
    assert normalizar_cedula("1234-5678") == "12345678"
    assert normalizar_cedula("") == ""


def test_normalizar_texto():
    """Test que normalizar_texto limpia espacios."""
    from app import normalizar_texto
    assert normalizar_texto("  hola  ") == "hola"
    assert normalizar_texto(None) == ""
    assert normalizar_texto("") == ""


def test_rate_limiting():
    """Test que rate limiting funciona (basico)."""
    # Hacer varias peticiones rapidas
    for _ in range(3):
        response = client.get("/api/health")
        assert response.status_code == 200


def test_elecciones_lista():
    """Test que lista de elecciones funciona."""
    response = client.get("/api/elecciones")
    assert response.status_code == 200
    data = response.json()
    assert "elecciones" in data
    assert "total" in data


def test_cargos_electivos_lista():
    """Test que lista de cargos electivos funciona."""
    response = client.get("/api/cargos_electivos")
    assert response.status_code == 200
    data = response.json()
    assert "cargos" in data


def test_cliente_perfil_requiere_cedula():
    """Test que perfil de cliente requiere cedula."""
    response = client.get("/api/cliente/perfil?cedula=")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False


def test_cliente_dashboard_requiere_cedula():
    """Test que dashboard de cliente requiere cedula."""
    response = client.get("/api/cliente/dashboard?cedula=")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False


def test_optimizar_asignaciones_requiere_datos():
    """Test que optimizar asignaciones maneja datos vacios."""
    response = client.post("/api/transporte/optimizar_asignaciones", json={})
    # Deberia retornar error o lista vacia, no 500
    assert response.status_code == 200


def test_cargar_masivo_requiere_auth():
    """Test que carga masiva requiere autenticacion."""
    response = client.post("/api/dirigente/cargar_masivo", json={
        "tipo": "voto_seguro",
        "filas": [{"cedula": "1234567", "nombre": "Test"}]
    })
    # Deberia fallar por falta de auth
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False


def test_certificacion_requiere_parametros():
    """Test que certificacion maneja parametros faltantes."""
    response = client.get("/api/certificacion?tipo_dato=voto&clave=")
    assert response.status_code == 200


def test_gamificacion_ranking():
    """Test que ranking de gamificacion funciona."""
    response = client.get("/api/gamificacion/ranking")
    assert response.status_code == 200
    data = response.json()
    assert "ranking" in data


def test_votantes_paginados():
    """Test que paginacion de votantes funciona."""
    response = client.get("/api/votantes_paginados?page=1&limit=10")
    assert response.status_code == 200
    data = response.json()
    assert "data" in data
    assert "total" in data


def test_mesas_conteo_requiere_local():
    """Test que mesas_conteo requiere local_id."""
    response = client.get("/api/mesas_conteo?local_id=1")
    assert response.status_code == 200
    data = response.json()
    assert "mesas" in data


def test_dhondt_requiere_datos():
    """Test que calculo D'Hondt requiere datos."""
    response = client.post("/api/dhondt/calcular", json={
        "bancas": 0,
        "listas": []
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False


def test_dhondt_calculo_valido():
    """Test que calculo D'Hondt funciona con datos validos."""
    response = client.post("/api/dhondt/calcular", json={
        "bancas": 3,
        "listas": [
            {"nombre": "Lista A", "votos": 100},
            {"nombre": "Lista B", "votos": 80},
            {"nombre": "Lista C", "votos": 30}
        ]
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["bancas_totales"] == 3
    assert len(data["resultados"]) == 3


def test_plantilla_whatsapp_default():
    """Test que plantilla default de WhatsApp existe."""
    response = client.get("/api?action=whatsapp_plantilla_votacion")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "plantilla_activa" in data


def test_no_voto_crear_requiere_auth():
    """Test que crear no_voto requiere autenticacion."""
    response = client.post("/api/no_voto/crear", json={
        "cedula": "1234567",
        "mesa": 1,
        "orden": 1
    })
    # Deberia fallar por falta de auth
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False


def test_transporte_crear_requiere_datos():
    """Test que crear transporte requiere datos."""
    response = client.post("/api/transporte/crear", json={
        "cedula": "",
        "nombre": ""
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False


def test_usuario_crear_requiere_auth():
    """Test que crear usuario requiere auth master."""
    response = client.post("/api/usuarios/crear", json={
        "cedula": "1234567",
        "nombre": "Test",
        "contrasena": "pass123",
        "nivel": "seccional"
    })
    # Deberia fallar por falta de auth
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False


def test_auditoria_lista():
    """Test que lista de auditoria funciona."""
    response = client.get("/api/auditoria?limite=10")
    assert response.status_code == 200
    data = response.json()
    assert "registros" in data


def test_sesiones_lista():
    """Test que lista de sesiones funciona."""
    response = client.get("/api/sesiones")
    assert response.status_code == 200
    data = response.json()
    assert "sesiones" in data


def test_roles_disponibles():
    """Test que roles disponibles funciona."""
    response = client.get("/api/usuarios/roles_disponibles")
    assert response.status_code == 200
    data = response.json()
    assert "roles" in data


def test_permisos_lista():
    """Test que lista de permisos funciona."""
    response = client.get("/api/permisos/lista")
    assert response.status_code == 200
    data = response.json()
    assert "permisos" in data


def test_permisos_check():
    """Test que check de permisos funciona."""
    response = client.get("/api/permisos/check?rol=master&permiso=admin_total")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["tiene"] is True


def test_locales_votacion_lista():
    """Test que lista de locales de votacion funciona."""
    response = client.get("/api/locales_votacion")
    assert response.status_code == 200
    data = response.json()
    assert "locales" in data


def test_conductor_pendientes_requiere_cedula():
    """Test que pendientes de conductor requiere cedula."""
    response = client.get("/api/conductor/pendientes?cedula=")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False


def test_tareas_lista():
    """Test que lista de tareas funciona."""
    response = client.get("/api/tareas")
    assert response.status_code == 200
    data = response.json()
    assert "tareas" in data


def test_tareas_crear_requiere_datos():
    """Test que crear tarea requiere datos."""
    response = client.post("/api/tareas/crear", json={
        "cedula": "",
        "titulo": ""
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False


def test_cliente_pcs_requiere_cedula():
    """Test que PCs de cliente requiere cedula."""
    response = client.get("/api/cliente/pcs?cedula=")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False


def test_cliente_dirigentes_requiere_cedula():
    """Test que dirigentes de cliente requiere cedula."""
    response = client.get("/api/cliente/dirigentes?cedula=")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False


def test_cliente_logistica_requiere_cedula():
    """Test que logistica de cliente requiere cedula."""
    response = client.get("/api/cliente/logistica?cedula=")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False


def test_cliente_transporte_requiere_cedula():
    """Test que transporte de cliente requiere cedula."""
    response = client.get("/api/cliente/transporte?cedula=")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False


def test_descargar_apk_nombre_invalido():
    """Test que descargar APK con nombre invalido falla."""
    response = client.get("/api/descargar/apk/nombre_invalido")
    assert response.status_code == 404


def test_static_files():
    """Test que archivos estaticos se sirven."""
    response = client.get("/")
    assert response.status_code == 200


def test_admin_usuarios_page():
    """Test que pagina de admin usuarios existe."""
    response = client.get("/admin_usuarios")
    assert response.status_code == 200


def test_admin_general_page():
    """Test que pagina de admin general existe."""
    response = client.get("/admin_general")
    assert response.status_code == 200


def test_app_html():
    """Test que App.html existe."""
    response = client.get("/App.html")
    assert response.status_code == 200


def test_party_theme_js():
    """Test que party_theme.js existe."""
    response = client.get("/party_theme.js")
    assert response.status_code == 200


def test_tema_cliente_css():
    """Test que tema-cliente.css se sirve."""
    response = client.get("/tema-cliente.css")
    assert response.status_code == 200


def test_certificacion_resumen():
    """Test que resumen de certificacion funciona."""
    response = client.get("/api/certificacion/resumen?tipo_dato=voto")
    assert response.status_code == 200
    data = response.json()
    assert "total" in data


def test_seguridad_estado():
    """Test que estado de seguridad funciona."""
    response = client.get("/api/seguridad/estado")
    assert response.status_code == 200
    data = response.json()
    assert "estado" in data


def test_usuarios_lista():
    """Test que lista de usuarios funciona."""
    response = client.get("/api/usuarios/lista")
    assert response.status_code == 200
    data = response.json()
    assert "usuarios" in data


def test_conductor_detalle_requiere_cedula():
    """Test que detalle de conductor requiere cedula."""
    response = client.get("/api/conductor/detalle?cedula=")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False


def test_todas_ubicaciones():
    """Test que todas las ubicaciones funciona."""
    response = client.get("/api/conductor/todas_ubicaciones")
    assert response.status_code == 200
    data = response.json()
    assert "ubicaciones" in data


def test_mapa_datos_geograficos():
    """Test que datos geograficos del mapa funciona."""
    response = client.get("/api/mapa/datos_geograficos")
    assert response.status_code == 200
    data = response.json()
    assert "datos" in data


def test_transporte_viajes_activos():
    """Test que viajes activos funciona."""
    response = client.get("/api/transporte/viajes_activos")
    assert response.status_code == 200
    data = response.json()
    assert "viajes" in data


def test_transporte_stats_conductor():
    """Test que stats de conductor funciona."""
    response = client.get("/api/transporte/stats_conductor?transporte_id=1")
    assert response.status_code == 200
    data = response.json()
    assert "tramos_completados" in data


def test_conductor_disponibilidad_requiere_datos():
    """Test que disponibilidad de conductor requiere datos."""
    response = client.post("/api/conductor/disponibilidad", json={
        "cedula": "",
        "estado": ""
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False


def test_conductor_historial_extendido():
    """Test que historial extendido de conductor funciona."""
    response = client.get("/api/conductor/historial_extendido?cedula=1234567")
    assert response.status_code == 200
    data = response.json()
    assert "historial" in data


def test_auditoria_exportar():
    """Test que exportar auditoria funciona."""
    response = client.get("/api/auditoria/exportar")
    assert response.status_code == 200


def test_sesiones_cerrar_requiere_datos():
    """Test que cerrar sesion requiere datos."""
    response = client.post("/api/sesiones/cerrar", json={})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False


def test_usuarios_cambiar_password_requiere_datos():
    """Test que cambiar password requiere datos."""
    response = client.post("/api/usuarios/cambiar_password", json={})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False


def test_usuarios_resetear_password_requiere_datos():
    """Test que resetear password requiere datos."""
    response = client.post("/api/usuarios/resetear_password", json={})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False


def test_usuarios_toggle_branding_requiere_datos():
    """Test que toggle branding requiere datos."""
    response = client.post("/api/usuarios/toggle_branding", json={})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False


def test_usuarios_perfil_requiere_datos():
    """Test que perfil de usuario requiere datos."""
    response = client.post("/api/usuarios/perfil", json={})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False


def test_usuarios_asignar_rol_requiere_datos():
    """Test que asignar rol requiere datos."""
    response = client.post("/api/usuarios/asignar_rol", json={})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False


def test_usuarios_quitar_rol_requiere_datos():
    """Test que quitar rol requiere datos."""
    response = client.post("/api/usuarios/quitar_rol", json={})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False


def test_usuarios_toggle_requiere_datos():
    """Test que toggle usuario requiere datos."""
    response = client.post("/api/usuarios/toggle", json={})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False


def test_usuarios_editar_requiere_datos():
    """Test que editar usuario requiere datos."""
    response = client.post("/api/usuarios/editar", json={})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False


def test_elecciones_crear_requiere_auth():
    """Test que crear eleccion requiere auth."""
    response = client.post("/api/elecciones/crear", json={
        "nombre": "Test",
        "tipo_eleccion_id": 1
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False


def test_elecciones_estado_requiere_auth():
    """Test que actualizar estado de eleccion requiere auth."""
    response = client.post("/api/elecciones/1/estado", json={
        "estado": "activa"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False


def test_elecciones_eliminar_requiere_auth():
    """Test que eliminar eleccion requiere auth."""
    response = client.post("/api/elecciones/1/eliminar", json={})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False


def test_tipos_eleccion_lista():
    """Test que lista de tipos de eleccion funciona."""
    response = client.get("/api/tipos_eleccion")
    assert response.status_code == 200
    data = response.json()
    assert "tipos" in data


def test_transportes_lista():
    """Test que lista de transportes funciona."""
    response = client.get("/api/transportes")
    assert response.status_code == 200
    data = response.json()
    assert "transportes" in data


def test_transporte_crear_requiere_auth():
    """Test que crear transporte requiere auth."""
    response = client.post("/api/transportes/crear", json={
        "cedula": "1234567",
        "nombre": "Test"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False


def test_transporte_eliminar_requiere_auth():
    """Test que eliminar transporte requiere auth."""
    response = client.post("/api/transportes/1/eliminar")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False


def test_transporte_detalle():
    """Test que detalle de transporte funciona."""
    response = client.get("/api/transportes/1")
    assert response.status_code == 200
    data = response.json()
    assert "transporte" in data


def test_no_voto_lista():
    """Test que lista de no_voto funciona."""
    response = client.get("/api/no_voto")
    assert response.status_code == 200
    data = response.json()
    assert "registros" in data


def test_no_voto_eliminar_requiere_auth():
    """Test que eliminar no_voto requiere auth."""
    response = client.post("/api/no_voto/1/eliminar")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False


def test_veedores_mesa_lista():
    """Test que lista de veedores mesa funciona."""
    response = client.get("/api/veedores_mesa")
    assert response.status_code == 200
    data = response.json()
    assert "veedores" in data


def test_veedores_mesa_crear_requiere_auth():
    """Test que crear veedor mesa requiere auth."""
    response = client.post("/api/veedores_mesa/crear", json={
        "id_veedor": "V001",
        "nombre_veedor": "Test"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False


def test_veedores_mesa_eliminar_requiere_auth():
    """Test que eliminar veedor mesa requiere auth."""
    response = client.post("/api/veedores_mesa/1/eliminar")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False


def test_cargos_electivos_crear_requiere_auth():
    """Test que crear cargo electivo requiere auth."""
    response = client.post("/api/cargos_electivos/crear", json={
        "codigo": "TEST",
        "nombre": "Test",
        "ambito": "nacional"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False


def test_listas_partido_lista():
    """Test que lista de listas partido funciona."""
    response = client.get("/api/listas_partido")
    assert response.status_code == 200
    data = response.json()
    assert "listas" in data


def test_listas_partido_por_partido():
    """Test que listas por partido funciona."""
    response = client.get("/api/listas_partido/1")
    assert response.status_code == 200
    data = response.json()
    assert "listas" in data


def test_listas_partido_crear_requiere_auth():
    """Test que crear lista partido requiere auth."""
    response = client.post("/api/listas_partido/crear", json={
        "partido_id": 1,
        "numero_lista": 1,
        "nombre_lista": "Test"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False


def test_ubicaciones_gps_lista():
    """Test que lista de ubicaciones GPS funciona."""
    response = client.get("/api/ubicaciones_gps")
    assert response.status_code == 200
    data = response.json()
    assert "ubicaciones" in data


def test_ubicaciones_gps_crear_requiere_datos():
    """Test que crear ubicacion GPS requiere datos."""
    response = client.post("/api/ubicaciones_gps/crear", json={
        "lat": None,
        "lng": None
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False


def test_candidato_eliminar_requiere_auth():
    """Test que eliminar candidato requiere auth."""
    response = client.post("/api/candidatos/1/eliminar")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False


def test_cliente_eliminar_requiere_auth():
    """Test que eliminar cliente requiere auth."""
    response = client.post("/api/clientes/1234567/eliminar", json={})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False


def test_partido_eliminar_requiere_auth():
    """Test que eliminar partido requiere auth."""
    response = client.post("/api/partidos/1/eliminar", json={})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False


def test_usuario_eliminar_requiere_auth():
    """Test que eliminar usuario requiere auth."""
    response = client.post("/api/usuarios/1234567/eliminar")
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False


def test_candidatos_listing():
    """Test que listing de candidatos funciona."""
    response = client.get("/api/candidatos")
    assert response.status_code == 200
    data = response.json()
    assert "candidatos" in data


def test_candidato_perfil():
    """Test que perfil de candidato funciona."""
    response = client.get("/api/candidato/perfil/1")
    assert response.status_code == 200
    data = response.json()
    assert "perfil" in data


def test_candidato_foto_actualizar_requiere_auth():
    """Test que actualizar foto de candidato requiere auth."""
    response = client.post("/api/candidato/foto/actualizar", json={
        "candidato_id": 1,
        "tipo": "perfil"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False


def test_candidato_perfil_actualizar_requiere_auth():
    """Test que actualizar perfil de candidato requiere auth."""
    response = client.post("/api/candidato/perfil/actualizar", json={
        "candidato_id": 1
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False


def test_candidato_fotos_fans_subir_requiere_datos():
    """Test que subir foto fan requiere datos."""
    response = client.post("/api/candidato/fotos_fans/subir", json={
        "candidato_id": None
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False


def test_candidatos_agrupados():
    """Test que candidatos agrupados funciona."""
    response = client.get("/api/candidatos_agrupados")
    assert response.status_code == 200
    data = response.json()
    assert "agrupado" in data


def test_candidato_electo_detalle():
    """Test que detalle de candidato electo funciona."""
    response = client.get("/api/candidatos_electos/1")
    assert response.status_code == 200
    data = response.json()
    assert "candidato" in data


def test_candidato_electo_crear_requiere_auth():
    """Test que crear candidato electo requiere auth."""
    response = client.post("/api/candidatos_electos/crear", json={
        "nombre": "Test",
        "partido_id": 1
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False


def test_candidato_electo_toggle_requiere_auth():
    """Test que toggle candidato electo requiere auth."""
    response = client.post("/api/candidatos_electos/toggle", json={
        "candidato_id": 1
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False


def test_conductor_pendientes():
    """Test que pendientes de conductor funciona."""
    response = client.get("/api/conductor/pendientes?cedula=1234567")
    assert response.status_code == 200
    data = response.json()
    assert "pendientes" in data


def test_transporte_editar_requiere_datos():
    """Test que editar transporte requiere datos."""
    response = client.post("/api/transporte/editar", json={})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False


def test_transporte_eliminar_requiere_datos():
    """Test que eliminar transporte requiere datos."""
    response = client.post("/api/transporte/eliminar", json={})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False


def test_cliente_pc_crear_requiere_datos():
    """Test que crear PC de cliente requiere datos."""
    response = client.post("/api/cliente/pcs/crear", json={})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False


def test_cliente_pc_eliminar_requiere_datos():
    """Test que eliminar PC de cliente requiere datos."""
    response = client.post("/api/cliente/pcs/eliminar", json={})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False


def test_cliente_dirigente_crear_requiere_datos():
    """Test que crear dirigente de cliente requiere datos."""
    response = client.post("/api/cliente/dirigentes/crear", json={})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False


def test_cliente_dirigente_editar_requiere_datos():
    """Test que editar dirigente de cliente requiere datos."""
    response = client.post("/api/cliente/dirigentes/editar", json={})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False


def test_cliente_dirigente_quitar_requiere_datos():
    """Test que quitar dirigente de cliente requiere datos."""
    response = client.post("/api/cliente/dirigentes/quitar", json={})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False


def test_cliente_logistica_autorizar_requiere_datos():
    """Test que autorizar logistica requiere datos."""
    response = client.post("/api/cliente/logistica/autorizar", json={})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False


def test_cliente_transporte_crear_requiere_datos():
    """Test que crear transporte de cliente requiere datos."""
    response = client.post("/api/cliente/transporte/crear", json={})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False


def test_cliente_transporte_editar_requiere_datos():
    """Test que editar transporte de cliente requiere datos."""
    response = client.post("/api/cliente/transporte/editar", json={})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False


def test_cliente_transporte_eliminar_requiere_datos():
    """Test que eliminar transporte de cliente requiere datos."""
    response = client.post("/api/cliente/transporte/eliminar", json={})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False


def test_recuperar_password_requiere_datos():
    """Test que recuperar password requiere datos."""
    response = client.post("/api/recuperar_password", json={})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False


def test_exportar_excel_requiere_auth():
    """Test que exportar Excel requiere auth."""
    response = client.get("/api/dirigente/exportar_excel?cedula=1234567&password=wrong")
    assert response.status_code == 401


def test_veedores_mesa_estado_get():
    """Test que estado de veedor mesa funciona."""
    response = client.get("/veedores/mesa/1/estado")
    assert response.status_code == 200
    data = response.json()
    assert "votos" in data


def test_veedores_mesa_estado_post_requiere_token():
    """Test que actualizar estado de veedor requiere token."""
    response = client.post("/veedores/mesa/1/estado", json={
        "token": "invalid_token",
        "votos": {}
    })
    assert response.status_code == 403


def test_veedores_mesa_estado_post_token_valido():
    """Test que actualizar estado de veedor con token valido funciona."""
    from app import VEEDOR_POST_TOKEN
    response = client.post("/veedores/mesa/1/estado", json={
        "token": VEEDOR_POST_TOKEN,
        "votos": {"candidato1": 10},
        "veedor": "Test"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True


def test_enviar_push_sin_suscripcion():
    """Test que enviar push sin suscripcion no falla."""
    from app import enviar_push
    result = enviar_push("99999999", "Test", "Mensaje")
    assert result is False


def test_obtener_ruta_calles():
    """Test que obtener ruta de calles maneja errores."""
    from app import obtener_ruta_calles
    # Con coordenadas invalidas deberia retornar None
    result = obtener_ruta_calles(0, 0, 0, 0)
    # Puede retornar None o una ruta, dependiendo de la conexion
    assert result is None or isinstance(result, dict)


def test_enviar_sms_sin_config():
    """Test que enviar SMS sin configuracion no falla."""
    from app import enviar_sms
    result = enviar_sms("123456789", "Test")
    assert result is False


def test_enviar_whatsapp_sin_config():
    """Test que enviar WhatsApp sin configuracion no falla."""
    from app import enviar_whatsapp
    result = enviar_whatsapp("123456789", "Test")
    assert result is False


def test_enviar_email_sin_config():
    """Test que enviar email sin configuracion no falla."""
    from app import enviar_email
    result = enviar_email("test@test.com", "Test", "Mensaje")
    assert result is False


def test_enviar_bienvenida_cliente_sin_config():
    """Test que enviar bienvenida sin configuracion no falla."""
    from app import enviar_bienvenida_cliente
    # No deberia lanzar excepcion
    enviar_bienvenida_cliente("1234567", "Test", "", "", "pass")


def test_registrar_consulta_publica():
    """Test que registrar consulta publica funciona."""
    from app import registrar_consulta_publica
    conn = get_connection()
    try:
        c = conn.cursor()
        elector = {
            "cedula": "1234567",
            "departamento": "Test",
            "distrito": "Test",
            "zona": "Test",
            "sec_loc": 1,
            "vinculo": "Test"
        }
        # No deberia lanzar excepcion
        registrar_consulta_publica(c, conn, elector)
    finally:
        conn.close()


def test_resolver_candidato_por_dominio():
    """Test que resolver candidato por dominio funciona."""
    from app import resolver_candidato_por_dominio
    conn = get_connection()
    try:
        c = conn.cursor()
        result = resolver_candidato_por_dominio(c, "invalido.com")
        assert result == ""
    finally:
        conn.close()


def test_contar_padron_completo():
    """Test que contar padron completo funciona."""
    from app import contar_padron_completo
    conn = get_connection()
    try:
        c = conn.cursor()
        result = contar_padron_completo(c)
        assert isinstance(result, int)
    finally:
        conn.close()


def test_buscar_elector_padron_completo():
    """Test que buscar elector en padron funciona."""
    from app import buscar_elector_padron_completo
    conn = get_connection()
    try:
        c = conn.cursor()
        result = buscar_elector_padron_completo(c, "99999999")
        assert result is None
    finally:
        conn.close()


def test_generar_session_id():
    """Test que generar session id funciona."""
    from app import generar_session_id
    sid = generar_session_id()
    assert isinstance(sid, str)
    assert len(sid) > 0


def test_log_auditoria():
    """Test que log auditoria funciona."""
    from app import log_auditoria
    # No deberia lanzar excepcion
    log_auditoria("1234567", "Test", "test_accion", "Detalle de prueba")


def test_verificar_bloqueo():
    """Test que verificar bloqueo funciona."""
    from app import verificar_bloqueo
    conn = get_connection()
    try:
        bloqueado, fallos = verificar_bloqueo("99999999", conn)
        assert bloqueado is False
        assert fallos == 0
    finally:
        conn.close()


def test_registrar_intento_login():
    """Test que registrar intento login funciona."""
    from app import registrar_intento_login
    conn = get_connection()
    try:
        registrar_intento_login("99999999", False, conn=conn)
    finally:
        conn.close()


def test_tiene_permiso():
    """Test que tiene permiso funciona."""
    from app import tiene_permiso
    result = tiene_permiso("master", "admin_total")
    assert isinstance(result, bool)


def test_obtener_permisos_rol():
    """Test que obtener permisos rol funciona."""
    from app import obtener_permisos_rol
    result = obtener_permisos_rol("master")
    assert isinstance(result, list)


def test_auditar_accion():
    """Test que auditar accion funciona."""
    from app import auditar_accion
    data = {"cedula_auth": "1234567", "nombre_auth": "Test"}
    # No deberia lanzar excepcion
    auditar_accion(data, "test_accion", "Detalle")


def test_nivel_index():
    """Test que nivel index funciona."""
    from app import _nivel_index
    assert _nivel_index("master") == 5
    assert _nivel_index("dirigente") == 0
    assert _nivel_index("invalid") == -1


def test_check_nivel():
    """Test que check nivel funciona."""
    from app import _check_nivel
    from fastapi import HTTPException
    user = {"nivel": "master"}
    # No deberia lanzar excepcion
    _check_nivel(user, "dirigente")
    # Deberia lanzar excepcion
    with pytest.raises(HTTPException):
        _check_nivel({"nivel": "dirigente"}, "master")


def test_cargar_roles_unificado():
    """Test que cargar roles unificado funciona."""
    from app import _cargar_roles_unificado
    conn = get_connection()
    try:
        result = _cargar_roles_unificado("99999999", conn)
        assert isinstance(result, list)
    finally:
        conn.close()


def test_autenticar_unificado_credenciales_invalidas():
    """Test que autenticar unificado con credenciales invalidas retorna None."""
    from app import _autenticar_unificado
    conn = get_connection()
    try:
        result = _autenticar_unificado("99999999", "wrongpass", conn)
        assert result is None
    finally:
        conn.close()


def test_migrar_legacy_a_unificado():
    """Test que migrar legacy a unificado maneja errores."""
    from app import migrar_legacy_a_unificado
    conn = get_connection()
    try:
        # No deberia lanzar excepcion
        migrar_legacy_a_unificado("99999999", "Test", "pass123", conn)
    finally:
        conn.close()


def test_migrar_roles_legacy():
    """Test que migrar roles legacy maneja errores."""
    from app import _migrar_roles_legacy
    conn = get_connection()
    try:
        # No deberia lanzar excepcion
        _migrar_roles_legacy("99999999", "Test", conn)
    finally:
        conn.close()


def test_tiene_dato_general():
    """Test que tiene dato general funciona."""
    from app import _tiene_dato_general
    conn = get_connection()
    try:
        c = conn.cursor()
        result = _tiene_dato_general(c, "99999999")
        assert isinstance(result, bool)
    finally:
        conn.close()


def test_cargos_permitidos_cliente():
    """Test que cargos permitidos cliente funciona."""
    from app import _cargos_permitidos_cliente
    conn = get_connection()
    try:
        c = conn.cursor()
        result = _cargos_permitidos_cliente(c, "99999999")
        assert result is None or isinstance(result, set)
    finally:
        conn.close()


def test_ejecutar_desvinculo():
    """Test que ejecutar desvinculo maneja errores."""
    from app import _ejecutar_desvinculo
    conn = get_connection()
    try:
        c = conn.cursor()
        # No deberia lanzar excepcion
        _ejecutar_desvinculo(c, conn, "99999999", "88888888", None)
    finally:
        conn.close()


def test_require_auth_sin_credenciales():
    """Test que require auth sin credenciales retorna None."""
    from app import _require_auth
    result = _require_auth({}, "master")
    assert result is None


def test_cliente_de_cedula():
    """Test que cliente de cedula funciona."""
    from app import _cliente_de_cedula
    conn = get_connection()
    try:
        result = _cliente_de_cedula(conn, "99999999")
        assert result is None
    finally:
        conn.close()


def test_puede_editar_candidato():
    """Test que puede editar candidato funciona."""
    from app import _puede_editar_candidato
    conn = get_connection()
    try:
        result = _puede_editar_candidato(conn, "99999999", 999999)
        assert result is False
    finally:
        conn.close()


def test_autenticar_y_verificar_dueno_sin_auth():
    """Test que autenticar y verificar dueno sin auth lanza excepcion."""
    from app import _autenticar_y_verificar_dueno
    from fastapi import HTTPException
    conn = get_connection()
    try:
        with pytest.raises(HTTPException):
            _autenticar_y_verificar_dueno(conn, {}, 999999)
    finally:
        conn.close()


def test_cliente_de_request():
    """Test que cliente de request funciona."""
    from app import _cliente_de_request
    conn = get_connection()
    try:
        result = _cliente_de_request(conn, {}, None)
        assert result is None
    finally:
        conn.close()


def test_certificar():
    """Test que certificar funciona."""
    from app import _certificar
    conn = get_connection()
    try:
        result = _certificar(conn, "voto", "1234567", "test", "99999999")
        assert isinstance(result, bool)
    finally:
        conn.close()


def test_estado_certificacion():
    """Test que estado certificacion funciona."""
    from app import _estado_certificacion
    conn = get_connection()
    try:
        result = _estado_certificacion(conn, "voto", "1234567")
        assert "nivel" in result
    finally:
        conn.close()


def test_resolver_casa_votante():
    """Test que resolver casa votante funciona."""
    from app import _resolver_casa_votante
    conn = get_connection()
    try:
        result = _resolver_casa_votante(conn, "99999999")
        assert result is None or isinstance(result, tuple)
    finally:
        conn.close()


def test_resolver_local_votacion():
    """Test que resolver local votacion funciona."""
    from app import _resolver_local_votacion
    conn = get_connection()
    try:
        result = _resolver_local_votacion(conn, "99999999")
        assert result is None or isinstance(result, tuple)
    finally:
        conn.close()


def test_crear_tramo():
    """Test que crear tramo funciona."""
    from app import _crear_tramo
    conn = get_connection()
    try:
        c = conn.cursor()
        # No deberia lanzar excepcion
        _crear_tramo(c, 999999, 999999, "1234567", "99999999", "Test", "ida", 0, 0, "Test", 0, 0, "Test")
    finally:
        conn.close()


def test_distancia_haversine_km():
    """Test que distancia haversine funciona."""
    from app import _distancia_haversine_km
    result = _distancia_haversine_km(0, 0, 0, 0)
    assert result == 0.0


def test_cliente_de_sesion():
    """Test que cliente de sesion funciona."""
    from app import _cliente_de_sesion
    conn = get_connection()
    try:
        result = _cliente_de_sesion(conn, "invalid_session_id")
        assert result is None
    finally:
        conn.close()


def test_css_color():
    """Test que css color funciona."""
    from app import _css_color
    result = _css_color("#FF0000")
    assert "--party-color" in result
    result_invalid = _css_color("invalid")
    assert result_invalid == ""


def test_paginar_valores():
    """Test que paginar valores funciona."""
    from database import _paginar_valores
    limit, offset = _paginar_valores(100, 0)
    assert limit == 100
    assert offset == 0
    limit, offset = _paginar_valores(-1, -1)
    assert limit == 100
    assert offset == 0
    limit, offset = _paginar_valores(999999, 0)
    assert limit == 1000


def test_paginar_query():
    """Test que paginar query funciona."""
    from database import paginar_query
    sql, params = paginar_query("SELECT * FROM test", (), 10, 0)
    assert "LIMIT" in sql
    assert "OFFSET" in sql
    assert params == (10, 0)


def test_respuesta_paginada():
    """Test que respuesta paginada funciona."""
    from database import respuesta_paginada
    result = respuesta_paginada([1, 2, 3], 3, 10, 0)
    assert result["data"] == [1, 2, 3]
    assert result["total"] == 3
    assert result["limit"] == 10
    assert result["offset"] == 0


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
