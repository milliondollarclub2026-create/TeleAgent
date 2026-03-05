import { useState, useRef, useCallback } from 'react';

const MAX_RECORDING_SECONDS = 300; // 5 minutes

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [audioBlob, setAudioBlob] = useState(null);
  const [error, setError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const streamRef = useRef(null);
  const cancelledRef = useRef(false);

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    chunksRef.current = [];
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    setAudioBlob(null);
    cancelledRef.current = false;
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Prefer webm/opus, fall back to mp4 (Safari)
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        // Only produce a blob if not cancelled
        if (!cancelledRef.current) {
          const blob = new Blob(chunksRef.current, { type: mimeType });
          setAudioBlob(blob);
        }
        cleanup();
      };

      recorder.start(250); // collect chunks every 250ms
      setIsRecording(true);
      setElapsedSeconds(0);

      timerRef.current = setInterval(() => {
        setElapsedSeconds(prev => {
          if (prev + 1 >= MAX_RECORDING_SECONDS) {
            recorder.stop();
            setIsRecording(false);
            return MAX_RECORDING_SECONDS;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      cleanup();
      const msg = err.name === 'NotAllowedError'
        ? 'Microphone access denied. Please allow microphone access in your browser settings.'
        : 'Could not access microphone. Please check your device settings.';
      setError(msg);
    }
  }, [cleanup]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  }, []);

  const cancelRecording = useCallback(() => {
    cancelledRef.current = true;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setAudioBlob(null);
    setElapsedSeconds(0);
    cleanup();
  }, [cleanup]);

  const discardAudio = useCallback(() => {
    setAudioBlob(null);
    setElapsedSeconds(0);
  }, []);

  return {
    isRecording,
    elapsedSeconds,
    audioBlob,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
    discardAudio,
  };
}
