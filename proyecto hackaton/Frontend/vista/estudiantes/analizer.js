// Variables globales para almacenar la información
let globalData = {};
let facultades = [];
let carreras = [];
let aptitudes = [];
let intereses = [];
let habilidades = [];

// Función para llenar el select con las aptitudes extraídas del JSON
function fillAptitudesSelect() {
  const selectElement = document.getElementById("aptitud");
  // Reiniciamos el select, dejando la opción placeholder
  selectElement.innerHTML = `<option selected disabled>Aptitudes</option>`;
  aptitudes.forEach(aptitud => {
    const option = document.createElement("option");
    option.value = aptitud;
    option.textContent = aptitud;
    selectElement.appendChild(option);
  });
}

function populateHabilidades(habilidades) {
  const container = document.getElementById("habilidades");
  container.innerHTML = ""; // Limpiar el contenedor

  habilidades.forEach((habilidad, index) => {
    // Crear div contenedor de la checkbox
    const div = document.createElement("div");
    div.className = "form-check";

    // Crear input checkbox
    const input = document.createElement("input");
    input.className = "form-check-input";
    input.type = "checkbox";
    input.name = "habilidades";
    input.value = habilidad;
    input.id = `checkHabilidad${index}`;

    // Crear label
    const label = document.createElement("label");
    label.className = "form-check-label";
    label.setAttribute("for", input.id);
    label.textContent = habilidad.charAt(0).toUpperCase() + habilidad.slice(1);

    // Agregar input y label al div
    div.appendChild(input);
    div.appendChild(label);

    // Agregar el div al contenedor principal
    container.appendChild(div);
  });
}

// Llamada a la función para poblar el div

// Función asíncrona para cargar info.json y procesar la información
async function loadInfoJSON2() {
  try {
    const response = await fetch("info.json");
    if (!response.ok) {
      throw new Error("Error en la respuesta de red");
    }
    const data = await response.json();
    globalData = data;

    // Recorrer las facultades y carreras
    data.facultades.forEach(facultad => {
      // Agregar el nombre de la facultad si no se repite
      if (!facultades.includes(facultad.nombre)) {
        facultades.push(facultad.nombre);
      }
      // Recorrer las carreras de la facultad
      facultad.carreras.forEach(carrera => {
        if (!carreras.includes(carrera.nombre)) {
          carreras.push(carrera.nombre);
        }
        // Agregar aptitudes sin repetir
        carrera.aptitudesRequeridas.forEach(aptitud => {
          if (!aptitudes.includes(aptitud)) {
            aptitudes.push(aptitud);
          }
        });
        // Agregar claves de nivelesInteres sin repetir
        Object.keys(carrera.nivelesInteres).forEach(interes => {
          if (!intereses.includes(interes)) {
            intereses.push(interes);
          }
        });
      });
    });

    console.log("Facultades:", facultades);
    console.log("Carreras:", carreras);
    console.log("Aptitudes:", aptitudes);
    console.log("Intereses:", intereses);

    // Llamar a la función para mostrar los resultados en el HTML
    mostrarResultados();
  } catch (error) {
    console.error("Error al obtener info.json:", error);
  }
}

async function loadInfoJSON() {
  try {
    const response = await fetch("info.json");
    if (!response.ok) {
      throw new Error("Error en la respuesta de red");
    }
    const data = await response.json();
    globalData = data;

    // Recorrer facultades y carreras para extraer la información
    data.facultades.forEach(facultad => {
      if (!facultades.includes(facultad.nombre)) {
        facultades.push(facultad.nombre);
      }
      facultad.carreras.forEach(carrera => {
        if (!carreras.includes(carrera.nombre)) {
          carreras.push(carrera.nombre);
        }
        carrera.aptitudesRequeridas.forEach(aptitud => {
          if (!aptitudes.includes(aptitud)) {
            aptitudes.push(aptitud);
          }
        });
        Object.keys(carrera.nivelesInteres).forEach(interes => {
          if (!intereses.includes(interes)) {
            intereses.push(interes);
          }
        });
        carrera.habilidades.forEach(habilidad => {
          const habilidadLower = habilidad.toLowerCase();

          // Verificar si ya existe en "intereses" o en "habilidades" sin importar mayúsculas/minúsculas
          if (
            !intereses.some(
              interes => interes.toLowerCase() === habilidadLower
            ) &&
            !habilidades.some(h => h.toLowerCase() === habilidadLower)
          ) {
            habilidades.push(habilidad);
          }
        });
      });
    });

    console.log("Aptitudes:", aptitudes);
    // Llenamos el select con las aptitudes extraídas
    fillAptitudesSelect();
    console.log(habilidades);
    populateHabilidades(habilidades);
    // Otras funciones para mostrar resultados, etc.
    mostrarResultados();
  } catch (error) {
    console.error("Error al obtener info.json:", error);
  }
}

// Función para insertar los datos en las tablas de resultados
function mostrarResultados() {
  const facultadTableBody = document.getElementById("facultad-table-body");
  const carrerasTableBody = document.getElementById("carreras-table-body");

  // Limpiar el contenido previo (si existe)
  facultadTableBody.innerHTML = "";
  carrerasTableBody.innerHTML = "";

  // Insertar cada facultad en la tabla
  facultades.forEach(nombre => {
    const tr = document.createElement("tr");
    // Aquí se puede calcular un porcentaje si lo requieres, se usa "--%" como placeholder
    tr.innerHTML = `<td>${nombre}</td><td>--%</td>`;
    facultadTableBody.appendChild(tr);
  });

  // Insertar cada carrera en la tabla
  carreras.forEach(nombre => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${nombre}</td><td>--%</td>`;
    carrerasTableBody.appendChild(tr);
  });
}

// Llamar a la función para cargar y procesar el JSON
loadInfoJSON();
