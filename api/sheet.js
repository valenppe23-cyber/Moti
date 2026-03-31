const { getSheetsInstance, SPREADSHEET_ID } = require('./_lib/sheets');

// Formato de fecha YYYY-MM-DD local (Argentina/Chile en Vercel puede requerir ajuste)
function formatDate(d) {
  const [day, month, year] = d.toLocaleDateString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).split('/');
  return `${year}-${month}-${day}`;
}

function getDayName(d) {
  const days = ["Domingo","Lunes","Martes","Miércoles","Jueves","Viernes","Sábado"];
  const dayIndex = new Date(d.toLocaleString("en-US", {timeZone: "America/Argentina/Buenos_Aires"})).getDay();
  return days[dayIndex];
}

export default async function handler(req, res) {
  // Configuración CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (!SPREADSHEET_ID) {
    return res.status(500).json({ error: "Falta configurar la variable 'sheetsid' en Vercel." });
  }

  if (req.method === 'GET') {
    try {
      const SHEET_NAME = 'Registro';
      const sheets = await getSheetsInstance();
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${SHEET_NAME}'!A4:Y`,
      });
      
      const rows = response.data.values || [];
      const parsedRows = rows.map(r => {
        while(r.length < 25) r.push(''); // Llenar columnas vacías

        const vComida = (val) => val === '✓' ? 'yes' : null;
        const vSwitch = (val) => val === '✓' ? true : false;

        return {
          fecha: r[0],
          dia: r[1],
          valen: {
            desayuno: vComida(r[2]), almuerzo: vComida(r[3]), merienda: vComida(r[4]), cena: vComida(r[5]),
            postre: vSwitch(r[6]), ejercicio: vSwitch(r[7]), aprendi: vSwitch(r[8]), trabajo: vSwitch(r[9]),
            total: r[10], agradezco: r[11], manana: r[12]
          },
          el: {
            desayuno: vComida(r[13]), almuerzo: vComida(r[14]), merienda: vComida(r[15]), cena: vComida(r[16]),
            postre: vSwitch(r[17]), ejercicio: vSwitch(r[18]), aprendi: vSwitch(r[19]), trabajo: vSwitch(r[20]),
            total: r[21], agradezco: r[22], manana: r[23]
          },
          ganador: r[24]
        };
      });
      return res.status(200).json({ rows: parsedRows });
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Method Not Allowed." });
  }

  if (!SPREADSHEET_ID) {
    return res.status(500).json({ error: "Falta configurar la variable 'sheetsid' en Vercel." });
  }

  try {
    const data = req.body;
    const SHEET_NAME = 'Registro';
    const sheets = await getSheetsInstance();
    
    // Obtener los datos actuales para saber qué fila machacar o agregar
    const today = formatDate(new Date());
    const dayName = getDayName(new Date());
    
    // Leemos la columna A buscando fechas
    let targetRow = -1;
    let lastRow = 3; // Suponemos que 3 son tus headers fijos
    try {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `'${SHEET_NAME}'!A:A`,
      });
      const rows = response.data.values || [];
      lastRow = rows.length; // la cantidad de filas ocupadas
      
      // Buscar la linea de hoy (fila 4 en adelante)
      if (lastRow >= 4) {
        for (let i = 3; i < rows.length; i++) {
          if (rows[i][0] === today) {
            targetRow = i + 1; // 1-indexed
            break;
          }
        }
      }
    } catch (e) {
      console.error('Error al leer hojas', e.message);
      // Si la hoja está vacía, lastRow será 0.
    }
    
    if (targetRow === -1) {
      targetRow = lastRow + 1;
    }

    const v = data.valen || {};
    const el = data.el || {};

    // Helper: Si la comida es 'yes' es 1 punto, si es switch (true) es 1 punto.
    const isVal = (val) => val === 'yes' || val === true;
    
    const vTotal = (+isVal(v.desayuno)) + (+isVal(v.almuerzo)) + (+isVal(v.merienda)) + (+isVal(v.cena))
                 + (+isVal(v.postre)) + (+isVal(v.ejercicio)) + (+isVal(v.aprendi)) + (+isVal(v.trabajo));
    const eTotal = (+isVal(el.desayuno)) + (+isVal(el.almuerzo)) + (+isVal(el.merienda)) + (+isVal(el.cena))
                 + (+isVal(el.postre)) + (+isVal(el.ejercicio)) + (+isVal(el.aprendi)) + (+isVal(el.trabajo));

    let ganador = "Empate 🤝";
    if (vTotal > eTotal) ganador = "Valentina 🌹";
    if (eTotal > vTotal) ganador = "Él 🌿";

    const boolStr = val => isVal(val) ? "✓" : "—";

    const newRow = [
      today, dayName,
      // Valentina
      boolStr(v.desayuno), boolStr(v.almuerzo), boolStr(v.merienda), boolStr(v.cena),
      boolStr(v.postre), boolStr(v.ejercicio), boolStr(v.aprendi), boolStr(v.trabajo),
      vTotal,
      v.agradezco || "", v.manana || "",
      // Él
      boolStr(el.desayuno), boolStr(el.almuerzo), boolStr(el.merienda), boolStr(el.cena),
      boolStr(el.postre), boolStr(el.ejercicio), boolStr(el.aprendi), boolStr(el.trabajo),
      eTotal,
      el.agradezco || "", el.manana || "",
      // Resultado
      ganador
    ];

    // Actualizamos o Agregamos (Update Range)
    const updateRange = `'${SHEET_NAME}'!A${targetRow}:Y${targetRow}`;
    
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: updateRange,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [newRow],
      },
    });

    return res.status(200).json({ ok: true, savedDate: today, row: targetRow, vTotal, eTotal, ganador });
  } catch (error) {
    console.error("Error en la conexión a Google Sheets:", error);
    return res.status(500).json({ error: error.message || "Error en el servidor al enviar los datos a Google Sheets." });
  }
}
