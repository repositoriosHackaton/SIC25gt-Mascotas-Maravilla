let database = {
    facultades: [],
    aptitudes: [],
    habilidades: [],
    intereses: [],
    cursos: []
};
async function loadData() {
    try {
        // Intentar cargar desde localStorage primero
        const savedData = localStorage.getItem('vocationalData');
        if (savedData) {
            database = JSON.parse(savedData);
        } else {
            // Si no hay datos en localStorage, cargar desde el JSON
            const response = await fetch('../../data/database.json');
            if (!response.ok) throw new Error('Error al cargar el archivo JSON');
            database = await response.json();
            // Guardar en localStorage
            localStorage.setItem('vocationalData', JSON.stringify(database));
        }
    } catch (error) {
        console.error('Error cargando datos:', error);
    } finally {
        renderTables();
    }
}

async function saveToJSON() {
    try {
        // 1. Guardar en localStorage
        localStorage.setItem('vocationalData', JSON.stringify(database));
        
        // 2. Generar archivo JSON para descarga
        const jsonData = JSON.stringify(database, null, 2);
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        // 3. Crear link de descarga
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = 'database.json';
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(url);
        
        alert('Datos guardados en el sistema y archivo JSON generado.');
    } catch (error) {
        console.error('Error al guardar:', error);
        alert('Error al guardar los datos');
    }
}

// Agregar función para restaurar desde archivo JSON
function handleFileRestore(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                database = data;
                localStorage.setItem('vocationalData', JSON.stringify(data));
                renderTables();
                alert('Datos restaurados exitosamente');
            } catch (error) {
                alert('Error al restaurar los datos');
                console.error(error);
            }
        };
        reader.readAsText(file);
    }
}

function renderTables() {
    renderTable('tableFacultades', database.facultades, true);
    // Agregar renderizado específico para carreras
    renderCarreras();
    renderTable('tableAptitudes', database.aptitudes, false);
    renderTable('tableHabilidades', database.habilidades, false);
    renderTable('tableIntereses', database.intereses, false);
}

// Nueva función para renderizar carreras
function renderCarreras() {
    const tbody = document.querySelector('#tableCarreras tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    database.facultades.forEach(facultad => {
        facultad.carreras.forEach(carrera => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${carrera.nombre} (${facultad.nombre})</td>
                <td>
                    <button class="btn-editar btn btn-outline-secondary" data-type="carrera" data-id="${carrera.id}" data-facultad="${facultad.id}">✏️</button>
                    <button class="btn-eliminar btn btn-outline-danger" data-type="carrera" data-id="${carrera.id}" data-facultad="${facultad.id}">🗑️</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    });
}

function renderTable(tableId, items, isFacultad) {
    const tbody = document.querySelector(`#${tableId} tbody`);
    if (!tbody) return;
    
    tbody.innerHTML = '';
    if (!items || items.length === 0) return;

    items.forEach(item => {
        const tr = document.createElement('tr');
        if (isFacultad) {
            tr.innerHTML = `
                <td>${item.nombre}</td>
                <td>
                    <button class="btn-editar btn btn-outline-secondary" data-type="facultad" data-id="${item.id}">✏️</button>
                    <button class="btn-eliminar btn btn-outline-danger" data-type="facultad" data-id="${item.id}">🗑️</button>
                </td>
            `;
        } else {
            tr.innerHTML = `
                <td>${item}</td>
                <td>
                    <button class="btn-eliminar btn btn-outline-danger" data-type="${tableId.replace('table', '').toLowerCase()}" data-id="${item}">🗑️</button>
                </td>
            `;
        }
        tbody.appendChild(tr);
    });
}

function saveToLocalStorage() {
    localStorage.setItem('uniMatchData', JSON.stringify(database));
    generatePrologFacts();
}

function generatePrologFacts() {
    let facts = [];
    
    // Generar hechos para facultades
    database.facultades.forEach(facultad => {
        facts.push(`facultad('${facultad.id}', '${facultad.nombre}').`);
        
        // Generar hechos para carreras de cada facultad
        facultad.carreras.forEach(carrera => {
            facts.push(`carrera('${carrera.id}', '${carrera.nombre}', '${facultad.id}').`);
            
            // Generar relaciones entre carreras y aptitudes
            carrera.aptitudesRequeridas.forEach(aptitud => {
                facts.push(`requiere_aptitud('${carrera.id}', '${aptitud}').`);
            });
        });
    });

    // Generar hechos para aptitudes
    database.aptitudes.forEach(aptitud => {
        facts.push(`aptitud('${aptitud.id}', '${aptitud.nombre}').`);
    });

    // Guardar los hechos en localStorage para uso posterior
    localStorage.setItem('prologFacts', facts.join('\n'));
}

