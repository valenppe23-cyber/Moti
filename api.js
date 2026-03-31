// Capa de comunicación con la API de Vercel

const API_URL = "/api/sheet";

async function guardarDia() {
  const btn = document.getElementById('guardar-dia-btn');
  const originalText = btn.textContent;
  btn.textContent = "Guardando...";
  btn.disabled = true;

  const payload = {
    valen: { 
      ...state.valen, 
      manana: document.querySelectorAll("textarea")[1].value, 
      agradezco: document.querySelectorAll("textarea")[0].value 
    },
    el: { 
      ...state.el, 
      manana: document.querySelectorAll("textarea")[3].value, 
      agradezco: document.querySelectorAll("textarea")[2].value 
    }
  };

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      let errorMsg = "Error en la respuesta del servidor";
      try {
        const errorData = await response.json();
        if (errorData.error) errorMsg = errorData.error;
      } catch (e) {}
      throw new Error(errorMsg);
    }
    
    alert("¡Día guardado con éxito! 🎉");
  } catch (err) {
    alert("Hubo un error al guardar el día:\n\n" + err.message + "\n\nAsegúrate de que la URL de Apps Script esté configurada en Vercel.");
    console.error(err);
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
}

/* --- Hydration Logic --- */

const SABIAS_QUE_FACTS = [
  "El cuerpo humano adulto tiene 206 huesos, pero un bebé nace con casi 300.",
  "Comer 2 kiwis antes de ir a dormir mejora la calidad del sueño debido a su alto contenido de serotonina.",
  "El músculo más fuerte y con más resistencia de tu cuerpo en relación a su tamaño es el de la mandíbula (masetero).",
  "Moverte tan solo 30 minutos al día reduce en gran medida el riesgo de problemas cardíacos y fortalece tu mente.",
  "Las personas más creativas suelen tener picos de actividad cerebral durante la noche.",
  "La piel es el órgano más grande de tu cuerpo y se renueva por completo cada 28 días.",
  "Reír a carcajadas durante 15 minutos puede quemar hasta 40 calorías. ¡Sonríe más!",
  "El aguacate o palta tiene más potasio que una banana, lo que ayuda a prevenir calambres musculares."
];

// Show random fact
const factEl = document.getElementById('sabias-que-text');
if (factEl) {
  factEl.textContent = SABIAS_QUE_FACTS[Math.floor(Math.random() * SABIAS_QUE_FACTS.length)];
}

// Fetch today's data
document.addEventListener('DOMContentLoaded', cargarDia);

async function cargarDia() {
  try {
    const response = await fetch(API_URL);
    if (response.ok) {
      const data = await response.json();
      
      const d = new Date();
      const [day, month, year] = d.toLocaleDateString('es-AR', {
        timeZone: 'America/Argentina/Buenos_Aires',
        year: 'numeric', month: '2-digit', day: '2-digit'
      }).split('/');
      const todayStr = `${year}-${month}-${day}`;
      
      const todayRow = data.rows ? data.rows.find(r => r.fecha === todayStr) : null;
      if (todayRow) {
        syncUIWithState(todayRow);
      }
      
      if (data.rows) {
        window.historicoDias = data.rows;
        renderHistorial();
      }
    }
  } catch(e) {
    console.error("Error al sincronizar datos:", e);
  } finally {
    // Hide overlay
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 500);
    }
  }
}

