// Papa's Record Lookup — backend configuration.
//
// Repointed to your own Railway backend. Replace the two placeholders below:
//   1. YOUR-RAILWAY-APP.up.railway.app  -> your deployed Railway domain
//      (or a custom domain you've attached to the service)
//   2. firebaseWebApiKey -> the Web API key of YOUR Firebase project
//      (Firebase console -> Project settings -> General -> Web API Key)
//
// This is the same Firebase project you set as FIREBASE_PROJECT_ID / FIREBASE_WEB_API_KEY
// on the server, so the extension and the dashboard share the same user accounts.
globalThis.CONTEXT_LAYER_CONFIG = {
  firebaseWebApiKey: "YOUR_FIREBASE_WEB_API_KEY",
  recordUploadUrl: "https://YOUR-RAILWAY-APP.up.railway.app/record-upload",
  recordGeocodeUrl: "https://YOUR-RAILWAY-APP.up.railway.app/record-geocode",
};
