document.addEventListener('DOMContentLoaded', () => {
    // Cargar datos desde localStorage
    const data = JSON.parse(localStorage.getItem('uniMatchData'));
    const prologFacts = localStorage.getItem('prologFacts');
    
    function populateFormOptions() {
        if (!data) return;

        // Poblar aptitudes
        const aptitudSelect = document.getElementById('aptitud');
        if (aptitudSelect) {
            aptitudSelect.innerHTML = '<option selected disabled>Seleccione una aptitud</option>';
            data.aptitudes.forEach(aptitud => {
                const option = document.createElement('option');
                option.value = aptitud.id;
                option.textContent = aptitud.nombre;
                aptitudSelect.appendChild(option);
            });
        }

        // Poblar habilidades
        const habilidadesContainer = document.querySelector('.form-check');
        if (habilidadesContainer) {
            habilidadesContainer.innerHTML = '';
            data.habilidades.forEach(habilidad => {
                const div = document.createElement('div');
                div.className = 'form-check';
                div.innerHTML = `
                    <input class="form-check-input" type="checkbox" value="${habilidad.id}" id="check${habilidad.id}">
                    <label class="form-check-label" for="check${habilidad.id}">${habilidad.nombre}</label>
                `;
                habilidadesContainer.appendChild(div);
            });
        }
    }

    // Inicializar Tau-Prolog si está disponible
    if (typeof pl !== 'undefined' && prologFacts) {
        const session = pl.create();
        session.consult(prologFacts, {
            success: function() {
                console.log('Hechos Prolog cargados exitosamente');
            },
            error: function(err) {
                console.error('Error al cargar hechos Prolog:', err);
            }
        });
    }

    populateFormOptions();

    const form = document.getElementById('formEstudiante');
    const btnAgregar = document.getElementById('btnAgregar');
    const selectAptitud = document.getElementById('aptitud');
    const tablaAptitudes = document.getElementById('tablaAptitudes');
    btnAgregar.addEventListener('click', () => {
        const selectedIndex = selectAptitud.selectedIndex;
        const selectedOption = selectAptitud.options[selectedIndex];
        if (selectedOption && !selectedOption.disabled) {
            const tr = document.createElement('tr');           
            const tdAptitud = document.createElement('td');
            tdAptitud.textContent = selectedOption.text;
            tr.appendChild(tdAptitud);
            const tdAccion = document.createElement('td');
            const btnEliminar = document.createElement('button');
            btnEliminar.type = 'button';
            btnEliminar.className = 'btn btn-danger btn-sm';
            btnEliminar.textContent = 'Eliminar';
            // Al hacer click, se elimina la fila
            btnEliminar.addEventListener('click', () => {
                tr.remove();
            });
            tdAccion.appendChild(btnEliminar);
            tr.appendChild(tdAccion);
            
            tablaAptitudes.appendChild(tr);
        }
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        // Redirecciona a 'intereses.html'
        window.location.href = "intereses.html";
    });
});
