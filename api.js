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
      throw new Error("Error en la respuesta del servidor");
    }
    
    alert("¡Día guardado con éxito! 🎉");
  } catch (err) {
    alert("Hubo un error al guardar el día. Revisa tu conexión y que la URL esté bien configurada en Vercel.");
    console.error(err);
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
}
