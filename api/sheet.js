export default async function handler(req, res) {
  // Configuración CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  // Responder a solicitudes OPTIONS para preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const scriptUrl = process.env.APPS_SCRIPT_URL;

  if (!scriptUrl) {
    return res.status(500).json({ error: "Falta configurar la variable APPS_SCRIPT_URL en Vercel." });
  }

  try {
    const response = await fetch(scriptUrl, {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
      },
      body: req.method === "POST" ? JSON.stringify(req.body) : undefined,
    });

    const data = await response.text(); 
    
    // Intentaremos parsearlo si es JSON. Apps Script a veces retorna texto o HTML.
    try {
      const jsonData = JSON.parse(data);
      return res.status(200).json(jsonData);
    } catch (e) {
      return res.status(200).send(data);
    }
  } catch (error) {
    console.error("Error al comunicarse con Apps Script:", error);
    return res.status(500).json({ error: "Error en el servidor al enviar los datos." });
  }
}
