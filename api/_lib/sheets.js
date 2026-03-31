const { google } = require('googleapis');

// Leemos las variables exactas que configuraste en Vercel
const SPREADSHEET_ID = process.env.sheetsid || process.env.SPREADSHEET_ID || '';

let _authClient = null;

async function getAuthClient() {
  if (_authClient) return _authClient;
  
  const emailVar = process.env.googlemail || '';
  const privateKey = (process.env.Googlekey || '').trim().replace(/\\n/g, '\n').replace(/"/g, '');

  let credentials;
  if (emailVar && privateKey) {
    credentials = { client_email: emailVar.trim(), private_key: privateKey };
  } else {
    throw new Error('Faltan configurar las variables Googlekey o googlemail en Vercel.');
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets', // Lectura y escritura
      'https://www.googleapis.com/auth/drive',
    ],
  });
  _authClient = await auth.getClient();
  return _authClient;
}

async function getSheetsInstance() {
  const auth = await getAuthClient();
  return google.sheets({ version: 'v4', auth });
}

module.exports = { getAuthClient, getSheetsInstance, SPREADSHEET_ID };
