const fs = require('fs');

async function updateCourses() {
    const url = 'https://cones.gov.py/instituto-superior-en-ciencias-empresariales-y-administrativas-centuria/';
    const jsonPath = './public/cursos.json'; // We will store it in the public folder so the app can use it
    
    try {
        console.log(`Buscando cursos desde ${url}...`);
        const response = await fetch(url);
        const html = await response.text();
        
        // Buscamos todas las filas de la tabla de carreras.
        // Las filas tienen el formato:
        // <tr><td>Licenciatura en Administración de Empresas</td><td>Grado</td><td>Central/Asunción</td><td>...</td></tr>
        
        const courses = [];
        // Regex para atrapar los elementos de <tr> que contienen los cursos.
        const rowRegex = /<tr>\s*<td>(.*?)<\/td>\s*<td>(.*?)<\/td>\s*<td>(.*?)<\/td>/g;
        
        let match;
        while ((match = rowRegex.exec(html)) !== null) {
            const name = match[1].trim();
            const level = match[2].trim();
            const location = match[3].trim();
            
            // Verificamos si no es un encabezado
            if (name.toLowerCase() !== 'carrera/programa') {
                courses.push({
                    nombre: name,
                    nivel: level,
                    sede: location
                });
            }
        }
        
        if (courses.length === 0) {
            console.log("No se encontraron cursos en la página web.");
            return;
        }

        console.log(`Se encontraron ${courses.length} cursos en la web.`);

        // Leemos el archivo JSON existente, si lo hay
        let existingCourses = [];
        if (fs.existsSync(jsonPath)) {
            try {
                existingCourses = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
            } catch(e) {
                console.error("Error leyendo el JSON, se creará uno nuevo.", e);
            }
        }
        
        let addedCount = 0;
        
        for (const course of courses) {
            // Verificar si el curso ya existe en la lista (coincidiendo en nombre, nivel y sede)
            const exists = existingCourses.some(c => 
                c.nombre === course.nombre && 
                c.nivel === course.nivel && 
                c.sede === course.sede
            );
            
            if (!exists) {
                existingCourses.push(course);
                addedCount++;
            }
        }
        
        if (addedCount > 0) {
            fs.writeFileSync(jsonPath, JSON.stringify(existingCourses, null, 4), 'utf8');
            console.log(`Se han agregado ${addedCount} nuevos cursos a ${jsonPath}. Total de cursos: ${existingCourses.length}`);
        } else {
            console.log(`No se encontraron cursos nuevos. El archivo ${jsonPath} ya está actualizado con ${existingCourses.length} cursos.`);
        }
        
    } catch (err) {
        console.error('Error durante la actualización de cursos:', err);
    }
}

updateCourses();
