// The Web Speech API is not in TypeScript's DOM lib.
// Minimal declarations so the hook type-checks.
interface Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}
