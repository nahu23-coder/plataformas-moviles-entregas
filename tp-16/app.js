const API_BASE = 'https://pokeapi.co/api/v2';
const CANTIDAD_POR_TANDA = 151; // "los primeros 151 pokémon" + potencia de a tandas iguales
const CANTIDAD_MOVIMIENTOS_A_MOSTRAR = 4;

let siguienteOffset = 0;

const grillaEl = document.getElementById('grilla-pokemon');
const spinnerCargaEl = document.getElementById('spinner-carga');
const spinnerCargarMasEl = document.getElementById('spinner-cargar-mas');
const btnCargarMasEl = document.getElementById('btn-cargar-mas');
const mensajeErrorEl = document.getElementById('mensaje-error');

const modalPokemonEl = document.getElementById('modal-pokemon');
const modalPokemon = new bootstrap.Modal(modalPokemonEl);
const modalTituloEl = document.getElementById('modal-pokemon-titulo');
const modalImagenEl = document.getElementById('modal-pokemon-imagen');
const modalTiposEl = document.getElementById('modal-pokemon-tipos');
const modalHabilidadesEl = document.getElementById('modal-pokemon-habilidades');
const modalMovimientosEl = document.getElementById('modal-pokemon-movimientos');

/**
 * Trae el detalle completo (imagen, tipos, habilidades, movimientos) de un
 * pokémon a partir de la URL que devuelve el listado general.
 */
async function obtenerDetallePokemon(urlPokemon) {
    const respuesta = await fetch(urlPokemon);
    if (!respuesta.ok) {
        throw new Error(`No se pudo obtener el pokémon en ${urlPokemon}`);
    }
    return respuesta.json();
}

/**
 * Trae una tanda de pokémon (nombre + detalle) a partir de un offset y un límite,
 * usando el endpoint de listado y luego resolviendo el detalle de cada uno.
 */
async function obtenerTandaDePokemon(offset, limite) {
    const respuestaListado = await fetch(`${API_BASE}/pokemon?offset=${offset}&limit=${limite}`);
    if (!respuestaListado.ok) {
        throw new Error('No se pudo obtener el listado de pokémon');
    }
    const listado = await respuestaListado.json();

    const resultados = await Promise.allSettled(
        listado.results.map((pokemon) => obtenerDetallePokemon(pokemon.url))
    );

    // Se descartan los que hayan fallado, para que un error puntual no rompa toda la tanda.
    return resultados
        .filter((resultado) => resultado.status === 'fulfilled')
        .map((resultado) => resultado.value);
}

function obtenerImagenPokemon(detallePokemon) {
    return (
        detallePokemon.sprites?.other?.['official-artwork']?.front_default ||
        detallePokemon.sprites?.front_default ||
        ''
    );
}

/**
 * Crea el elemento <div class="col..."> con la carta de un pokémon para la grilla.
 */
function crearCartaPokemon(detallePokemon) {
    const columna = document.createElement('div');
    columna.className = 'col-6 col-sm-4 col-md-3 col-lg-2';

    const numero = String(detallePokemon.id).padStart(3, '0');
    const imagen = obtenerImagenPokemon(detallePokemon);

    const tiposHtml = detallePokemon.types
        .map((info) => `<span class="badge-tipo tipo-${info.type.name}">${info.type.name}</span>`)
        .join('');

    columna.innerHTML = `
        <div class="carta-pokemon">
            <span class="numero-pokemon">#${numero}</span>
            <img src="${imagen}" alt="${detallePokemon.name}" loading="lazy">
            <p class="nombre-pokemon">${detallePokemon.name}</p>
            <div class="tipos-pokemon">${tiposHtml}</div>
            <button type="button" class="btn btn-outline-secondary btn-sm btn-ver-mas">
                Ver más
            </button>
        </div>
    `;

    columna.querySelector('.btn-ver-mas').addEventListener('click', () => {
        mostrarDetallePokemon(detallePokemon);
    });

    return columna;
}

/**
 * Llena y abre el modal de Bootstrap con el detalle de un pokémon puntual.
 */
function mostrarDetallePokemon(detallePokemon) {
    modalTituloEl.textContent = `#${detallePokemon.id} ${detallePokemon.name}`;

    const imagen = obtenerImagenPokemon(detallePokemon);
    modalImagenEl.src = imagen;
    modalImagenEl.alt = detallePokemon.name;

    modalTiposEl.innerHTML = detallePokemon.types
        .map((info) => `<span class="badge-tipo tipo-${info.type.name}">${info.type.name}</span>`)
        .join('');

    modalHabilidadesEl.innerHTML = detallePokemon.abilities
        .map((info) => `<li>${info.ability.name.replace(/-/g, ' ')}</li>`)
        .join('');

    modalMovimientosEl.innerHTML = detallePokemon.moves
        .slice(0, CANTIDAD_MOVIMIENTOS_A_MOSTRAR)
        .map((info) => `<li>${info.move.name.replace(/-/g, ' ')}</li>`)
        .join('');

    modalPokemon.show();
}

function mostrarSpinnerInicial(visible) {
    spinnerCargaEl.classList.toggle('d-none', !visible);
}

function mostrarSpinnerCargarMas(visible) {
    spinnerCargarMasEl.classList.toggle('d-none', !visible);
    btnCargarMasEl.disabled = visible;
}

function mostrarError(mensaje) {
    mensajeErrorEl.textContent = mensaje;
    mensajeErrorEl.classList.remove('d-none');
}

/**
 * Pide la siguiente tanda de pokémon, los agrega a la grilla y actualiza el offset.
 */
async function cargarMasPokemon() {
    try {
        const detalles = await obtenerTandaDePokemon(siguienteOffset, CANTIDAD_POR_TANDA);
        detalles.forEach((detallePokemon) => {
            grillaEl.appendChild(crearCartaPokemon(detallePokemon));
        });
        siguienteOffset += CANTIDAD_POR_TANDA;

        if (detalles.length === 0) {
            btnCargarMasEl.classList.add('d-none');
        }
    } catch (error) {
        console.error(error);
        mostrarError('Ocurrió un error al cargar más pokémon. Probá de nuevo en unos segundos.');
    }
}

btnCargarMasEl.addEventListener('click', async () => {
    mostrarSpinnerCargarMas(true);
    await cargarMasPokemon();
    mostrarSpinnerCargarMas(false);
});

async function inicializar() {
    mostrarSpinnerInicial(true);
    try {
        await cargarMasPokemon(); // primera tanda: los primeros 151 pokémon
        btnCargarMasEl.classList.remove('d-none');
    } catch (error) {
        console.error(error);
        mostrarError('No se pudo cargar la Pokédex. Revisá tu conexión y volvé a intentar.');
    } finally {
        mostrarSpinnerInicial(false);
    }
}

inicializar();
