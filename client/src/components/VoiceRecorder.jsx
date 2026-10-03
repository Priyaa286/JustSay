import React, { useState, useRef, useEffect } from 'react';
import api from '../services/api';

export default function VoiceRecorder({ onVoiceProcessed, onError, disabled }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [permissionError, setPermissionError] = useState(null);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerIntervalRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    return () => {
      // Cleanup any active stream and timer on unmount
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const formatTimer = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const startRecording = async () => {
    setPermissionError(null);
    if (onError) onError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support audio recording (MediaDevices API missing).');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 44100,
          echoCancellation: true,
          noiseSuppression: true
        }
      });
      streamRef.current = stream;

      // Select supported audio MIME type
      let mimeType = 'audio/webm';
      if (typeof MediaRecorder.isTypeSupported === 'function') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          mimeType = 'audio/webm;codecs=opus';
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          mimeType = 'audio/ogg';
        }
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      console.log('🎙️ REQUESTED MIME:', mimeType);
      console.log('🎙️ ACTUAL RECORDER MIME:', recorder.mimeType);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        // Stop audio tracks so microphone indicator in browser turns off
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }

        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        console.log('📦 BLOB TYPE:', audioBlob.type);
        console.log('📦 BLOB SIZE:', audioBlob.size);

        const header = new Uint8Array(
          await audioBlob.slice(0, 16).arrayBuffer()
        );

        console.log(
          '🔍 BLOB HEADER:',
          Array.from(header)
            .map(b => b.toString(16).padStart(2, '0'))
            .join(' ')
        );
        if (audioBlob.size === 0) {
          if (onError) onError('No audio data captured. Please try speaking again.');
          return;
        }

        const extension = mimeType.includes('mp4') ? 'm4a' : 'webm';
        await handleAudioUpload(audioBlob, `speech.${extension}`);
      };

      recorder.start(100); // chunk every 100ms
      setIsRecording(true);
      setRecordingSeconds(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access error:', err);
      let message = 'Could not access microphone.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        message = 'Microphone permission denied. Please allow microphone access in your browser settings.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        message = 'No microphone device found on your phone or computer.';
      } else {
        message = err.message || message;
      }
      setPermissionError(message);
      if (onError) onError(message);
    }
  };

  const stopRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleAudioUpload = async (audioBlob, filename) => {
    setIsProcessing(true);
    try {
      const response = await api.processVoice(audioBlob, filename);
      if (onVoiceProcessed) {
        onVoiceProcessed(response.data);
      }
    } catch (err) {
      console.error('Voice processing error:', err);
      const friendlyMessage = err.message || 'Failed to process voice transaction. Please check your backend connection.';
      if (onError) onError(friendlyMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={`voice-hero ${isRecording ? 'is-recording' : ''} ${isProcessing ? 'is-processing' : ''}`}>
      <h2 className="hero-title">
        {isRecording
          ? 'Listening...'
          : isProcessing
            ? 'Understanding transaction...'
            : 'Speak your transaction'}
      </h2>

      <p className="hero-subtitle">
        {isRecording ? (
          'Say customer name, amount, and item'
        ) : isProcessing ? (
          'Converting speech to text and analyzing...'
        ) : (
          <>
            Record credit or payment naturally
            <span className="hero-tamil">தமிழில் அல்லது Tanglish-ல் பேசவும்</span>
          </>
        )}
      </p>

      {/* Main Microphone Button */}
      <div className="mic-button-wrapper">
        {isRecording && <div className="mic-ring-pulse"></div>}

        <button
          type="button"
          className={`mic-button ${isRecording ? 'recording' : ''}`}
          disabled={disabled || isProcessing}
          onClick={isRecording ? stopRecording : startRecording}
          title={isRecording ? 'Tap to Stop' : 'Tap to Record'}
          aria-label={isRecording ? 'Stop Recording' : 'Start Recording'}
        >
          {isRecording ? (
            /* Stop Square Icon */
            <svg width="36" height="36" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : isProcessing ? (
            /* Mini Loader inside button */
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
          ) : (
            /* Microphone Icon */
            <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" x2="12" y1="19" y2="22" />
            </svg>
          )}
        </button>
      </div>

      {/* Recording State Controls & Waves */}
      {isRecording && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
          <div className="timer-badge">{formatTimer(recordingSeconds)}</div>
          <div className="audio-waves">
            <div className="wave-bar"></div>
            <div className="wave-bar"></div>
            <div className="wave-bar"></div>
            <div className="wave-bar"></div>
            <div className="wave-bar"></div>
            <div className="wave-bar"></div>
          </div>
          <span style={{ fontSize: '13px', color: '#DC2626', fontWeight: 600, marginTop: '4px' }}>
            Tap button to stop recording
          </span>
        </div>
      )}

      {/* Processing State Indicator */}
      {isProcessing && (
        <div style={{ marginTop: '8px' }}>
          <div className="spinner"></div>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--primary-terracotta)' }}>
            Processing Tamil / Tanglish speech...
          </span>
        </div>
      )}

      {/* Idle Prompt Helper Suggestions */}
      {!isRecording && !isProcessing && (
        <div className="sample-prompts">
          <div className="sample-prompts-title">Try saying:</div>
          <div className="prompt-chips">
            <div className="prompt-chip">
              <span>&ldquo;<strong>Ravi</strong> ku <strong>50 rupees</strong> paal packet add pannu&rdquo;</span>
            </div>
            <div className="prompt-chip">
              <span>&ldquo;<strong>Mani</strong> <strong>100 rupees</strong> kuduthutaan&rdquo;</span>
            </div>
            <div className="prompt-chip">
              <span>&ldquo;<strong>Suresh</strong> ku <strong>20 rs</strong> tea credit&rdquo;</span>
            </div>
          </div>
        </div>
      )}

      {permissionError && (
        <div className="error-banner" style={{ marginTop: '16px', width: '100%', textAlign: 'left' }}>
          <span>⚠️ {permissionError}</span>
        </div>
      )}
    </div>
  );
}
