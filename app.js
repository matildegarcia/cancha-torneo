const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx_0NapX-dKJt9en4FXrS4foPO73yiFbITeuzrd_a3kXGR3zN6DQibrlEOCWavbFYIb/exec";

// Tienen que ser iguales a los de Code.gs
const MIN_JUGADORES = 8;
const MAX_JUGADORES = 15;

const lista = document.getElementById("lista");
const contador = document.getElementById("contador");
const btnAgregar = document.getElementById("agregar");
const errorEl = document.getElementById("error");
const form = document.getElementById("form");
const btnEnviar = document.getElementById("enviar");

document.getElementById("ayudaJug").textContent =
  "Cargá entre " + MIN_JUGADORES + " y " + MAX_JUGADORES +
  " jugadores, con nombre completo y cédula (solo números).";

function nuevaFila() {
  const div = document.createElement("div");
  div.className = "jugador";
  div.innerHTML =
    '<div><label class="form-label small fw-semibold text-secondary mb-1">Nombre y apellido</label>' +
    '<input type="text" class="form-control j-nombre" maxlength="60" autocomplete="off"></div>' +
    '<div><label class="form-label small fw-semibold text-secondary mb-1">Cédula</label>' +
    '<input type="text" class="form-control j-cedula" inputmode="numeric" maxlength="12" autocomplete="off" placeholder="Sin puntos ni guión"></div>' +
    '<button type="button" class="quitar" aria-label="Quitar jugador" title="Quitar jugador">✕</button>';
  
  div.querySelector(".quitar").addEventListener("click", function () {
    div.remove();
    actualizar();
  });
  
  lista.appendChild(div);
  actualizar();
}

function actualizar() {
  const filas = Array.from(lista.children);
  const n = filas.length;
  
  contador.textContent = n + " de " + MAX_JUGADORES + " jugadores cargados (mínimo " + MIN_JUGADORES + ").";
  btnAgregar.disabled = n >= MAX_JUGADORES;
  
  // Ocultar la "✕" de quitar en los primeros 8 jugadores obligatorios (índices 0 a 7)
  filas.forEach(function (f, index) {
    const btnQuitar = f.querySelector(".quitar");
    if (index < MIN_JUGADORES || n <= MIN_JUGADORES) {
      btnQuitar.classList.add("quitar-oculto");
    } else {
      btnQuitar.classList.remove("quitar-oculto");
    }
  });
}

btnAgregar.addEventListener("click", function () {
  nuevaFila();
  const inputs = lista.querySelectorAll(".j-nombre");
  inputs[inputs.length - 1].focus();
});

for (let i = 0; i < MIN_JUGADORES; i++) nuevaFila();

function validar() {
  let ok = true;
  let msg = "";
  function falla(el, m) {
    el.classList.add("invalido");
    ok = false;
    if (!msg) msg = m;
  }
  form.querySelectorAll(".invalido").forEach(function (e) { e.classList.remove("invalido"); });

  const equipo = document.getElementById("equipo");
  const delegado = document.getElementById("delegado");
  const celular = document.getElementById("celular");
  const mail = document.getElementById("mail");

  if (!equipo.value.trim()) falla(equipo, "Escribí el nombre del cuadro.");
  if (!delegado.value.trim()) falla(delegado, "Escribí el nombre del delegado.");
  if (celular.value.replace(/\D/g, "").length < 8) falla(celular, "Revisá el número de celular.");
  if (mail.value.trim() && !/^\S+@\S+\.\S+$/.test(mail.value.trim())) falla(mail, "El mail no parece válido.");

  const vistas = new Set();
  const filas = Array.from(lista.children);
  filas.forEach(function (f) {
    const nom = f.querySelector(".j-nombre");
    const ced = f.querySelector(".j-cedula");
    const c = ced.value.replace(/\D/g, "");
    if (!nom.value.trim()) falla(nom, "Falta el nombre de un jugador. Completalo o quitá la fila.");
    if (c.length < 6 || c.length > 8) falla(ced, "Revisá las cédulas: tienen que ser solo números (6 a 8 dígitos).");
    else if (vistas.has(c)) falla(ced, "Hay una cédula repetida en la lista.");
    vistas.add(c);
  });

  if (filas.length < MIN_JUGADORES) { ok = false; if (!msg) msg = "Necesitás al menos " + MIN_JUGADORES + " jugadores."; }
  if (!document.getElementById("acepto").checked) { ok = false; if (!msg) msg = "Tenés que aceptar el reglamento."; }

  errorEl.textContent = msg;
  return ok;
}

form.addEventListener("submit", async function (e) {
  e.preventDefault();
  if (!validar()) return;
  if (SCRIPT_URL.indexOf("PEGAR_AQUI") === 0) {
    errorEl.textContent = "Falta configurar la URL del script (ver instrucciones).";
    return;
  }

  const datos = {
    equipo: document.getElementById("equipo").value.trim(),
    color: document.getElementById("color").value.trim(),
    delegado: document.getElementById("delegado").value.trim(),
    celular: document.getElementById("celular").value.trim(),
    mail: document.getElementById("mail").value.trim(),
    jugadores: Array.from(lista.children).map(function (f) {
      return {
        nombre: f.querySelector(".j-nombre").value.trim(),
        cedula: f.querySelector(".j-cedula").value.replace(/\D/g, "")
      };
    })
  };

  btnEnviar.disabled = true;
  btnEnviar.textContent = "Enviando...";
  errorEl.textContent = "";

  try {
    const r = await fetch(SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(datos)
    });
    const res = await r.json();
    if (res.ok) {
      form.style.display = "none";
      document.getElementById("listo").style.display = "block";
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      errorEl.textContent = res.mensaje || "No se pudo guardar la inscripción.";
    }
  } catch (err) {
    errorEl.textContent = "No pudimos confirmar el envío. Revisá tu conexión y, antes de reenviar, consultá al organizador por si ya quedó anotado.";
  } finally {
    btnEnviar.disabled = false;
    btnEnviar.textContent = "Enviar inscripción";
  }
});