function addItem(type, name) {
    if (!name) return;
    
    const newId = Date.now();
    
    switch(type) {
        case 'facultad':
            database.facultades.push({
                id: newId,
                nombre: name,
                carreras: []
            });
            break;
        case 'carrera':
            const facultadId = document.getElementById('facultadSelect').value;
            const facultad = database.facultades.find(f => f.id === parseInt(facultadId));
            if (facultad) {
                facultad.carreras.push({
                    id: Date.now(),
                    nombre: name,
                    aptitudesRequeridas: []
                });
            }
            break;
        case 'aptitud':
            database.aptitudes.push({
                id: newId,
                nombre: name,
                descripcion: ''
            });
            break;
        case 'habilidad':
            if (!database.habilidades.includes(name)) {
                database.habilidades.push(name);
            }
            break;
        case 'interes':
            if (!database.intereses.includes(name)) {
                database.intereses.push(name);
            }
            break;
    }
    saveToLocalStorage();
    renderTables();
    // Guardar cambios en localStorage después de cada modificación
    localStorage.setItem('vocationalData', JSON.stringify(database));
}

// Función para eliminar elementos
function deleteItem(type, id) {
    switch(type) {
        case 'facultad':
            database.facultades = database.facultades.filter(f => f.id !== parseInt(id));
            break;
        case 'carrera':
            database.facultades.forEach(f => {
                f.carreras = f.carreras.filter(c => c.id !== id);
            });
            break;
        case 'aptitud':
            database.aptitudes = database.aptitudes.filter(a => a !== id);
            break;
        case 'habilidad':
            database.habilidades = database.habilidades.filter(h => h !== id);
            break;
        case 'interes':
            database.intereses = database.intereses.filter(i => i !== id);
            break;
        case 'curso':
            database.cursos = database.cursos.filter(c => c !== id);
            break;
    }
    renderTables();
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    
    // Agregar botón para restaurar JSON
    const btnRestore = document.createElement('input');
    btnRestore.type = 'file';
    btnRestore.accept = '.json';
    btnRestore.style.display = 'none';
    btnRestore.id = 'btnRestore';
    document.body.appendChild(btnRestore);
    
    btnRestore.addEventListener('change', handleFileRestore);
    
    // Agregar botón visible para restaurar
    const btnRestoreVisible = document.createElement('button');
    btnRestoreVisible.className = 'btn btn-warning me-2';
    btnRestoreVisible.textContent = 'Restaurar desde JSON';
    btnRestoreVisible.onclick = () => btnRestore.click();
    
    // Agregar el botón junto al botón de guardar
    const btnGuardarDatos = document.getElementById('btnGuardarDatos');
    btnGuardarDatos.parentNode.insertBefore(btnRestoreVisible, btnGuardarDatos);
    
    // Botón guardar cambios
    if (btnGuardarDatos) {
        btnGuardarDatos.addEventListener('click', () => {
            saveToLocalStorage();
            alert('Datos guardados y hechos Prolog generados');
        });
    }
    
    // Modal para agregar elementos
    const formAgregar = document.getElementById('formAgregar');
    if (formAgregar) {
        formAgregar.addEventListener('submit', (e) => {
            e.preventDefault();
            const nombreItem = document.getElementById('nombreItem');
            const tipoItem = document.getElementById('tipoItem');
            
            if (nombreItem && tipoItem && nombreItem.value && tipoItem.value) {
                addItem(tipoItem.value, nombreItem.value);
                const modal = bootstrap.Modal.getInstance(document.getElementById('modalAgregar'));
                if (modal) modal.hide();
                formAgregar.reset();
            }
        });
    }

    // Delegación de eventos para botones eliminar
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-eliminar')) {
            const type = e.target.dataset.type;
            const id = e.target.dataset.id;
            if (type && id && confirm('¿Está seguro de eliminar este elemento?')) {
                deleteItem(type, id);
            }
        }
    });

    // Manejar apertura del modal
    document.querySelectorAll('.btn-add').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const type = e.target.dataset.type;
            const tipoItem = document.getElementById('tipoItem');
            if (tipoItem) tipoItem.value = type;
            
            const modalLabel = document.getElementById('modalAgregarLabel');
            if (modalLabel) modalLabel.textContent = `Agregar ${type}`;
            
            // Mostrar/ocultar selector de facultad para carreras
            const facultadSelectContainer = document.getElementById('facultadSelectContainer');
            if (type === 'carrera') {
                facultadSelectContainer.style.display = 'block';
                // Poblar select de facultades
                const facultadSelect = document.getElementById('facultadSelect');
                facultadSelect.innerHTML = '';
                database.facultades.forEach(facultad => {
                    const option = new Option(facultad.nombre, facultad.id);
                    facultadSelect.add(option);
                });
            } else {
                facultadSelectContainer.style.display = 'none';
            }
        });
    });

    // Manejar submit del formulario
    document.getElementById('formAgregar').addEventListener('submit', (e) => {
        e.preventDefault();
        const type = document.getElementById('tipoItem').value;
        const nombre = document.getElementById('nombreItem').value;
        addItem(type, nombre);
        bootstrap.Modal.getInstance(document.getElementById('modalAgregar')).hide();
        e.target.reset();
    });
});
