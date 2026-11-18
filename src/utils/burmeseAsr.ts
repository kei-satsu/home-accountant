import type { InferenceSession as InferenceSessionType } from 'onnxruntime-web/wasm';

const MODEL_REVISION = 'e5041e673745d9fcd62872710820c22d8ccb9307';
const MODEL_URL = `https://huggingface.co/thura2/freococo-myanmar-asr-onnx/resolve/${MODEL_REVISION}/freococo.onnx`;
const VOCAB_URL = `https://huggingface.co/thura2/freococo-myanmar-asr-onnx/resolve/${MODEL_REVISION}/vocab.json`;
const MODEL_SIZE = 78_115_082;
const VOCAB_SIZE = 60_989;
const CACHE_NAME = 'home-accountant-burmese-asr-v1';

export interface BurmeseAsr {
  session: InferenceSessionType;
  vocabulary: string[];
}

let modelPromise: Promise<BurmeseAsr> | null = null;
let loadedModel: BurmeseAsr | null = null;

const downloadAsset = async (
  url: string,
  expectedSize: number,
  onProgress: (loaded: number) => void,
  progressOffset: number
) => {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(url);
  if (cached) {
    const bytes = new Uint8Array(await cached.arrayBuffer());
    if (bytes.byteLength === expectedSize) {
      onProgress(progressOffset + bytes.byteLength);
      return bytes;
    }
    await cache.delete(url);
  }

  const response = await fetch(url);
  if (!response.ok || !response.body) {
    throw new Error(`Could not download ASR model file (${response.status})`);
  }

  const reader = response.body.getReader();
  const bytes = new Uint8Array(expectedSize);
  let downloaded = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (downloaded + value.byteLength > expectedSize) {
      throw new Error('Downloaded ASR model file exceeded its expected size');
    }
    bytes.set(value, downloaded);
    downloaded += value.byteLength;
    onProgress(progressOffset + downloaded);
  }
  if (downloaded !== expectedSize) {
    throw new Error('Downloaded ASR model file did not match its expected size');
  }

  await cache.put(url, new Response(bytes.slice().buffer));
  return bytes;
};

export const loadBurmeseAsr = (
  onProgress: (percent: number) => void
): Promise<BurmeseAsr> => {
  if (loadedModel) return Promise.resolve(loadedModel);
  if (!modelPromise) {
    modelPromise = (async () => {
      let downloadedBytes = 0;
      const reportProgress = (loaded: number) => {
        downloadedBytes = Math.max(downloadedBytes, loaded);
        onProgress(Math.min(99, Math.floor(downloadedBytes / (MODEL_SIZE + VOCAB_SIZE) * 100)));
      };

      const modelBytes = await downloadAsset(MODEL_URL, MODEL_SIZE, reportProgress, 0);
      const vocabularyBytes = await downloadAsset(VOCAB_URL, VOCAB_SIZE, reportProgress, MODEL_SIZE);
      const vocabularyData: unknown = JSON.parse(new TextDecoder().decode(vocabularyBytes));
      if (!vocabularyData || typeof vocabularyData !== 'object') {
        throw new Error('Burmese ASR vocabulary is invalid');
      }

      const vocabulary = new Array<string>(Object.keys(vocabularyData).length);
      for (const [token, id] of Object.entries(vocabularyData)) {
        if (typeof id !== 'number' || !Number.isInteger(id) || id < 0 || id >= vocabulary.length) {
          throw new Error('Burmese ASR vocabulary contains an invalid token ID');
        }
        vocabulary[id] = token;
      }
      if (vocabulary[0] !== '<blank>' || vocabulary.some((token) => typeof token !== 'string')) {
        throw new Error('Burmese ASR vocabulary is incomplete');
      }

      const { InferenceSession } = await import('onnxruntime-web/wasm');
      const session = await InferenceSession.create(modelBytes, {
        executionProviders: ['wasm'],
      });
      if (!session.inputNames[0] || !session.outputNames[0]) {
        await session.release();
        throw new Error('Burmese ASR model has no input or output');
      }

      return { session, vocabulary };
    })()
      .then((model) => {
        loadedModel = model;
        onProgress(100);
        return model;
      })
      .catch((error: unknown) => {
        modelPromise = null;
        throw error;
      });
  }
  return modelPromise;
};

export const transcribeBurmese = async (audio: Float32Array, model: BurmeseAsr) => {
  if (audio.length < 8_000) return '';

  const { Tensor } = await import('onnxruntime-web/wasm');
  const input = new Tensor('float32', audio, [1, audio.length]);
  const outputs = await model.session.run({ [model.session.inputNames[0]]: input });
  const output = outputs[model.session.outputNames[0]];
  if (!output) throw new Error('Burmese ASR model returned no transcription');

  const ids: number[] = [];
  const [batchSize, frameCount, classCount] = output.dims;
  if (output.dims.length === 3 && batchSize === 1 && classCount > 0) {
    const scores = output.data;
    for (let frame = 0; frame < frameCount; frame++) {
      let bestId = 0;
      let bestScore = Number.NEGATIVE_INFINITY;
      const frameOffset = frame * classCount;
      for (let tokenId = 0; tokenId < classCount; tokenId++) {
        const score = Number(scores[frameOffset + tokenId]);
        if (score > bestScore) {
          bestScore = score;
          bestId = tokenId;
        }
      }
      ids.push(bestId);
    }
  } else {
    for (const value of output.data) ids.push(Number(value));
  }

  const transcript: string[] = [];
  let previousId = -1;
  for (const id of ids) {
    if (id !== previousId && id !== 0) {
      const token = model.vocabulary[id];
      if (token && token !== '<unk>') transcript.push(token);
    }
    previousId = id;
  }
  return transcript.join(' ').trim();
};
