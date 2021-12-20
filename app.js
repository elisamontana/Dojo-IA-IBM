const AssistantV2 = require('ibm-watson/assistant/v2');
const { IamAuthenticator } = require('ibm-watson/auth');
var mySession;
var textFromAudio;
var watsonResponse;

const fs = require('fs');
const SpeechToTextV1 = require('ibm-watson/speech-to-text/v1');
const { stringify } = require('querystring');

const TextToSpeechV1 = require('ibm-watson/text-to-speech/v1');

// -------------------------
// Definición de credenciales de servicio
const service_credentials =
{
  "apikey": "9kagBdZqxckNDSJ0JoGKhMBI5Yfi8kiygHvjHzobdvga",
  "iam_apikey_description": "Auto-generated for key 95adf4cc-10d8-4eab-b918-07515ba11cad",
  "iam_apikey_name": "Auto-generated service credentials",
  "iam_role_crn": "crn:v1:bluemix:public:iam::::serviceRole:Manager",
  "iam_serviceid_crn": "crn:v1:bluemix:public:iam-identity::a/eadcd51e9c9c4467abd39a71d0077a2e::serviceid:ServiceId-63d358c9-df57-47a2-a779-59c543c49cb8",
  "url": "https://api.eu-gb.speech-to-text.watson.cloud.ibm.com/instances/980890d5-fd14-4d4b-ac48-0c3e23251e8f"
}

// Consulta de audio que se le hace a Watson 
const speechToText = new SpeechToTextV1({
  authenticator: new IamAuthenticator({ apikey: '9kagBdZqxckNDSJ0JoGKhMBI5Yfi8kiygHvjHzobdvga' }),
  serviceUrl: 'https://api.eu-gb.speech-to-text.watson.cloud.ibm.com/instances/980890d5-fd14-4d4b-ac48-0c3e23251e8f'
});

const params = {
  name: 'MiBelloModelito_IBMDeveloper',
  baseModelName: 'es-AR_NarrowbandModel',
  description: 'Modelo de ejemplo para IBM Developer',
};

async function createLanguageModel(params) {
  // Se invoca al método de creación de modelo con nuestros parámetros
  return speechToText.createLanguageModel(params)
      .then(languageModel => {
          // Se imprime en consola la respuesta del servicio
          return JSON.stringify(languageModel, null, 2);
      })
      .catch(err => {
          return err;
      });
}

// Llamado a la función e impresión del resultado
const result = await createLanguageModel(params);
console.log(result);
  

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
// creo un txt solo para verificar que es lo que se transcribe
fs.createReadStream('audioPhone.wav')
  .pipe(speechToText.recognizeUsingWebSocket({ contentType: 'audio/wav; rate=44100' }))
  .pipe(fs.createWriteStream('./transcription.txt'));

// Conexion al assistant, inicio de la sesión
const assistant = new AssistantV2({
  authenticator: new IamAuthenticator({ apikey: 'Ow4Gk2w2cxC7ktvyw_esUcEePR_Q5GB_SENC5dAkdkmU' }),
  serviceUrl: 'https://api.eu-gb.assistant.watson.cloud.ibm.com/instances/e7376622-63a6-4672-800d-75f14473d9bd',
  version: '2018-09-19'
});

assistant.createSession({
  assistantId: '3ca54b8e-d780-48d4-894b-41ee373150e5'
})
  .then(res => {
    mySession = res.result.session_id;
    //console.log(mySession);
    message();
  })
  .catch(err => {
    console.log(err);
  });

// Inicializo text to speech para pasar a audio la respuesta de watson
const textToSpeech = new TextToSpeechV1({
  authenticator: new IamAuthenticator({ apikey: 'L820HAL1bwKlSrZFr_RugLnnS6_RRrR562bSVJuSnQJJ' }),
  serviceUrl: 'https://api.eu-gb.text-to-speech.watson.cloud.ibm.com/instances/e4683dcf-f1a8-4e0f-a415-a5cb40302505'
});

async function message() {
  await assistant.message(
      {
        input: { text: textFromAudio },
        assistantId: '3ca54b8e-d780-48d4-894b-41ee373150e5',
        sessionId: mySession,
      })
      .then(response => {
        //console.log(JSON.stringify(response.result.output.generic, null, 2));
        watsonResponse = response.result.output.generic[0].text;
        //console.log(response.result.output.generic[0].text);
        
        // genero el audio con la respuesta de watson
        const paramsTextToSpeech = {
          text: watsonResponse, // lo que responda watson.
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