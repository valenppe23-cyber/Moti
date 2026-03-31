// Capa de comunicación con la API de Vercel

const API_URL = "/api/sheet";

async function guardarDia() {
  const btn = document.getElementById('guardar-dia-btn');
  const originalText = btn.textContent;
  btn.textContent = "Guardando...";
  btn.disabled = true;

  const payload = {
    valen: Object.assign({}, state.valen, { 
      manana: document.querySelectorAll("textarea")[1].value, 
      agradezco: document.querySelectorAll("textarea")[0].value 
    }),
    el: Object.assign({}, state.el, { 
      manana: document.querySelectorAll("textarea")[3].value, 
      agradezco: document.querySelectorAll("textarea")[2].value 
    })
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
        renderCalendar();
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

// --- Views and Calendar Logic ---

let currentMonthDate = new Date();

function switchView(viewId, btn) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  
  if (viewId === 'home') {
    document.getElementById('home-view').classList.add('active');
    if (btn) btn.classList.add('active');
  } else {
    document.getElementById('calendar-view').classList.add('active');
    if (btn) btn.classList.add('active');
    renderCalendar();
  }
}

function changeMonth(offset) {
  currentMonthDate.setMonth(currentMonthDate.getMonth() + offset);
  renderCalendar();
}

function renderCalendar() {
  const grid = document.getElementById('calendar-grid');
  const monthYearEl = document.getElementById('cal-month-year');
  if (!grid || !monthYearEl) return;
  
  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();
  
  const monthsEs = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  monthYearEl.textContent = `${monthsEs[month]} ${year}`;
  
  // Headers
  const daysHeader = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  let html = daysHeader.map(d => `<div class="cal-day-header">${d}</div>`).join('');
  
  const firstDay = new Date(year, month, 1).getDay();
  const firstDayIndex = firstDay === 0 ? 6 : firstDay - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  // Empty slots
  for (let i = 0; i < firstDayIndex; i++) {
    html += `<div class="cal-cell cal-empty"></div>`;
  }
  
  const today = new Date();
  
  const historyMap = {};
  if (window.historicoDias) {
    window.historicoDias.forEach(r => {
      if (r.fecha) historyMap[r.fecha] = r;
    });
  }
  
  for (let i = 1; i <= daysInMonth; i++) {
    const isToday = today.getDate() === i && today.getMonth() === month && today.getFullYear() === year;
    const dateStr = `${year}-${String(month+1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    
    let cellClass = 'cal-cell';
    if (isToday) cellClass += ' today';
    
    let content = '';
    const dayData = historyMap[dateStr];
    
    if (dayData) {
      const scoreV = dayData.valen ? (Number(dayData.valen.total) || 0) : 0;
      const scoreE = dayData.el ? (Number(dayData.el.total) || 0) : 0;
      
      if (scoreV > scoreE) {
        cellClass += ' winner-valen';
        content = '<div class="cal-result">🌹</div>';
      } else if (scoreE > scoreV) {
        cellClass += ' winner-el';
        content = '<div class="cal-result">🌿</div>';
      } else if (scoreE === scoreV && (scoreE > 0 || scoreV > 0)) {
         cellClass += ' winner-tie';
         content = '<div class="cal-result">🤝</div>';
      }
      
      html += `<div class="${cellClass}" onclick="showDayDetail('${dateStr}')"><span class="cal-date">${i}</span>${content}</div>`;
    } else {
       html += `<div class="${cellClass}"><span class="cal-date">${i}</span></div>`;
    }
  }
  
  grid.innerHTML = html;
}

function showDayDetail(dateStr) {
  const dayData = window.historicoDias ? window.historicoDias.find(r => r.fecha === dateStr) : null;
  if (!dayData) return;
  
  const scoreV = dayData.valen ? (Number(dayData.valen.total) || 0) : 0;
  const scoreE = dayData.el ? (Number(dayData.el.total) || 0) : 0;
  
  let winnerText = 'Empate 🤝';
  if (scoreV > scoreE) winnerText = 'Ganó Valen 🌹';
  if (scoreE > scoreV) winnerText = 'Ganó Él 🌿';
  
  const parts = dateStr.split('-');
  const dateFormatted = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : dateStr;
  
  const content = document.getElementById('day-detail-content');
  const dv = dayData.valen || {};
  const de = dayData.el || {};

  content.innerHTML = `
    <div style="margin-bottom: 2rem; text-align: center;">
      <h3 style="font-family: 'Playfair Display', serif; color: var(--ink-dark); font-size: 1.5rem; margin-bottom: 0.5rem; margin-top: 0;">${dateFormatted}</h3>
      <div style="font-size: 1.1rem; color: var(--olive-dark); font-weight: bold;">${winnerText}</div>
    </div>
    
    <div style="display: flex; gap: 1rem; margin-bottom: 2rem;">
      <div style="flex: 1; background: white; border-radius: 12px; padding: 1rem; box-shadow: 0 4px 10px rgba(0,0,0,0.05); border: 2px solid rgba(220, 53, 69, 0.1);">
        <h4 style="text-align: center; color: #b5625a; margin: 0 0 1rem 0;">Valen</h4>
        <div style="text-align: center; font-size: 2rem; font-weight: bold; color: #b5625a; margin-bottom: 1rem;">${scoreV}</div>
        <div style="font-size: 0.85rem; color: var(--ink-core);">
           <p style="margin: 0.3rem 0;"><strong>Desayuno:</strong> ${translateChoice(dv.desayuno)}</p>
           <p style="margin: 0.3rem 0;"><strong>Almuerzo:</strong> ${translateChoice(dv.almuerzo)}</p>
           <p style="margin: 0.3rem 0;"><strong>Merienda:</strong> ${translateChoice(dv.merienda)}</p>
           <p style="margin: 0.3rem 0;"><strong>Cena:</strong> ${translateChoice(dv.cena)}</p>
           <p style="margin: 0.3rem 0;"><strong>Sin Postre:</strong> ${!isTrue(dv.postre) ? 'Sí 👏' : 'No 🍰'}</p>
           <p style="margin: 0.3rem 0;"><strong>Ejercicio:</strong> ${isTrue(dv.ejercicio) ? 'Sí 🏃' : 'No'}</p>
           <p style="margin: 0.3rem 0;"><strong>Aprendí:</strong> ${isTrue(dv.aprendi) ? 'Sí 📖' : 'No'}</p>
           <p style="margin: 0.3rem 0;"><strong>Trabajo:</strong> ${isTrue(dv.trabajo) ? 'Sí 💼' : 'No'}</p>
        </div>
      </div>
      
      <div style="flex: 1; background: white; border-radius: 12px; padding: 1rem; box-shadow: 0 4px 10px rgba(0,0,0,0.05); border: 2px solid rgba(138, 168, 120, 0.2);">
        <h4 style="text-align: center; color: #8aa878; margin: 0 0 1rem 0;">Él</h4>
        <div style="text-align: center; font-size: 2rem; font-weight: bold; color: #8aa878; margin-bottom: 1rem;">${scoreE}</div>
        <div style="font-size: 0.85rem; color: var(--ink-core);">
           <p style="margin: 0.3rem 0;"><strong>Desayuno:</strong> ${translateChoice(de.desayuno)}</p>
           <p style="margin: 0.3rem 0;"><strong>Almuerzo:</strong> ${translateChoice(de.almuerzo)}</p>
           <p style="margin: 0.3rem 0;"><strong>Merienda:</strong> ${translateChoice(de.merienda)}</p>
           <p style="margin: 0.3rem 0;"><strong>Cena:</strong> ${translateChoice(de.cena)}</p>
           <p style="margin: 0.3rem 0;"><strong>Sin Postre:</strong> ${!isTrue(de.postre) ? 'Sí 👏' : 'No 🍰'}</p>
           <p style="margin: 0.3rem 0;"><strong>Ejercicio:</strong> ${isTrue(de.ejercicio) ? 'Sí 🏃' : 'No'}</p>
           <p style="margin: 0.3rem 0;"><strong>Aprendí:</strong> ${isTrue(de.aprendi) ? 'Sí 📖' : 'No'}</p>
           <p style="margin: 0.3rem 0;"><strong>Trabajo:</strong> ${isTrue(de.trabajo) ? 'Sí 💼' : 'No'}</p>
        </div>
      </div>
    </div>
    
    ${dv.agradezco || de.agradezco ? `
    <div style="background: white; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
       <h4 style="color: var(--olive-dark); margin: 0 0 1rem 0;">🌿 Agradecimientos</h4>
       ${dv.agradezco ? `<p style="font-size:0.9rem; margin-bottom: 1rem;"><strong>Valen:</strong><br>${dv.agradezco}</p>` : ''}
       ${de.agradezco ? `<p style="font-size:0.9rem; margin-bottom: 0;"><strong>Él:</strong><br>${de.agradezco}</p>` : ''}
    </div>` : ''}
    
    ${dv.manana || de.manana ? `
    <div style="background: white; border-radius: 12px; padding: 1.5rem; margin-bottom: 1.5rem; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
       <h4 style="color: var(--olive-dark); margin: 0 0 1rem 0;">✨ Para Mañana</h4>
       ${dv.manana ? `<p style="font-size:0.9rem; margin-bottom: 1rem;"><strong>Valen:</strong><br>${dv.manana}</p>` : ''}
       ${de.manana ? `<p style="font-size:0.9rem; margin-bottom: 0;"><strong>Él:</strong><br>${de.manana}</p>` : ''}
    </div>` : ''}
    
    <div style="text-align: center;">
      <button onclick="closeDetailModal()" style="background: var(--ink-soft); color: white; padding: 0.8rem 2rem; border-radius: 50px; border: none; font-weight: bold; cursor: pointer;">Cerrar</button>
    </div>
  `;
  
  const modal = document.getElementById('day-detail-modal');
  const modalContent = document.getElementById('day-detail-content');
  modal.style.opacity = '1';
  modal.style.pointerEvents = 'all';
  setTimeout(() => {
    modalContent.style.transform = 'translateY(0)';
  }, 10);
}

function closeDetailModal() {
  const modal = document.getElementById('day-detail-modal');
  const modalContent = document.getElementById('day-detail-content');
  modalContent.style.transform = 'translateY(100%)';
  setTimeout(() => {
    modal.style.opacity = '0';
    modal.style.pointerEvents = 'none';
  }, 300);
}

function translateChoice(val) {
   if (val === 'yes') return 'Bien ✔️';
   if (val === 'no') return 'Mal ❌';
   return '-';
}

function isTrue(val) {
   return val === true || String(val).toLowerCase() === 'true';
}
