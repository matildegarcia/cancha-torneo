// ===== CONFIGURACIÓN =====
const MAX_EQUIPOS = 16;      // cupo máximo de cuadros
const MIN_JUGADORES = 8;     // mínimo de jugadores por cuadro
const MAX_JUGADORES = 15;    // máximo de jugadores por cuadro

// ===== RECIBE LA INSCRIPCIÓN =====
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const d = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const shEq = hoja(ss, 'Equipos', ['Fecha', 'Equipo', 'Color de camiseta', 'Delegado', 'Celular', 'Mail', 'Cant. jugadores']);
    const shJu = hoja(ss, 'Jugadores', ['Fecha', 'Equipo', 'Nombre', 'Cédula']);

    const equipo = limpio(d.equipo);
    const jugadores = Array.isArray(d.jugadores) ? d.jugadores : [];

    // Validaciones
    if (!equipo || !limpio(d.delegado) || !limpio(d.celular)) return resp(false, 'Faltan datos del equipo o del delegado.');
    if (jugadores.length < MIN_JUGADORES || jugadores.length > MAX_JUGADORES)
      return resp(false, 'La lista debe tener entre ' + MIN_JUGADORES + ' y ' + MAX_JUGADORES + ' jugadores.');

    const equiposExistentes = shEq.getLastRow() > 1 ? shEq.getRange(2, 2, shEq.getLastRow() - 1, 1).getValues().flat() : [];
    if (equiposExistentes.length >= MAX_EQUIPOS) return resp(false, 'El cupo de equipos está completo.');
    if (equiposExistentes.some(n => String(n).trim().toLowerCase() === equipo.toLowerCase()))
      return resp(false, 'Ya hay un equipo inscripto con ese nombre.');

    const cedulasExistentes = shJu.getLastRow() > 1 ? shJu.getRange(2, 4, shJu.getLastRow() - 1, 1).getValues().flat().map(String) : [];
    const nuevas = jugadores.map(j => String(j.cedula).replace(/\D/g, ''));
    for (const c of nuevas) {
      if (c.length < 6 || c.length > 8) return resp(false, 'Hay una cédula con formato inválido.');
      if (cedulasExistentes.includes(c)) return resp(false, 'La cédula ' + c + ' ya está inscripta en otro equipo.');
    }
    if (new Set(nuevas).size !== nuevas.length) return resp(false, 'Hay cédulas repetidas en la lista.');

    // Guardado
    const ahora = Utilities.formatDate(new Date(), 'America/Montevideo', 'dd/MM/yyyy HH:mm');
    const filaEq = shEq.getLastRow() + 1;
    shEq.getRange(filaEq, 1, 1, 7).setNumberFormat('@');
    shEq.getRange(filaEq, 1, 1, 7).setValues([[ahora, equipo, limpio(d.color), limpio(d.delegado), limpio(d.celular), limpio(d.mail), jugadores.length]]);

    const filas = jugadores.map((j, i) => [ahora, equipo, limpio(j.nombre), nuevas[i]]);
    const filaJu = shJu.getLastRow() + 1;
    shJu.getRange(filaJu, 1, filas.length, 4).setNumberFormat('@');
    shJu.getRange(filaJu, 1, filas.length, 4).setValues(filas);

    return resp(true, 'Inscripción recibida');
  } catch (err) {
    return resp(false, 'Error al guardar: ' + err.message);
  } finally {
    lock.releaseLock();
  }
}

// ===== AUXILIARES =====
function hoja(ss, nombre, encabezados) {
  let sh = ss.getSheetByName(nombre);
  if (!sh) {
    sh = ss.insertSheet(nombre);
    sh.appendRow(encabezados);
    sh.getRange(1, 1, 1, encabezados.length).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

// Evita que un texto que empiece con = + - @ se interprete como fórmula
function limpio(v) {
  let s = String(v == null ? '' : v).trim();
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

function resp(ok, mensaje) {
  return ContentService.createTextOutput(JSON.stringify({ ok: ok, mensaje: mensaje }))
    .setMimeType(ContentService.MimeType.JSON);
}
