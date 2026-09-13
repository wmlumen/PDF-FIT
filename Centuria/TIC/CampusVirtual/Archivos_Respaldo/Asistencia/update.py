import sys

try:
    with open('public/planificacion.html', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Add IC026 to secciones
    if "'06-VL026'" in content and "'07-IC026'" not in content:
        content = content.replace("'06-VL026')", "'06-VL026', '07-IC026')")

    # 2. Add dynamic population to cargarCatalogosDinamicos
    target_catalogos = """            // Llenar selects
            llenarSelect('planif-asignatura', asignaturas);"""
    
    replacement_catalogos = """            const planifs = window.planificacionesMemoria || [];
            planifs.forEach(p => {
                const asig = p.COD_ASIGNATURA || p.codAsignatura;
                const sec = p.COD_SECCION || p.codSeccion;
                const car = p.COD_CARRERA || p.codCarrera;
                if (asig && !asignaturas.includes(asig)) asignaturas.push(asig);
                if (sec && !secciones.includes(sec)) secciones.push(sec);
                if (car && !carreras.includes(car)) carreras.push(car);
            });
            // Llenar selects
            llenarSelect('planif-asignatura', asignaturas);"""
    content = content.replace(target_catalogos, replacement_catalogos)

    # 3. Add btn-clone button in table
    target_btn = "html += '<button class=\"btn-small btn-edit\" onclick=\"editarPlanif(' + index + ')\" title=\"Editar\"><i class=\"fas fa-edit\"></i></button>';"
    replacement_btn = target_btn + "\n                html += '<button class=\"btn-small btn-clone\" onclick=\"clonarPlanif(' + index + ')\" title=\"Duplicar Planificaci&oacute;n\" style=\"background: #17a2b8; color: white;\"><i class=\"fas fa-clone\"></i></button>';"
    content = content.replace(target_btn, replacement_btn)

    # 4. Add clonarPlanif function
    target_func = "function eliminarPlanif(index) {"
    replacement_func = """window.clonarPlanif = function(index) {
            const planificaciones = window.planificacionesMemoria || [];
            if (index < 0 || index >= planificaciones.length) return;
            
            const p = planificaciones[index];
            
            document.getElementById('planif-cedula').value = p.Cedula || p.cedula || '';
            document.getElementById('planif-nombre').value = p['Nombre y Apellido'] || p.nombre || '';
            document.getElementById('planif-asignatura').value = p.COD_ASIGNATURA || p.codAsignatura || '';
            document.getElementById('planif-seccion').value = p.COD_SECCION || p.codSeccion || '';
            document.getElementById('planif-carrera').value = p.COD_CARRERA || p.codCarrera || '';
            document.getElementById('planif-fecha-inicio').value = p['Fecha de Inicio'] || p.fechaInicio || '';
            document.getElementById('planif-fecha-cierre').value = p['Fecha de Cierre'] || p.fechaCierre || '';
            document.getElementById('planif-sala').value = p.SALA || p.sala || '';
            document.getElementById('planif-sede').value = p.SEDE || p.sede || '';
            document.getElementById('planif-modalidad').value = p.Modalidad || p.modalidad || 'Presencial';
            document.getElementById('planif-observaciones').value = p.Observaciones || p.observaciones || '';
            
            planifEditandoCodigo = null;
            document.getElementById('form-titulo').textContent = 'Nueva Planificaci&oacute;n (Copia)';
            document.getElementById('btn-guardar').innerHTML = '<i class=\"fas fa-save\"></i> Guardar Nueva Planificaci&oacute;n';
            document.getElementById('btn-cancelar').style.display = 'inline-block';
            
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        function eliminarPlanif(index) {"""
    content = content.replace(target_func, replacement_func)

    with open('public/planificacion.html', 'w', encoding='utf-8') as f:
        f.write(content)
    print('SUCCESS')
except Exception as e:
    print('ERROR:', e)
