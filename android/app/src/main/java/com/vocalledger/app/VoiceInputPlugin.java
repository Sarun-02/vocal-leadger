package com.vocalledger.app;

import android.Manifest;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.os.SystemClock;
import android.provider.Settings;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Logger;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import java.util.ArrayList;

/**
 * Speech-to-text bridge for Vocal Ledger.
 *
 * JS API (see src/services/voice/voicePlugin.ts):
 *   isAvailable, checkPermissions, requestPermissions, start, stop, cancel, openAppSettings
 * Events: partial {text}, final {text, alternatives}, error {code, message}, level {level}, state {listening}
 */
@CapacitorPlugin(
    name = "VoiceInput",
    permissions = { @Permission(strings = { Manifest.permission.RECORD_AUDIO }, alias = VoiceInputPlugin.MICROPHONE) }
)
public class VoiceInputPlugin extends Plugin {

    static final String MICROPHONE = "microphone";
    private static final String TAG = "VoiceInput";
    private static final long LEVEL_INTERVAL_MS = 80;

    private SpeechRecognizer recognizer;
    private boolean cancelled = false;
    private boolean listening = false;
    private long lastLevelAt = 0;

    @PluginMethod
    public void isAvailable(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("available", SpeechRecognizer.isRecognitionAvailable(getContext()));
        call.resolve(ret);
    }

    @PluginMethod
    public void start(final PluginCall call) {
        if (getPermissionState(MICROPHONE) != PermissionState.GRANTED) {
            call.reject("Microphone permission not granted", "permission");
            return;
        }
        if (!SpeechRecognizer.isRecognitionAvailable(getContext())) {
            call.reject("Speech recognition is not available on this device", "unavailable");
            return;
        }
        final String language = call.getString("language", "en-IN");
        final boolean preferOffline = Boolean.TRUE.equals(call.getBoolean("preferOffline", false));

        getActivity().runOnUiThread(() -> {
            try {
                destroyRecognizer();
                cancelled = false;
                recognizer = SpeechRecognizer.createSpeechRecognizer(getActivity());
                recognizer.setRecognitionListener(new Listener());

                Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
                intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
                intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, language);
                intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, language);
                intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
                intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 3);
                intent.putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, getContext().getPackageName());
                intent.putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, preferOffline);
                // Allow natural pauses between items ("…for dinner, … for lunch").
                intent.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 2500L);
                intent.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS, 2000L);
                intent.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS, 4000L);

                recognizer.startListening(intent);
                call.resolve();
            } catch (Exception ex) {
                Logger.error(TAG, "Failed to start recognition", ex);
                call.reject("Could not start speech recognition", "client", ex);
            }
        });
    }

    @PluginMethod
    public void stop(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            try {
                if (recognizer != null) recognizer.stopListening();
            } catch (Exception ex) {
                Logger.error(TAG, "stopListening failed", ex);
            }
            call.resolve();
        });
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            cancelled = true;
            destroyRecognizer();
            setListening(false);
            call.resolve();
        });
    }

    @PluginMethod
    public void openAppSettings(PluginCall call) {
        try {
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.fromParts("package", getContext().getPackageName(), null));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getActivity().startActivity(intent);
            call.resolve();
        } catch (Exception ex) {
            call.reject("Could not open settings", ex);
        }
    }

    @Override
    protected void handleOnDestroy() {
        destroyRecognizer();
        super.handleOnDestroy();
    }

    private void destroyRecognizer() {
        if (recognizer != null) {
            try {
                recognizer.cancel();
                recognizer.destroy();
            } catch (Exception ignored) {
                // already released
            }
            recognizer = null;
        }
    }

    private void setListening(boolean value) {
        if (listening == value) return;
        listening = value;
        JSObject ret = new JSObject();
        ret.put("listening", value);
        notifyListeners("state", ret);
    }

    private static String firstResult(Bundle bundle) {
        if (bundle == null) return "";
        ArrayList<String> matches = bundle.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
        return matches != null && !matches.isEmpty() && matches.get(0) != null ? matches.get(0) : "";
    }

    private static String errorCode(int error) {
        switch (error) {
            case SpeechRecognizer.ERROR_NO_MATCH:
                return "no-match";
            case SpeechRecognizer.ERROR_SPEECH_TIMEOUT:
                return "speech-timeout";
            case SpeechRecognizer.ERROR_NETWORK:
            case SpeechRecognizer.ERROR_NETWORK_TIMEOUT:
            case SpeechRecognizer.ERROR_SERVER_DISCONNECTED:
                return "network";
            case SpeechRecognizer.ERROR_AUDIO:
                return "audio";
            case SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS:
                return "permission";
            case SpeechRecognizer.ERROR_RECOGNIZER_BUSY:
            case SpeechRecognizer.ERROR_TOO_MANY_REQUESTS:
                return "busy";
            case SpeechRecognizer.ERROR_LANGUAGE_NOT_SUPPORTED:
            case SpeechRecognizer.ERROR_LANGUAGE_UNAVAILABLE:
                return "language-unavailable";
            case SpeechRecognizer.ERROR_SERVER:
                return "server";
            case SpeechRecognizer.ERROR_CLIENT:
                return "client";
            default:
                return "unknown";
        }
    }

    private class Listener implements RecognitionListener {

        @Override
        public void onReadyForSpeech(Bundle params) {
            setListening(true);
        }

        @Override
        public void onBeginningOfSpeech() {
            setListening(true);
        }

        @Override
        public void onRmsChanged(float rmsdB) {
            long now = SystemClock.elapsedRealtime();
            if (now - lastLevelAt < LEVEL_INTERVAL_MS) return;
            lastLevelAt = now;
            // rmsdB is roughly -2..10; normalise to 0..1.
            float level = Math.max(0f, Math.min(1f, (rmsdB + 2f) / 12f));
            JSObject ret = new JSObject();
            ret.put("level", level);
            notifyListeners("level", ret);
        }

        @Override
        public void onBufferReceived(byte[] buffer) {}

        @Override
        public void onEndOfSpeech() {
            // Final results (or an error) follow; keep "listening" until then.
        }

        @Override
        public void onError(int error) {
            setListening(false);
            if (cancelled) return;
            JSObject ret = new JSObject();
            ret.put("code", errorCode(error));
            ret.put("message", "SpeechRecognizer error " + error);
            notifyListeners("error", ret);
        }

        @Override
        public void onResults(Bundle results) {
            setListening(false);
            if (cancelled) return;
            JSObject ret = new JSObject();
            ret.put("text", firstResult(results));
            ArrayList<String> matches = results != null ? results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION) : null;
            ret.put("alternatives", matches != null ? new JSArray(matches) : new JSArray());
            if (firstResult(results).isEmpty()) {
                JSObject err = new JSObject();
                err.put("code", "no-match");
                err.put("message", "Empty result");
                notifyListeners("error", err);
            } else {
                notifyListeners("final", ret);
            }
        }

        @Override
        public void onPartialResults(Bundle partialResults) {
            if (cancelled) return;
            String text = firstResult(partialResults);
            if (text.isEmpty()) return;
            JSObject ret = new JSObject();
            ret.put("text", text);
            notifyListeners("partial", ret);
        }

        @Override
        public void onEvent(int eventType, Bundle params) {}
    }
}
