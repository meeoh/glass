const { spawn } = require('child_process');
const path = require('path');
const EventEmitter = require('events');

class CallDetectionService extends EventEmitter {
    constructor() {
        super();
        this.micWatcherProcess = null;
        this.micActive = false;
        this.isListening = false;
        this.enabled = true;
    }

    /**
     * Start the MicWatcher native process and listen for mic state changes.
     */
    start() {
        if (this.micWatcherProcess) {
            console.log('[CallDetection] Already running');
            return;
        }

        const binaryPath = path.join(__dirname, '..', '..', 'native', 'MicWatcher');
        const fs = require('fs');
        console.log('[CallDetection] Binary path:', binaryPath, '| exists:', fs.existsSync(binaryPath));

        try {
            this.micWatcherProcess = spawn(binaryPath, [], {
                stdio: ['ignore', 'pipe', 'pipe'],
            });

            console.log('[CallDetection] MicWatcher started (pid: ' + this.micWatcherProcess.pid + ')');

            let buffer = '';
            this.micWatcherProcess.stdout.on('data', (data) => {
                buffer += data.toString();
                const lines = buffer.split('\n');
                buffer = lines.pop();

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (trimmed === 'MIC_ACTIVE') {
                        this._onMicActive();
                    } else if (trimmed === 'MIC_INACTIVE') {
                        this._onMicInactive();
                    }
                }
            });

            this.micWatcherProcess.stderr.on('data', (data) => {
                console.log('[CallDetection] MicWatcher: ' + data.toString().trim());
            });

            this.micWatcherProcess.on('close', (code) => {
                console.log('[CallDetection] MicWatcher exited with code ' + code);
                this.micWatcherProcess = null;
                if (code !== 0 && code !== null) {
                    console.log('[CallDetection] Restarting MicWatcher in 3s...');
                    setTimeout(() => this.start(), 3000);
                }
            });

            this.micWatcherProcess.on('error', (err) => {
                console.error('[CallDetection] Failed to start MicWatcher:', err.message);
                this.micWatcherProcess = null;
            });

        } catch (err) {
            console.error('[CallDetection] Error spawning MicWatcher:', err.message);
        }
    }

    stop() {
        if (this.micWatcherProcess) {
            this.micWatcherProcess.kill();
            this.micWatcherProcess = null;
            console.log('[CallDetection] MicWatcher stopped');
        }
    }

    _onMicActive() {
        if (this.micActive) return;
        this.micActive = true;
        console.log('[CallDetection] 🎙️ Mic is now ACTIVE — call detected');

        if (this.enabled && !this.isListening) {
            this.emit('call-started');
        }
    }

    _onMicInactive() {
        if (!this.micActive) return;
        this.micActive = false;
        console.log('[CallDetection] 🎙️ Mic is now INACTIVE');
    }

    /**
     * Called by listenService when a listen session starts (auto or manual).
     */
    setListening(isListening) {
        this.isListening = isListening;
        // When user stops listening (Stop/Done), reset micActive so the next
        // mic activation from a new call triggers call-started again.
        if (!isListening) {
            this.micActive = false;
        }
    }

    setEnabled(enabled) {
        this.enabled = enabled;
        console.log('[CallDetection] Auto-detection ' + (enabled ? 'enabled' : 'disabled'));
    }
}

const callDetectionService = new CallDetectionService();
module.exports = callDetectionService;