function syncUIWithState(remoteRow) {
  if (!remoteRow || !remoteRow.valen || !remoteRow.el) return;

  ['valen', 'el'].forEach(who => {
    const rData = remoteRow[who];
    const sData = state[who];

    // Meals
    ['desayuno', 'almuerzo', 'merienda', 'cena'].forEach(m => {
      sData[m] = rData[m]; // 'yes', 'no', null
      if (sData[m] === 'yes') {
        const btn = document.getElementById(`${who}-${m}-yes`);
        if (btn) btn.classList.add('yes');
      } else if (sData[m] === 'no') {
        const btn = document.getElementById(`${who}-${m}-no`);
        if (btn) btn.classList.add('no');
      }
    });

    // Switches
    ['postre', 'ejercicio', 'aprendi', 'trabajo'].forEach(k => {
      sData[k] = rData[k] === true || String(rData[k]).toLowerCase() === 'true'; // Parse correctly
      if (sData[k]) {
        const sw = document.getElementById(`sw-${who}-${k}`);
        if(sw) sw.classList.add('on');
      }
    });
  });

  // Textareas
  const textareas = document.querySelectorAll("textarea");
  if (textareas.length >= 4) {
    if (remoteRow.valen.agradezco) textareas[0].value = remoteRow.valen.agradezco;
    if (remoteRow.valen.manana) textareas[1].value = remoteRow.valen.manana;
    if (remoteRow.el.agradezco) textareas[2].value = remoteRow.el.agradezco;
    if (remoteRow.el.manana) textareas[3].value = remoteRow.el.manana;
  }
  
  if (typeof updateUI === 'function') updateUI();
}

// --- Historial Modal Logic ---

function renderHistorial() {
  const container = document.getElementById('historial-feed');
  if (!container || !window.historicoDias || window.historicoDias.length === 0) return;
  
  const rows = [...window.historicoDias].reverse(); // newest first
  container.innerHTML = '';

  rows.forEach(r => {
    // Prevent empty rows
    if (!r.fecha) return;

    const scoreV = Number(r.valen.total) || 0;
    const scoreE = Number(r.el.total) || 0;
    
    let winnerIcon = '🤝';
    let winnerClass = '';
    
    if (scoreV > scoreE) {
      winnerIcon = '🌹 Valen';
      winnerClass = 'color: #b5625a; font-weight: bold;';
    } else if (scoreE > scoreV) {
      winnerIcon = '🌿 Él';
      winnerClass = 'color: #8aa878; font-weight: bold;';
    } else {
      winnerIcon = '🤝 Empate';
      winnerClass = 'color: var(--ink-core); font-weight: bold;';
    }

    let dateFormatted = r.fecha;
    const parts = r.fecha.split('-');
    if (parts.length === 3) {
      dateFormatted = `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    const card = document.createElement('div');
    card.style.cssText = "background: white; padding: 1.2rem; border-radius: 12px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); text-align: left;";
    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.8rem; border-bottom: 1px dashed rgba(0,0,0,0.1); padding-bottom: 0.6rem;">
        <span style="font-size: 0.9rem; color: var(--ink-soft); font-weight: 500;">📅 ${r.dia ? (r.dia + ' - ') : ''}${dateFormatted}</span>
        <span style="${winnerClass} font-size: 0.95rem;">${winnerIcon}</span>
      </div>
      <div style="display: flex; justify-content: space-around; font-family: 'Playfair Display', serif; font-size: 1.2rem;">
        <div style="text-align: center; width: 45%;">
          <span style="font-size: 0.75rem; display: block; font-family:'Inter', sans-serif; color: var(--ink-soft); text-transform: uppercase;">Valen</span>
          <span style="color: #b5625a;">${scoreV} pts</span>
        </div>
        <div style="width: 1px; background: rgba(0,0,0,0.05);"></div>
        <div style="text-align: center; width: 45%;">
          <span style="font-size: 0.75rem; display: block; font-family:'Inter', sans-serif; color: var(--ink-soft); text-transform: uppercase;">Él</span>
          <span style="color: #8aa878;">${scoreE} pts</span>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

function toggleHistorial() {
  const modal = document.getElementById('historial-modal');
  if (modal.style.opacity === '1') {
    modal.style.opacity = '0';
    modal.style.pointerEvents = 'none';
  } else {
    modal.style.opacity = '1';
    modal.style.pointerEvents = 'all';
  }
}
