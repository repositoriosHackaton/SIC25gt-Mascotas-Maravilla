/* admin-script.js */

 async function sobreescribirArchivo() {
    try {
        // Mostrar diálogo para que el usuario elija el archivo a sobrescribir
        const fileHandle = await window.showSaveFilePicker({
            suggestedName: "knowledge.pl",
            types: [{ accept: { "text/plain": [".pl"] } }]
        });

        // Crear acceso al archivo y escribir el contenido
        const writable = await fileHandle.createWritable();
        await writable.write(document.getElementById("knowledge-content").value);
        await writable.close();

        alert("Archivo knowledge.pl sobrescrito correctamente.");
    } catch (error) {
        console.error("Error al guardar el archivo:", error);
    }
}


document.addEventListener("DOMContentLoaded", function() {
    // Inicializar Tau-Prolog
    let session = pl.create();
    let knowledgeBase = "";

    // Variables para edición
    let isEditingCareer = false;
    let currentEditingCareer = null;
    let contentBeforeEdit = "";

    // Variables para manejo de aptitudes y habilidades
    let aptitudesMap = new Map();
    let habilidadesMap = new Map();

    // Función para cargar el archivo de conocimientos 
    function loadKnowledgeBase() {
        return new Promise((resolve, reject) => {
            fetch('knowledge.pl')
                .then(response => response.text())
                .then(text => {
                    knowledgeBase = text;
                    session.consult(knowledgeBase, {
                        success: function() {
                            console.log("Base de conocimientos cargada correctamente.");
                            resolve(text);
                        },
                        error: function(err) {
                            console.error("Error al cargar la base de conocimientos:", err);
                            reject(err);
                        }
                    });
                })
                .catch(err => {
                    console.error("Error al cargar el archivo knowledge.pl:", err);
                    reject(err);
                });
        });
    }

    // Ejecutar consulta en Tau Prolog
    function runQuery(query) {
        return new Promise((resolve, reject) => {
            session.query(query, {
                success: function(goal) {
                    session.answer({
                        success: function(answer) {
                            resolve(answer);
                        },
                        error: function(err) {
                            reject(err);
                        },
                        fail: function() {
                            resolve(false);
                        }
                    });
                },
                error: function(err) {
                    reject(err);
                }
            });
        });
    }

    // Manejo de inicio de sesión
    const loginForm = document.getElementById("login-form");
    if(loginForm) {
        loginForm.addEventListener("submit", function(e) {
            e.preventDefault();
            const username = document.getElementById("username").value;
            const password = document.getElementById("password").value;
            
            // En un sistema real, esto debería validarse con seguridad
            if(username === "admin" && password === "admin") {
                document.getElementById("login-section").style.display = "none";
                document.getElementById("admin-panel").style.display = "block";
                
                // Cargar contenido de la base de conocimiento
                loadKnowledgeBase()
                    .then(content => {
                        document.getElementById("knowledge-content").value = content;
                        // Cargar datos existentes para la interfaz
                        loadCareersList();
                        loadCoursesList();
                        loadFacultades(); // Añadimos esta línea
                        loadCareerInterests();
                        loadAptitudesHabilidades(); // Añadimos esta línea
                    })
                    .catch(error => {
                        alert("Error al cargar la base de conocimientos: " + error);
                    });
                    
            } else {
                alert("Credenciales incorrectas. Intente de nuevo.");
            }
        });
    }

    // Manejo de pestañas
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    if(tabButtons && tabButtons.length > 0) {
        tabButtons.forEach(button => {
            button.addEventListener('click', function() {
                const tabId = this.getAttribute('data-tab');
                
                // Desactivar todas las pestañas y activar la seleccionada
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));
                
                this.classList.add('active');
                document.getElementById(`${tabId}-tab`).classList.add('active');
            });
        });
    }

    // Guardar cambios en la base de conocimientos
    const saveButton = document.getElementById("save-knowledge");
    if(saveButton) {
        saveButton.addEventListener("click", function() {
            const newContent = document.getElementById("knowledge-content").value;
            
            // Reiniciar la sesión de Prolog con el nuevo contenido
            session = pl.create();
            session.consult(newContent, {
                success: function() {
                    // Guardar en localStorage para compartir con el módulo de estudiantes
                    localStorage.setItem('knowledgeBase', newContent);
                    
                    alert("Base de conocimientos actualizada correctamente.");
                    knowledgeBase = newContent;
                    
                    // Para actualizar la UI después de guardar cambios
                    loadCareersList();
                    loadCoursesList();
                    sobreescribirArchivo();
                },
                error: function(err) {
                    alert("Error en la base de conocimientos: " + err);
                }
            });
        });
    }

    // Descargar base de conocimientos
    const downloadButton = document.getElementById("download-knowledge");
    if(downloadButton) {
        downloadButton.addEventListener("click", function() {
            const content = document.getElementById("knowledge-content").value;
            const blob = new Blob([content], { type: 'text/plain' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = "knowledge.pl";
            a.click();
        });
    }

    // Validar sintaxis de la base de conocimientos
    const validateButton = document.getElementById("validate-knowledge");
    if(validateButton) {
        validateButton.addEventListener("click", function() {
            const content = document.getElementById("knowledge-content").value;
            const tempSession = pl.create();
            
            tempSession.consult(content, {
                success: function() {
                    alert("La sintaxis de la base de conocimientos es válida.");
                },
                error: function(err) {
                    alert("Error de sintaxis: " + err);
                }
            });
        });
    }

    // Función para extraer carreras de la base de conocimientos
    function loadCareersList() {
        const careersList = document.getElementById("careers-list");
        if(!careersList) return;

        runQuery("findall(C-F, (carrera(C), pertenece(C, F)), Carreras).")
            .then(answer => {
                if(!answer) {
                    console.log("No se encontraron carreras");
                    careersList.innerHTML = "<p>No hay carreras definidas en la base de conocimientos.</p>";
                    return;
                }
                
                careersList.innerHTML = "";
                
                let careers = [];
                let lista = answer.links.Carreras;
                
                // Extraer todas las carreras
                while(lista && lista.indicator === "./2") {
                    if(lista.args[0] && lista.args[0].indicator === "-/2") {
                        let carrera = lista.args[0].args[0].id;
                        let facultad = lista.args[0].args[1].id;
                        careers.push({ id: carrera, facultad: facultad });
                    }
                    lista = lista.args[1];
                }
                
                careers.forEach(career => {
                    const careerDiv = document.createElement("div");
                    careerDiv.className = "career-item";
                    careerDiv.innerHTML = `
                        <h5>${career.id.replace(/_/g, ' ')}</h5>
                        <p>Facultad: ${career.facultad}</p>
                        <div class="career-actions">
                            <button class="btn-small edit-career" data-id="${career.id}">Editar</button>
                            <button class="btn-small delete-career" data-id="${career.id}">Eliminar</button>
                        </div>
                    `;
                    careersList.appendChild(careerDiv);
                });
                
                // Añadir eventos a los botones
                document.querySelectorAll('.edit-career').forEach(btn => {
                    btn.addEventListener('click', function() {
                        const careerId = this.getAttribute('data-id');
                        loadCareerDetails(careerId);
                    });
                });
                
                document.querySelectorAll('.delete-career').forEach(btn => {
                    btn.addEventListener('click', function() {
                        const careerId = this.getAttribute('data-id');
                        if(confirm(`¿Está seguro de eliminar la carrera ${careerId.replace(/_/g, ' ')}?`)) {
                            deleteCareer(careerId);
                        }
                    });
                });
            })
            .catch(err => {
                console.error("Error al cargar las carreras:", err);
                careersList.innerHTML = `<p class="error">Error al cargar las carreras: ${err}</p>`;
            });
    }

    // Función para cargar detalles de una carrera y llenar el formulario
    function loadCareerDetails(careerId) {
        // Guardamos una copia del contenido actual para poder revertir cambios si es necesario
        contentBeforeEdit = document.getElementById("knowledge-content").value;
        
        // Marcar que estamos en modo de edición
        isEditingCareer = true;
        currentEditingCareer = careerId;
        
        // Cambiar el título y botón del formulario
        document.querySelector('#add-career-form h4').textContent = "Editar Carrera";
        document.querySelector('#add-career-form button[type="submit"]').textContent = "Actualizar Carrera";
        
        // Consultar los datos de la carrera
        Promise.all([
            runQuery(`perfil(${careerId}, Perfil).`),
            runQuery(`intereses(${careerId}, Intereses).`),
            runQuery(`preferencias(${careerId}, Preferencias).`),
            runQuery(`pertenece(${careerId}, Facultad).`)
        ]).then(([perfilAnswer, interesesAnswer, preferenciasAnswer, facultadAnswer]) => {
            if(perfilAnswer && facultadAnswer) {
                // Llenar ID de la carrera y facultad
                document.getElementById("career-id").value = careerId;
                document.getElementById("career-id").disabled = true; // No permitir cambiar el ID en edición
                document.getElementById("career-faculty").value = facultadAnswer.links.Facultad.id;
                
                // Limpiar todos los checkboxes primero
                document.querySelectorAll("input[name='career-aptitud']").forEach(cb => cb.checked = false);
                document.querySelectorAll("input[name='career-habilidad']").forEach(cb => cb.checked = false);
                document.querySelectorAll("input[name='career-interes']").forEach(cb => cb.checked = false);
                
                // Extraer y seleccionar las aptitudes
                let aptitudesArray = extractListFromTerm(perfilAnswer.links.Perfil);
                aptitudesArray.forEach(aptitud => {
                    const checkbox = document.querySelector(`input[name='career-aptitud'][value='${aptitud}']`);
                    if(checkbox) checkbox.checked = true;
                });

                // Extraer y seleccionar las habilidades

                let habilidadesArray = extractListFromTerm(perfilAnswer.links.Perfil);
                habilidadesArray.forEach(habilidad => {
                    const checkbox = document.querySelector(`input[name='career-habilidad'][value='${habilidad}']`);
                    if(checkbox) checkbox.checked = true;
                });
                
                // Extraer y seleccionar los intereses
                if(interesesAnswer) {
                    let interesesArray = extractListFromTerm(interesesAnswer.links.Intereses);
                    interesesArray.forEach(interes => {
                        const checkbox = document.querySelector(`input[name='career-interes'][value='${interes}']`);
                        if(checkbox) checkbox.checked = true;
                    });
                }

                // Desplazarse hasta el formulario para editar
                document.getElementById("add-career-form").scrollIntoView({ behavior: 'smooth' });
            } else {
                alert("No se pudieron cargar los detalles de la carrera.");
            }
        }).catch(err => {
            console.error("Error al cargar los detalles de la carrera:", err);
            alert("Error al cargar los detalles: " + err);
        });
    }

    // Extraer lista de un término Prolog
    function extractListFromTerm(term) {
        let result = [];
        let lista = term;
        
        while(lista && lista.indicator === "./2") {
            if (lista.args[0]) {
                result.push(lista.args[0].id);
            }
            lista = lista.args[1];
        }
        
        return result;
    }

    // Función para eliminar una carrera
    function deleteCareer(careerId) {
        // Obtenemos el contenido actual de knowledge.pl
        let contentLines = document.getElementById("knowledge-content").value.split('\n');
        let newContent = [];
        
        // Patrones a eliminar
        const patrones = [
            new RegExp(`carrera\\(${careerId}\\)\\.`),
            new RegExp(`pertenece\\(${careerId}, [^)]+\\)\\.`),
            new RegExp(`perfil\\(${careerId}, [^)]+\\)\\.`),
            new RegExp(`intereses\\(${careerId}, [^)]+\\)\\.`),
            new RegExp(`preferencias\\(${careerId}, [^)]+\\)\\.`)
        ];
        
        // Filtramos las líneas que no contienen la carrera a eliminar
        for(let i = 0; i < contentLines.length; i++) {
            let line = contentLines[i].trim();
            let mantenerLinea = true;
            
            for(let j = 0; j < patrones.length; j++) {
                if(patrones[j].test(line)) {
                    mantenerLinea = false;
                    break;
                }
            }
            
            if(mantenerLinea) {
                newContent.push(contentLines[i]);
            }
        }
        
        // Actualizamos el contenido
        document.getElementById("knowledge-content").value = newContent.join('\n');
        
        // Reiniciar la sesión de Prolog con el nuevo contenido
        session = pl.create();
        session.consult(newContent.join('\n'), {
            success: function() {
                alert("Carrera eliminada correctamente.");
                loadCareersList();
            },
            error: function(err) {
                alert("Error al eliminar la carrera: " + err);
            }
        });
    }

    // Función para editar una carrera (simulada)
    function editCareer(careerId) {
        alert(`Función de edición para carrera ${careerId}. En una implementación completa, esto llenaría el formulario con los datos de la carrera para editarlos.`);
    }

    // Manejo del formulario para agregar o actualizar carrera
    const addCareerForm = document.getElementById("add-career-form");
    if(addCareerForm) {
        // Botón para cancelar edición
        const cancelButton = document.createElement('button');
        cancelButton.type = 'button';
        cancelButton.className = 'btn-secondary';
        cancelButton.textContent = 'Cancelar';
        cancelButton.style.display = 'none';
        cancelButton.addEventListener('click', function() {
            resetCareerForm();
            if(isEditingCareer) {
                document.getElementById("knowledge-content").value = contentBeforeEdit;
            }
        });
        
        // Verificar si el contenedor del botón existe antes de intentar añadirlo
        const buttonContainer = document.querySelector('#add-career-form .button-container');
        if (buttonContainer) {
            buttonContainer.appendChild(cancelButton);
        }
        
        addCareerForm.addEventListener("submit", function(e) {
            e.preventDefault();
            
            // Recoger datos del formulario
            const careerId = document.getElementById("career-id").value;
            const facultyId = document.getElementById("career-faculty").value;
            
            // Verificar formato del ID (sin espacios, solo letras minúsculas, números y guiones bajos)
            if(!isEditingCareer && !/^[a-z0-9_]+$/.test(careerId)) {
                alert("El ID de la carrera solo puede contener letras minúsculas, números y guiones bajos sin espacios.");
                return;
            }

            // Verificar que la facultad existe o añadirla
            runQuery(`facultad(${facultyId}).`).then(answer => {
                const facultyExists = !!answer;
                
                // Recoger aptitudes seleccionadas
                const aptitudes = [];
                document.querySelectorAll("input[name='career-aptitud']:checked").forEach(cb => {
                    aptitudes.push(cb.value);
                });
                
                const habilidades = []
                document.querySelectorAll("input[name='career-habilidad']:checked").forEach(cb => {
                    habilidades.push(cb.value);
                });
                // Recoger intereses seleccionados
                const intereses = [];
                document.querySelectorAll("input[name='career-interes']:checked").forEach(cb => {
                    intereses.push(cb.value);
                });
                
                // Verificar datos mínimos
                if(!careerId || !facultyId || aptitudes.length === 0 || intereses.length === 0) {
                    alert("Por favor complete todos los campos y seleccione al menos una aptitud e interés.");
                    return;
                }
                
                // Obtenemos el contenido actual
                let content = document.getElementById("knowledge-content").value;
                
                // Si estamos editando, eliminamos la carrera actual primero
                if(isEditingCareer && currentEditingCareer) {
                    deleteCareer(currentEditingCareer);
                    content = document.getElementById("knowledge-content").value;
                }
                
                // Generar código Prolog para la nueva carrera o actualización
                let nuevasLineas = [];
                if (!facultyExists) {
                    nuevasLineas.push(`facultad(${facultyId}).`);
                }
                
                // Formato correcto de las listas en Prolog
                nuevasLineas = nuevasLineas.concat([
                    `carrera(${careerId}).`,
                    `pertenece(${careerId}, ${facultyId}).`,
                    `perfil(${careerId}, aptitudes([${aptitudes.map(a => `'${a}'`).join(', ')}]), habilidades([${habilidades.map(h => `'${h}'`).join(', ')}])).`,
                    `intereses(${careerId}, [${intereses.map(i => `'${i}'`).join(', ')}]).`,
                    `preferencias(${careerId}, [${aptitudes.slice(0, 4).map(a => `'${a}'`).join(', ')}]).` // Usamos algunas aptitudes como preferencias para simplificar
                ]);
                
                
                // Añadir al contenido en las secciones correctas
                const secciones = {
                    facultad: "% Facultades",
                    carrera: "% Carreras",
                    pertenece: "% Relación entre carreras y facultades",
                    perfil: "% Perfiles: aptitudes[], habilidades[]",
                    intereses: "% Intereses relacionados con carreras",
                    preferencias: "% Preferencias relacionadas con carreras"
                };
                
                let contentLines = content.split('\n');
                
                // Para cada tipo de declaración, añadirla después de la sección correspondiente
                for(let i = 0; i < nuevasLineas.length; i++) {
                    const linea = nuevasLineas[i];
                    const tipo = linea.split('(')[0];
                    
                    if(secciones[tipo]) {
                        let seccionEncontrada = false;
                        
                        // Buscar la sección correspondiente
                        for(let j = 0; j < contentLines.length; j++) {
                            if(contentLines[j].includes(secciones[tipo])) {
                                seccionEncontrada = true;
                                // Buscar el final de esa sección (la última línea de declaración)
                                let k = j + 1;
                                while(k < contentLines.length && contentLines[k].trim().startsWith(tipo + "(")) {
                                    k++;
                                }
                                // Insertar la nueva línea
                                contentLines.splice(k, 0, linea);
                                break;
                            }
                        }
                        
                        // Si no se encontró la sección, añadir la sección y la nueva línea al final
                        if (!seccionEncontrada) {
                            contentLines.push('');
                            contentLines.push(secciones[tipo]);
                            contentLines.push(linea);
                        }
                    }
                }
                
                // Actualizar el contenido
                const nuevoContenido = contentLines.join('\n');
                document.getElementById("knowledge-content").value = nuevoContenido;
                
                // Reiniciar la sesión de Prolog con el nuevo contenido
                session = pl.create();
                session.consult(nuevoContenido, {
                    success: function() {
                        alert(isEditingCareer ? "Carrera actualizada correctamente." : "Carrera agregada correctamente.");
                        resetCareerForm();
                        loadCareersList();
                        loadFacultades(); // Actualizamos la lista de facultades si se añadió una nueva
                    },
                    error: function(err) {
                        alert("Error2: " + err);
                    }
                });
            }).catch(err => {
                alert("Error al procesar la solicitud: " + err);
            });
        });
    }
    
    // Función para resetear el formulario de carrera
    function resetCareerForm() {
        const form = document.getElementById("add-career-form");
        if(form) {
            form.reset();
            
            const idField = document.getElementById("career-id");
            if (idField) idField.disabled = false;
            
            const formTitle = document.querySelector('#add-career-form h4');
            if (formTitle) formTitle.textContent = "Agregar Nueva Carrera";
            
            const submitBtn = document.querySelector('#add-career-form button[type="submit"]');
            if (submitBtn) submitBtn.textContent = "Agregar Carrera";
            
            const cancelBtn = document.querySelector('#add-career-form .btn-secondary');
            if (cancelBtn) cancelBtn.style.display = 'none';
            
            isEditingCareer = false;
            currentEditingCareer = null;
        }
    }

    // Función para extraer cursos (similar a carreras)
    function loadCoursesList() {
        const coursesList = document.getElementById("courses-list");
        if(!coursesList) return;

        runQuery("findall(C, curso(C, _), Cursos).")
            .then(answer => {
                if(!answer) {
                    console.log("No se encontraron cursos");
                    coursesList.innerHTML = "<p>No hay cursos definidos en la base de conocimientos.</p>";
                    return;
                }
                
                coursesList.innerHTML = "";
                
                let courses = [];
                let lista = answer.links.Cursos;
                
                // Extraer todos los cursos
                while(lista && lista.indicator === "./2") {
                    if(lista.args[0]) {
                        courses.push({ id: lista.args[0].id });
                    }
                    lista = lista.args[1];
                }
                
                courses.forEach(course => {
                    const courseDiv = document.createElement("div");
                    courseDiv.className = "course-item";
                    courseDiv.innerHTML = `
                        <h5>${course.id}</h5>
                        <div class="course-actions">
                            <button class="btn-small view-course" data-id="${course.id}">Ver Secciones</button>
                            <button class="btn-small delete-course" data-id="${course.id}">Eliminar</button>
                        </div>
                    `;
                    coursesList.appendChild(courseDiv);
                });
                
                // Añadir eventos a los botones de edición y eliminación
                document.querySelectorAll('.view-course').forEach(btn => {
                    btn.addEventListener('click', function() {
                        const courseId = this.getAttribute('data-id');
                        loadCourseDetails(courseId);
                    });
                });
                
                document.querySelectorAll('.delete-course').forEach(btn => {
                    btn.addEventListener('click', function() {
                        const courseId = this.getAttribute('data-id');
                        if(confirm(`¿Está seguro de eliminar el curso ${courseId}?`)) {
                            deleteCourse(courseId);
                        }
                    });
                });
            })
            .catch(err => {
                console.error("Error al cargar los cursos:", err);
                coursesList.innerHTML = `<p class="error">Error al cargar los cursos: ${err}</p>`;
            });
    }

    // Función para cargar detalles de un curso
    function loadCourseDetails(courseId) {
        runQuery(`curso(${courseId}, Secciones).`)
            .then(answer => {
                console.log("Respuesta completa:", answer); // Para depuración
                
                // Verificamos si existe el campo 'Secciones' en la respuesta
                if (!answer || !answer.links || !answer.links.Secciones) {
                    alert("No se encontraron secciones para el curso.");
                    return;
                }
    
                function processSections(sections) {
                    let result = [];
                    sections.forEach(seccionTerm => {
                        if (seccionTerm.id === "seccion" && Array.isArray(seccionTerm.args) && seccionTerm.args.length === 2) {
                            const seccionID = seccionTerm.args[0].id;   
                            const horario = seccionTerm.args[1].id;     
                            result.push(`${seccionID}: ${horario}`);
                        }
                        
                        if (Array.isArray(seccionTerm.args)) {
                            result = result.concat(processSections(seccionTerm.args)); 
                        }
                    });
                    return result;
                }
    
                let secciones = processSections(answer.links.Secciones.args);
    
                if (secciones.length > 0) {
                    alert(`Secciones del curso ${courseId}:\n${secciones.join('\n')}`);
                } else {
                    alert("No se encontraron secciones para el curso.");
                }
            })
            .catch(err => {
                console.error("Error al cargar las secciones del curso:", err);
                alert("Error al cargar las secciones del curso: " + err);
            });
    }
    

    
    
    function deleteCourse(cursoId) {
        const contentLines = document.getElementById("knowledge-content").value.split('\n');
        let newContent = [];
        let modified = false;

        const cursosRegex = /curso\(\w+, \[(.*?)\]\)/;

        for (let line of contentLines) {
            if (cursosRegex.test(line)) {
                if (!line.includes(cursoId)) {
                    newContent.push(line);
                } else {
                    modified = true; 
                }
            } else {
                newContent.push(line); 
            }
        }

        if (modified) {
            document.getElementById("knowledge-content").value = newContent.join('\n');

            session = pl.create();
            session.consult(newContent.join('\n'), {
                success: function () {
                    alert(`${cursoId.replace(/_/g, ' ')} eliminado correctamente.`);
                    // loadCursos();
                    loadCoursesList();
                },
                error: function (err) {
                    alert("Error al actualizar la base de conocimientos: " + err);
                }
            });

            let studentCursos = JSON.parse(localStorage.getItem('studentCursos') || '[]');
            studentCursos = studentCursos.filter(item => item.id !== cursoId);
            localStorage.setItem('studentCursos', JSON.stringify(studentCursos));
        } else {
            alert("No se encontró el curso en ningún perfil.");
        }
    }

    if(addCareerForm) {
        addCareerForm.addEventListener("submit", function(e) {
            e.preventDefault();
            
            const careerId = document.getElementById("career-id").value;
            const facultyId = document.getElementById("career-faculty").value;
            
            const aptitudes = [];
            document.querySelectorAll("input[name='career-aptitud']:checked").forEach(cb => {
                aptitudes.push(cb.value);
            });
            
            const intereses = [];
            document.querySelectorAll("input[name='career-interes']:checked").forEach(cb => {
                intereses.push(cb.value);
            });

            const habilidades = [];
            document.querySelectorAll("input[name='career-habilidad']:checked").forEach(cb => {
                habilidades.push(cb.value);
            });
            
            if(!careerId || !facultyId || aptitudes.length === 0 || intereses.length === 0|| habilidades.length === 0) {
                alert("Por favor complete todos los campos y seleccione al menos una aptitud e interés.");
                return;
            }
            
            alert(`La funcionalidad de agregar carrera está en desarrollo.\nCarrera: ${careerId}\nFacultad: ${facultyId}\nAptitudes: ${aptitudes}\nIntereses: ${intereses}`);
        });
    }
    
    const addCourseForm = document.getElementById("add-course-form");
    if(addCourseForm) {
        document.getElementById("add-section").addEventListener("click", function() {
            const container = document.getElementById("sections-container");
            const newSection = document.createElement("div");
            newSection.className = "section-entry";
            newSection.innerHTML = `
                <div class="form-row">
                    <div class="input-group">
                        <label>Sección:</label>
                        <input type="text" name="section-id" required placeholder="Ej: a">
                    </div>
                    <div class="input-group">
                        <label>Horario:</label>
                        <input type="text" name="section-time" required placeholder="Ej: Lunes 8:00-10:00">
                    </div>
                    <button type="button" class="btn-small remove-section">X</button>
                </div>
            `;
            container.appendChild(newSection);
            
            // Añadir evento al botón de eliminar sección
            newSection.querySelector(".remove-section").addEventListener("click", function() {
                container.removeChild(newSection);
            });
        });
        
        // Evento inicial para el primer botón de eliminar sección
        document.querySelector(".remove-section").addEventListener("click", function() {
            // No eliminar si es la única sección
            if(document.querySelectorAll(".section-entry").length > 1) {
                this.closest(".section-entry").remove();
            } else {
                alert("Debe haber al menos una sección");
            }
        });
        
        // Enviar formulario de curso
        addCourseForm.addEventListener("submit", function(e) {
            e.preventDefault();
            
            const courseId = document.getElementById("course-id").value;
            
            // Recoger secciones
            const sections = [];
            document.querySelectorAll(".section-entry").forEach(section => {
                const sectionId = section.querySelector("[name='section-id']").value;
                const sectionTime = section.querySelector("[name='section-time']").value;
                
                if(sectionId && sectionTime) {
                    sections.push({ id: sectionId, time: sectionTime });
                }
            });
            
            // Verificar datos mínimos
            if(!courseId || sections.length === 0) {
                alert("Por favor complete todos los campos.");
                return;
            }
            
            // Aquí se implementaría la lógica para agregar el curso a la base de conocimientos
            alert(`La funcionalidad de agregar curso está en desarrollo.`);
            // \nCurso: ${courseId}\nSecciones: ${JSON.stringify(sections)}
        });
    }

    // Cargar facultades existentes para autocompletar
    function loadFacultades() {
        runQuery("findall(F, facultad(F), Facultades).")
            .then(answer => {
                if(!answer) {
                    console.log("No se encontraron facultades");
                    return;
                }
                
                let facultades = [];
                let lista = answer.links.Facultades;
                
                // Extraer todas las facultades
                while(lista && lista.indicator === "./2") {
                    if(lista.args[0]) {
                        facultades.push(lista.args[0].id);
                    }
                    lista = lista.args[1];
                }
                
                // Eliminar datalist anterior si existe
                const oldDatalist = document.getElementById('facultades-list');
                if (oldDatalist) {
                    oldDatalist.remove();
                }
                
                // Crear el datalist para autocompletar
                const datalist = document.createElement('datalist');
                datalist.id = 'facultades-list';
                
                facultades.forEach(facultad => {
                    const option = document.createElement('option');
                    option.value = facultad;
                    datalist.appendChild(option);
                });
                
                document.body.appendChild(datalist);
                
                const facultyInput = document.getElementById('career-faculty');
                if (facultyInput) {
                    facultyInput.setAttribute('list', 'facultades-list');
                }
            })
            .catch(err => {
                console.error("Error al cargar las facultades:", err);
            });
    }

    // Manejo de carga de archivo de conocimiento
    const uploadKnowledge = document.getElementById("upload-knowledge");
    const browseKnowledge = document.getElementById("browse-knowledge");
    
    if(browseKnowledge && uploadKnowledge) {
        browseKnowledge.addEventListener("click", function() {
            uploadKnowledge.click();
        });
        
        uploadKnowledge.addEventListener("change", function() {
            if(this.files && this.files[0]) {
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    const content = e.target.result;
                    
                    // Verificar si el contenido tiene formato válido de Prolog
                    const tempSession = pl.create();
                    tempSession.consult(content, {
                        success: function() {
                            document.getElementById("knowledge-content").value = content;
                            
                            // Actualizar la sesión actual con el nuevo contenido
                            session = pl.create();
                            session.consult(content, {
                                success: function() {
                                    // Guardar en localStorage para compartir con el módulo de estudiantes
                                    localStorage.setItem('knowledgeBase', content);
                                    
                                    alert("Archivo cargado correctamente. La base de conocimientos ha sido actualizada.");
                                    loadCareersList();
                                    loadCoursesList();
                                    loadFacultades();
                                },
                                error: function(err) {
                                    alert("El archivo se cargó, pero hay errores en la sintaxis: " + err);
                                }
                            });
                        },
                        error: function(err) {
                            alert("Error al cargar el archivo: " + err);
                        }
                    });
                };
                
                reader.onerror = function() {
                    alert("No se pudo leer el archivo");
                };
                
                reader.readAsText(this.files[0]);
            }
        });
    }

    // También añadamos funcionalidad para cargar archivos específicos en las otras pestañas
    
    // Botón para importar carreras desde archivo .pl
    const importCarreras = document.createElement('button');
    importCarreras.className = 'btn-secondary';
    importCarreras.textContent = 'Importar Carreras';
    importCarreras.style.marginBottom = '20px';
    importCarreras.addEventListener('click', function() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pl';
        
        input.onchange = function() {
            if(this.files && this.files[0]) {
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    const content = e.target.result;
                    
                    // Extraer las definiciones de carreras del archivo
                    const lines = content.split('\n');
                    let currentContent = document.getElementById("knowledge-content").value;
                    let updatedContent = currentContent;
                    
                    // Buscar definiciones de carreras y agregarlas
                    const carreraRegex = /carrera\(([a-z_0-9]+)\)\./g;
                    const perteneceRegex = /pertenece\(([a-z_0-9]+),\s*([a-z_0-9]+)\)\./g;
                    const perfilRegex = /perfil\(([a-z_0-9]+),\s*\[(.*?)\]\)\./g;
                    const interesesRegex = /intereses\(([a-z_0-9]+),\s*\[(.*?)\]\)\./g;
                    const preferenciasRegex = /preferencias\(([a-z_0-9]+),\s*\[(.*?)\]\)\./g;
                    
                    // Obtener todas las carreras del archivo
                    let matches = [];
                    let match;
                    
                    // Buscar carreras
                    while((match = carreraRegex.exec(content)) !== null) {
                        matches.push({
                            type: 'carrera',
                            id: match[1],
                            line: match[0]
                        });
                    }
                    
                    // Buscar relaciones pertenece
                    while((match = perteneceRegex.exec(content)) !== null) {
                        matches.push({
                            type: 'pertenece',
                            id: match[1],
                            facultad: match[2],
                            line: match[0]
                        });
                    }
                    
                    // Buscar perfiles
                    while((match = perfilRegex.exec(content)) !== null) {
                        matches.push({
                            type: 'perfil',
                            id: match[1],
                            perfil: match[2],
                            line: match[0]
                        });
                    }
                    
                    // Buscar intereses
                    while((match = interesesRegex.exec(content)) !== null) {
                        matches.push({
                            type: 'intereses',
                            id: match[1],
                            intereses: match[2],
                            line: match[0]
                        });
                    }
                    
                    // Buscar preferencias
                    while((match = preferenciasRegex.exec(content)) !== null) {
                        matches.push({
                            type: 'preferencias',
                            id: match[1],
                            preferencias: match[2],
                            line: match[0]
                        });
                    }
                    
                    // Organizar por tipo para inserción ordenada
                    const carreraMatches = matches.filter(m => m.type === 'carrera');
                    const perteneceMatches = matches.filter(m => m.type === 'pertenece');
                    const perfilMatches = matches.filter(m => m.type === 'perfil');
                    const interesesMatches = matches.filter(m => m.type === 'intereses');
                    const preferenciasMatches = matches.filter(m => m.type === 'preferencias');
                    
                    // Agregar al contenido en las secciones adecuadas
                    const contentLines = currentContent.split('\n');
                    
                    // Insertar carreras
                    updatedContent = insertIntoSection(contentLines, "% Carreras", carreraMatches.map(m => m.line));
                    
                    // Insertar relaciones pertenece
                    updatedContent = insertIntoSection(updatedContent.split('\n'), "% Relación entre carreras y facultades", perteneceMatches.map(m => m.line));
                    
                    // Insertar perfiles
                    updatedContent = insertIntoSection(updatedContent.split('\n'), "% Perfiles: [aptitudes + habilidades]", perfilMatches.map(m => m.line));
                    
                    // Insertar intereses
                    updatedContent = insertIntoSection(updatedContent.split('\n'), "% Intereses relacionados con carreras", interesesMatches.map(m => m.line));
                    
                    // Insertar preferencias
                    updatedContent = insertIntoSection(updatedContent.split('\n'), "% Preferencias relacionadas con carreras", preferenciasMatches.map(m => m.line));
                    
                    // Actualizar el contenido
                    updateKnowledgeBase(updatedContent);
                };
                
                reader.onerror = function() {
                    alert("No se pudo leer el archivo");
                };
                
                reader.readAsText(this.files[0]);
            }
        };
        
        input.click();
    });
    
    // Agregar el botón al inicio de la pestaña de carreras
    const carrerasContainer = document.getElementById("carreras-container");
    if(carrerasContainer) {
        carrerasContainer.insertBefore(importCarreras, carrerasContainer.firstChild);
    }

    

    // Función auxiliar para insertar líneas en una sección específica
    function insertIntoSection(lines, sectionHeader, newLines) {
        for(let i = 0; i < lines.length; i++) {
            if(lines[i].includes(sectionHeader)) {
                // Encontrar dónde termina la sección
                let j = i + 1;
                while(j < lines.length && lines[j].trim() !== '' && !lines[j].startsWith('%')) {
                    j++;
                }
                
                // Insertar las nuevas líneas
                Array.prototype.splice.apply(lines, [j, 0].concat(newLines));
                break;
            }
        }
        
        return lines.join('\n');
    }

    function loadCareerInterests() {
        const interestsContainer = document.querySelector(".checkbox-grid.career-intereses");
        if (!interestsContainer) return;
    
        runQuery("findall(I, (intereses(_, L), member(I, L)), R), sort(R, UniqueInterests).")
            .then(response => {
                let interestsList = response.links.UniqueInterests;
                let html = "";
    
                while (interestsList && interestsList.indicator === "./2") {
                    if (interestsList.args[0]) {
                        let interest = interestsList.args[0].id.replace(/_/g, ' '); // Remueve guiones bajos
                        html += `
                            <label>
                                <input type="checkbox" name="career-interes" value="${interest}"> ${interest.charAt(0).toUpperCase() + interest.slice(1)}
                            </label>
                        `;
                    }
                    interestsList = interestsList.args[1]; // Moverse al siguiente elemento en la lista
                }
    
                interestsContainer.innerHTML = html || "<p>No hay intereses disponibles.</p>";
            })
            .catch(err => console.error("Error al cargar intereses:", err));
    }

    // Función para cargar aptitudes y habilidades existentes
    function loadAptitudesHabilidades() {
        aptitudesMap.clear();
        habilidadesMap.clear();
        const aptitudesList = document.getElementById("aptitudes-list");
        const habilidadesList = document.getElementById("habilidades-list");
        const careerAptitudesSection = document.querySelector(".checkbox-grid.career-aptitudes"); // Nueva sección para aptitudes
        const careerHabilidadesSection = document.querySelector(".checkbox-grid.career-habilidades"); // Nueva sección para habilidades
        
        if (!aptitudesList || !habilidadesList || !careerAptitudesSection  ) return;
    
        // Inicializar listas vacías
        aptitudesList.innerHTML = "";
        habilidadesList.innerHTML = "";
    
        // Cargar las aptitudes y habilidades personalizadas del localStorage
        const studentAptitudes = JSON.parse(localStorage.getItem('studentAptitudes') || '[]');
        const studentHabilidades = JSON.parse(localStorage.getItem('studentHabilidades') || '[]');
    
        // Cargar los checkboxes de estudiantes para clasificar de local storage
        const aptitudesCheckboxes = document.querySelectorAll("input[name='career-aptitud']");
        const habilidadesCheckboxes = document.querySelectorAll("input[name='career-habilidad']"); // Las llenaremos después con las que no son aptitudes
    
        // Obtener los valores de aptitudes y habilidades de los checkboxes
        let aptitudesFromCheckboxes = [];
        let habilidadesFromCheckboxes = [];
    
        aptitudesCheckboxes.forEach(cb => {
            aptitudesFromCheckboxes.push(cb.value);
            aptitudesMap.set(cb.value, cb.parentElement.textContent.trim());
        });
        habilidadesCheckboxes.forEach(cb => {
            habilidadesFromCheckboxes.push(cb.value);  // Agregar a habilidades
            habilidadesMap.set(cb.value, cb.parentElement.textContent.trim());  // Agregar al mapa de habilidades
        });
    
        // Añadir aptitudes personalizadas a los mapas
        studentAptitudes.forEach(aptitud => {
            if (!aptitudesMap.has(aptitud.id)) {
                aptitudesMap.set(aptitud.id, aptitud.name);
                aptitudesFromCheckboxes.push(aptitud.id);
            }
        });
    
        studentHabilidades.forEach(habilidad => {
            if (!habilidadesMap.has(habilidad.id)) {
                habilidadesMap.set(habilidad.id, habilidad.name);
                habilidadesFromCheckboxes.push(habilidad.id);
            }
        });
    
        // Cargar Aptitudes en la sección principal y en la nueva sección
        runQuery("findall(A, (perfil(_, aptitudes(Aptitudes), _), member(A, Aptitudes)), AllAptitudes).")
            .then(answer => {
                let allItems = [];
                if (answer) {
                    let lista = answer.links.AllAptitudes;
                    while (lista && lista.indicator === "./2") {
                        if (lista.args[0]) {
                            const itemId = lista.args[0].id;
                            if (!allItems.includes(itemId)) {
                                allItems.push(itemId);
                            }
                        }
                        lista = lista.args[1];
                    }
                    // Añadir aptitudes personalizadas que no están en perfiles
                    studentAptitudes.forEach(aptitud => {
                        if (!allItems.includes(aptitud.id)) {
                            allItems.push(aptitud.id);
                        }
                    });
    
                    if (allItems.length === 0) {
                        aptitudesList.innerHTML = "<p>No hay aptitudes definidas en la base de conocimientos.</p>";
                        return;
                    }
    
                    let aptitudesHtml = "";
                    let careerAptitudesHtml = ""; // Para la nueva sección
    
                    allItems.forEach(item => {
                        let displayName = aptitudesMap.get(item) || studentAptitudes.find(a => a.id === item)?.name || item.replace(/_/g, ' ');
    
                        // Crear el HTML para la lista principal
                        aptitudesHtml += `
                            <div class="aptitud-item">
                                <div class="aptitud-header">
                                    <span>${displayName}</span>
                                    <small>(${item})</small>
                                </div>
                                <div class="aptitud-actions">
                                    <button class="btn-small edit-aptitud edit-aptitud-btn" data-id="${item}" data-name="${displayName}">Editar</button>
                                    <button class="btn-small delete-aptitud" data-id="${item}">Eliminar</button>
                                </div>
                            </div>
                        `;
    
                        // Crear el HTML para la nueva sección
                        careerAptitudesHtml += `
                            <label>
                                <input type="checkbox" name="career-aptitud" value="${item}" ${studentAptitudes.some(a => a.id === item) ? 'checked' : ''}> 
                                ${displayName}
                            </label>
                        `;
                    });
    
                    // Actualizar la sección de aptitudes
                    aptitudesList.innerHTML = aptitudesHtml;
    
                    // Actualizar la nueva sección de career-aptitudes
                    careerAptitudesSection.innerHTML = careerAptitudesHtml;
    
                    // **Uso de event delegation para evitar la doble ejecución**
                    // Añadir eventos a los botones de aptitudes
                    document.querySelectorAll('.edit-aptitud-btn').forEach(btn => {
                        btn.addEventListener('click', function() {
                            const aptitudId = this.getAttribute('data-id');
                            const aptitudName = this.getAttribute('data-name');
                            edit(0, aptitudId, aptitudName);  // 0 indica que es una aptitud
                        });
                    });
    
                    document.querySelectorAll('.delete-aptitud').forEach(btn => {
                        btn.addEventListener('click', function() {
                            const aptitudId = this.getAttribute('data-id');
                            if (confirm(`¿Está seguro de eliminar ${aptitudId.replace(/_/g, ' ')}?`)) {
                                deleteAptitud(aptitudId);
                            }
                        });
                    });

                }
            })
            .catch(err => {
                console.error("Error al cargar aptitudes:", err);
            });
    
        // Cargar Habilidades en la sección principal
        runQuery("findall(H, (perfil(_, _, habilidades(Habilidades)), member(H, Habilidades)), AllHabilidades).")
        .then(answer => {
            let allHabilidades = [];
            if (answer) {
                let lista = answer.links.AllHabilidades;
                while (lista && lista.indicator === "./2") {
                    if (lista.args[0]) {
                        const itemId = lista.args[0].id;
                        if (!allHabilidades.includes(itemId)) {
                            allHabilidades.push(itemId);
                        }
                    }
                    lista = lista.args[1];
                }
        
                // Añadir habilidades personalizadas que no están en perfiles
                studentHabilidades.forEach(habilidad => {
                    if (!allHabilidades.includes(habilidad.id)) {
                        allHabilidades.push(habilidad.id);
                    }
                });
    
                if (allHabilidades.length === 0) {
                    habilidadesList.innerHTML = "<p>No hay habilidades definidas en la base de conocimientos.</p>";
                    return;
                }
    
                let habilidadesHtml = "";
                let careerHabilidadesHtml = "";  // Para la nueva sección de checkboxes
    
                allHabilidades.forEach(item => {
                    const itemElement = document.createElement("div");
                    itemElement.className = "aptitud-item";
    
                    let displayName = habilidadesMap.get(item) || studentHabilidades.find(h => h.id === item)?.name || item.replace(/_/g, ' ');
    
                    itemElement.innerHTML = `
                        <div class="aptitud-header">
                            <span>${displayName}</span>
                            <small>(${item})</small>
                        </div>
                        <div class="aptitud-actions">
                            <button class="btn-small edit-aptitud edit-habilidad-btn" data-id="${item}" data-name="${displayName}">Editar</button>
                            <button class="btn-small delete-habilidad" data-id="${item}">Eliminar</button>
                        </div>
                    `;
    
                    habilidadesHtml += itemElement.outerHTML;
    
                    // Crear el checkbox para la nueva sección de habilidades
                    careerHabilidadesHtml += `
                        <label>
                            <input type="checkbox" name="career-habilidad" value="${item}" ${studentHabilidades.some(h => h.id === item) ? 'checked' : ''}> 
                            ${displayName}
                        </label>
                    `;
                });
    
                habilidadesList.innerHTML = habilidadesHtml || "<p>No hay habilidades definidas en la base de conocimientos.</p>";
    
                // Insertar los checkboxes en la sección de habilidades
                careerHabilidadesSection.innerHTML = careerHabilidadesHtml;
    
                // Añadir eventos a los botones de habilidades
                document.querySelectorAll('.edit-habilidad-btn').forEach(btn => {
                    btn.addEventListener('click', function() {
                        const habilidadId = this.getAttribute('data-id');
                        const habilidadName = this.getAttribute('data-name');
                        edit(1, habilidadId, habilidadName);
                    });
                });
    
                document.querySelectorAll('.delete-habilidad').forEach(btn => {
                    btn.addEventListener('click', function() {
                        const habilidadId = this.getAttribute('data-id');
                        if (confirm(`¿Está seguro de eliminar ${habilidadId.replace(/_/g, ' ')}?`)) {
                            deleteHabilidad(habilidadId);
                        }
                    });
                });
            }
        })
        .catch(err => {
            console.error("Error al cargar habilidades:", err);
        });
    
    }

    // Función para editar una aptitud o habilidad
    function edit(op, id) {
        let displayName = id.replace(/_/g, ' ');
        let tipo = "";
        let val1, val2;
    
        // Determinar si es aptitud o habilidad
        if (op === 0) {
            tipo = "aptitud";
        } else if (op === 1) {
            tipo = "habilidad";
        }
    
        // Llenar el formulario para editar
        document.getElementById("aptitud-id").value = id;
        document.getElementById("aptitud-id").disabled = true;
        document.getElementById("aptitud-nombre").value = displayName;
        document.getElementById("aptitud-tipo").value = tipo;
    
        // Seleccionar el botón de envío
        const submitBtn = document.querySelector('#add-aptitud-form button[type="submit"]');
        submitBtn.textContent = "Actualizar Aptitud/Habilidad";
    
        // Remover cualquier manejador de eventos previo para evitar duplicaciones
        submitBtn.replaceWith(submitBtn.cloneNode(true));
        const newSubmitBtn = document.querySelector('#add-aptitud-form button[type="submit"]');
    
        // Asignar la función correcta según el id
        if (op === 0) {
            newSubmitBtn.addEventListener("click", function (event) {
                event.preventDefault();
                val1 = document.getElementById("aptitud-id").value;
                val2 = document.getElementById("aptitud-nombre").value;
                val3 = document.getElementById("aptitud-tipo").value;
                // console.log(val1, val2, val3);
                replaceAptitud(val1, val2);
            });
        } else if (op === 1) {
            newSubmitBtn.addEventListener("click", function (event) {
                event.preventDefault();
                val1 = document.getElementById("aptitud-id").value;
                val2 = document.getElementById("aptitud-nombre").value;
                val3 = document.getElementById("aptitud-tipo").value;
                replaceHabilidad(val1, val2);
            });
        }
    
        // Agregar un botón para cancelar si no existe
        if (!document.querySelector('#add-aptitud-form .btn-cancel')) {
            const cancelBtn = document.createElement('button');
            cancelBtn.type = 'button';
            cancelBtn.className = 'btn-secondary btn-cancel';
            cancelBtn.textContent = 'Cancelar';
            cancelBtn.addEventListener('click', resetAptitudForm);
            document.querySelector('#add-aptitud-form .button-container').appendChild(cancelBtn);
        }
    
        // Desplazarse hasta el formulario
        document.getElementById("add-aptitud-form").scrollIntoView({ behavior: 'smooth' });
    }

    function replaceAptitud(oldAptitudId, newAptitudId) {
        // Obtener el contenido actual del elemento
        const contentLines = document.getElementById("knowledge-content").value.split('\n');
        let newContent = [];
        let modified = false;
        newAptitudId = newAptitudId.replace(/ /g, '_');
    
        // Expresión regular para detectar la línea con aptitudes dentro de un perfil
        const aptitudesRegex = /(aptitudes\(\[)([^\]]*)(\]\))/;
    
        for (let line of contentLines) {
            if (aptitudesRegex.test(line)) {
                // Extraer las aptitudes dentro de los corchetes
                line = line.replace(aptitudesRegex, (match, start, aptitudes, end) => {
                    let aptitudeList = aptitudes.split(',').map(a => a.trim());
                    // Reemplazar la aptitud antigua por la nueva
                    let updatedList = aptitudeList.map(a => a === oldAptitudId ? newAptitudId : a);
    
                    // Si la lista queda vacía, se mantiene el formato vacío: aptitudes([])
                    return `${start}${updatedList.join(', ')}${end}`;
                });
    
                modified = true;
            }
            newContent.push(line);
        }
    
        if (modified) {
            // Actualizar el contenido en el elemento
            document.getElementById("knowledge-content").value = newContent.join('\n');
    
            // Reiniciar la sesión de Prolog con el nuevo contenido
            session = pl.create();
            session.consult(newContent.join('\n'), {
                success: function () {
                    alert(`Aptitud actualizada en todos los perfiles`);
                    loadAptitudesHabilidades();
                    loadCareersList(); // Por si afectó a alguna carrera
                },
                error: function (err) {
                    alert("Error al actualizar la base de conocimientos: " + err);
                }
            });
    
            // También actualizarlo en localStorage
            let studentAptitudes = JSON.parse(localStorage.getItem('studentAptitudes') || '[]');
            studentAptitudes = studentAptitudes.map(item => item.id === oldAptitudId ? { ...item, id: newAptitudId } : item);
            localStorage.setItem('studentAptitudes', JSON.stringify(studentAptitudes));
        } else {
            alert("No se encontró la aptitud en ningún perfil.");
        }
        resetAptitudForm();
    }

    function replaceHabilidad(oldHabilidadId, newHabilidadId) {
        // Obtener el contenido actual del elemento
        const contentLines = document.getElementById("knowledge-content").value.split('\n');
        let newContent = [];
        let modified = false;
        newHabilidadId = newHabilidadId.replace(/ /g, '_');
    
        // Expresión regular para detectar la línea con habilidades dentro de un perfil
        const habilidadesRegex = /(habilidades\(\[)([^\]]*)(\]\))/;
    
        for (let line of contentLines) {
            if (habilidadesRegex.test(line)) {
                // Extraer las habilidades dentro de los corchetes
                line = line.replace(habilidadesRegex, (match, start, habilidades, end) => {
                    let habilidadesList = habilidades.split(',').map(h => h.trim());
                    // Reemplazar la habilidad antigua por la nueva
                    let updatedList = habilidadesList.map(h => h === oldHabilidadId ? newHabilidadId : h);
    
                    // Si la lista queda vacía, se mantiene el formato vacío: habilidades([])
                    return `${start}${updatedList.join(', ')}${end}`;
                });
    
                modified = true;
            }
            newContent.push(line);
        }
    
        if (modified) {
            // Actualizar el contenido en el elemento
            document.getElementById("knowledge-content").value = newContent.join('\n');
    
            // Reiniciar la sesión de Prolog con el nuevo contenido
            session = pl.create();
            session.consult(newContent.join('\n'), {
                success: function () {
                    alert(`Habilidad actualizada en todos los perfiles`);
                    loadAptitudesHabilidades();
                    loadCareersList(); // Por si afectó a alguna carrera
                },
                error: function (err) {
                    alert("Error al actualizar la base de conocimientos: " + err);
                }
            });
    
            // También actualizarlo en localStorage
            let studentHabilidades = JSON.parse(localStorage.getItem('studentHabilidades') || '[]');
            studentHabilidades = studentHabilidades.map(item => item.id === oldHabilidadId ? { ...item, id: newHabilidadId } : item);
            localStorage.setItem('studentHabilidades', JSON.stringify(studentHabilidades));
        } else {
            alert("No se encontró la habilidad en ningún perfil.");
        }
        resetAptitudForm();
    }

    // Función para eliminar una aptitud o habilidad
    function deleteAptitud(aptitudId) {
        // Obtener el contenido actual del elemento
        const contentLines = document.getElementById("knowledge-content").value.split('\n');
        let newContent = [];
        let modified = false;
    
        // Expresión regular para detectar la línea con aptitudes dentro de un perfil
        const aptitudesRegex = /(aptitudes\(\[)([^\]]*)(\]\))/;
    
        for (let line of contentLines) {
            if (aptitudesRegex.test(line)) {
                // Extraer las aptitudes dentro de los corchetes
                line = line.replace(aptitudesRegex, (match, start, aptitudes, end) => {
                    let aptitudeList = aptitudes.split(',').map(a => a.trim());
                    let filteredList = aptitudeList.filter(a => a !== aptitudId);
                    
                    // Si la lista queda vacía, se mantiene el formato vacío: aptitudes([])
                    return `${start}${filteredList.join(', ')}${end}`;
                });
    
                modified = true;
            }
            newContent.push(line);
        }
    
        if (modified) {
            // Actualizar el contenido en el elemento
            document.getElementById("knowledge-content").value = newContent.join('\n');
    
            // Reiniciar la sesión de Prolog con el nuevo contenido
            session = pl.create();
            session.consult(newContent.join('\n'), {
                success: function () {
                    alert(`${aptitudId.replace(/_/g, ' ')} eliminado correctamente de todos los perfiles.`);
                    loadAptitudesHabilidades();
                    loadCareersList(); // Por si afectó a alguna carrera
                },
                error: function (err) {
                    alert("Error al actualizar la base de conocimientos: " + err);
                }
            });
    
            // También eliminarlo de localStorage
            let studentAptitudes = JSON.parse(localStorage.getItem('studentAptitudes') || '[]');
            studentAptitudes = studentAptitudes.filter(item => item.id !== aptitudId);
            localStorage.setItem('studentAptitudes', JSON.stringify(studentAptitudes));
        } else {
            alert("No se encontró la aptitud en ningún perfil.");
        }
    }

    function deleteHabilidad(habilidadId) {
        // Obtener el contenido actual del elemento
        const contentLines = document.getElementById("knowledge-content").value.split('\n');
        let newContent = [];
        let modified = false;
    
        // Expresión regular para detectar la línea con aptitudes dentro de un perfil
        const aptitudesRegex = /(habilidades\(\[)([^\]]*)(\]\))/;
    
        for (let line of contentLines) {
            if (aptitudesRegex.test(line)) {
                // Extraer las aptitudes dentro de los corchetes
                line = line.replace(aptitudesRegex, (match, start, aptitudes, end) => {
                    let aptitudeList = aptitudes.split(',').map(a => a.trim());
                    let filteredList = aptitudeList.filter(a => a !== habilidadId);
                    
                    // Si la lista queda vacía, se mantiene el formato vacío: aptitudes([])
                    return `${start}${filteredList.join(', ')}${end}`;
                });
    
                modified = true;
            }
            newContent.push(line);
        }
    
        if (modified) {
            // Actualizar el contenido en el elemento
            document.getElementById("knowledge-content").value = newContent.join('\n');
    
            // Reiniciar la sesión de Prolog con el nuevo contenido
            session = pl.create();
            session.consult(newContent.join('\n'), {
                success: function () {
                    alert(`${habilidadId.replace(/_/g, ' ')} eliminado correctamente de todos los perfiles.`);
                    loadAptitudesHabilidades();
                    loadCareersList(); // Por si afectó a alguna carrera
                },
                error: function (err) {
                    alert("Error al actualizar la base de conocimientos: " + err);
                }
            });
    
            // También eliminarlo de localStorage
            let studentAptitudes = JSON.parse(localStorage.getItem('studentHabilidades') || '[]');
            studentAptitudes = studentAptitudes.filter(item => item.id !== habilidadId);
            localStorage.setItem('studentHabilidades', JSON.stringify(studentAptitudes));
        } else {
            alert("No se encontró la aptitud en ningún perfil.");
        }
    }

    document.getElementById("add-aptitud-form").addEventListener("submit", function (event) {
        event.preventDefault(); // Evita la recarga de la página
    
        const idField = document.getElementById("aptitud-id").value;
        const nameField = document.getElementById("aptitud-nombre").value;
        const type = document.getElementById("aptitud-tipo").value;
    
        if (idField.trim() === "" || nameField.trim() === "") {
            alert("Por favor, ingrese un ID y un nombre válido.");
            return;
        }
    
        const newAptitud = {
            id: idField.trim(),
            name: nameField.trim()
        };
        if (type === "aptitud") {
            let studentAptitudes = JSON.parse(localStorage.getItem("studentAptitudes") || "[]");
            studentAptitudes.push(newAptitud);
            localStorage.setItem("studentAptitudes", JSON.stringify(studentAptitudes));
        } else {
            let studentHabilidades = JSON.parse(localStorage.getItem("studentHabilidades") || "[]");
            studentHabilidades.push(newAptitud);
            localStorage.setItem("studentHabilidades", JSON.stringify(studentHabilidades));
        }

        loadAptitudesHabilidades();
        resetAptitudForm();
    });

    // Función para resetear el formulario de aptitudes
    function resetAptitudForm() {
        const form = document.getElementById("add-aptitud-form");
        if (form) {
            form.reset();
            
            const idField = document.getElementById("aptitud-id");
            if (idField) idField.disabled = false;
            
            const submitBtn = document.querySelector('#add-aptitud-form button[type="submit"]');
            if (submitBtn) submitBtn.textContent = "Agregar Aptitud/Habilidad";
            
            const cancelBtn = document.querySelector('#add-aptitud-form .btn-cancel');
            if (cancelBtn) cancelBtn.remove();
        }
    }

    // Función para agregar una nueva aptitud/habilidad a los formularios
    function addAptitudToForms(aptitudId, nombre, tipo) {
        // Agregar al formulario de perfiles (carrera)
        const careerAptitudesGrid = document.querySelector('.career-aptitudes');
        if (careerAptitudesGrid) {
            // Verificar si ya existe para no duplicar
            const existingCheckbox = careerAptitudesGrid.querySelector(`input[value="${aptitudId}"]`);
            if (!existingCheckbox) {
                const label = document.createElement('label');
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.name = 'career-aptitud';
                checkbox.value = aptitudId;
                label.appendChild(checkbox);
                label.append(` ${nombre}`);
                careerAptitudesGrid.appendChild(label);
            }
        }

        // Guardar la nueva aptitud/habilidad en localStorage para que sea visible en el módulo de estudiantes
        let studentAptitudes = JSON.parse(localStorage.getItem('studentAptitudes') || '[]');
        let studentHabilidades = JSON.parse(localStorage.getItem('studentHabilidades') || '[]');
        
        const newItem = {
            id: aptitudId,
            name: nombre
        };
        
        if (tipo === 'aptitud') {
            if (!studentAptitudes.some(item => item.id === aptitudId)) {
                studentAptitudes.push(newItem);
                localStorage.setItem('studentAptitudes', JSON.stringify(studentAptitudes));
            } else {
                // Actualizar el nombre si ya existe
                studentAptitudes = studentAptitudes.map(item => 
                    item.id === aptitudId ? {...item, name: nombre} : item
                );
                localStorage.setItem('studentAptitudes', JSON.stringify(studentAptitudes));
            }
        } else {
            if (!studentHabilidades.some(item => item.id === aptitudId)) {
                studentHabilidades.push(newItem);
                localStorage.setItem('studentHabilidades', JSON.stringify(studentHabilidades));
            } else {
                // Actualizar el nombre si ya existe
                studentHabilidades = studentHabilidades.map(item => 
                    item.id === aptitudId ? {...item, name: nombre} : item
                );
                localStorage.setItem('studentHabilidades', JSON.stringify(studentHabilidades));
            }
        }

        alert(`La ${tipo} "${aptitudId}" ha sido agregada al sistema y estará disponible en el módulo de estudiantes.`);

        // Actualizar las listas y resetear el formulario
        loadAptitudesHabilidades();
        resetAptitudForm();
    }

    // Cargar aptitudes y habilidades cuando se selecciona la pestaña
    document.querySelectorAll('.tab-btn').forEach(button => {
        button.addEventListener('click', function() {
            if (this.getAttribute('data-tab') === 'aptitudes') {
                loadAptitudesHabilidades();
            }
        });
    });
});