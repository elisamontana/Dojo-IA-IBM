const AssistantV2 = require('ibm-watson/assistant/v2');
const { IamAuthenticator } = require('ibm-watson/auth');
var mySession;
var textFromAudio;
var watsonResponse;

const fs = require('fs');
const SpeechToTextV1 = require('ibm-watson/speech-to-text/v1');
const { stringify } = require('querystring');

const TextToSpeechV1 = require('ibm-watson/text-to-speech/v1');

// Autentificar el servicio de Speech to Text, completar con api key y service url
const speechToText = new SpeechToTextV1({
  authenticator: new IamAuthenticator({ apikey: '' }),
  serviceUrl: ''
});

// Mediante Speech to Text, obtengo del audio .wav la transcripción 
const paramsSpeechToText = {
  audio: fs.createReadStream('audioPhone.wav'),
  contentType: 'audio/wav; rate=44100'
};

speechToText.recognize(paramsSpeechToText)
  .then(response => {
    textFromAudio = response.result.results[0].alternatives[0].transcript;
    message();
  })
  .catch(err => {
    console.log(err);
  });
  
// Para verificar la correcta transcripción, genero un .txt
fs.createReadStream('audioPhone.wav')
  .pipe(speechToText.recognizeUsingWebSocket({ contentType: 'audio/wav; rate=44100' }))
  .pipe(fs.createWriteStream('./transcription.txt'));

// Conexion al assistant, inicio de la sesión
// Completar con api key y service url de tu instancia de Watson.
const assistant = new AssistantV2({
  authenticator: new IamAuthenticator({ apikey: '' }),
  serviceUrl: '',
  version: '2018-09-19'
});

// Iniciar a Watson Assistant desde cloud.ibm.com, seleccionar los "tres puntitos" del asistente que desees utilizar 
// para esta demo y pulsar en Settings, desde allí podrás acceder al assistant id y completar el siguiente campo.
assistant.createSession({
  assistantId: ''
})
  .then(res => {
    mySession = res.result.session_id;
    message();
  })
  .catch(err => {
    console.log(err);
  });

// Inicializo Text to Speech para pasar a audio la respuesta de Watson
// Completar con api key y service url de tu instancia de Text to Speech
const textToSpeech = new TextToSpeechV1({
  authenticator: new IamAuthenticator({ apikey: '' }),
  serviceUrl: ''
});

// Mismo assistant id utilizado anteriormente
async function message() {
  await assistant.message(
      {
        input: { text: textFromAudio },
        assistantId: '',
        sessionId: mySession,
      })
      .then(response => {
        watsonResponse = response.result.output.generic[0].text;
        
        // Genero un audio .wav con la respuesta de Watson
        const paramsTextToSpeech = {
          text: watsonResponse, 
          voice: 'en-US_AllisonVoice', 
          accept: 'audio/wav'
        };        
        textToSpeech
          .synthesize(paramsTextToSpeech)
          .then(response => {
            const audio = response.result;
            return textToSpeech.repairWavHeaderStream(audio);
          })
          .then(repairedFile => {
            fs.writeFileSync('audioResponse.wav', repairedFile);
            //console.log('audioResponse.wav written with a corrected wav header');
          })
          .catch(err => {
            console.log(err);
          });

      })
      .catch(err => {
          console.log(err);
      });
}
