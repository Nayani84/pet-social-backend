const { google } = require('googleapis');

// Initialize OAuth2 client with your Google API credentials
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const SCOPES = ['https://www.googleapis.com/auth/calendar'];

// Function to generate authentication URL
function getAuthUrl() {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });
}

const getTokensFromCode = async (code) => {
  try {
      const { tokens } = await oauth2Client.getToken(code);
      if (!tokens) throw new Error('No tokens received');
      oauth2Client.setCredentials(tokens);
      return tokens;
  } catch (error) {
      console.error('Failed to retrieve tokens:', error);
      throw error; // Rethrow to handle upstream
  }
};

module.exports = {
  oauth2Client,
  getTokensFromCode,
  getAuthUrl,
  google
};
