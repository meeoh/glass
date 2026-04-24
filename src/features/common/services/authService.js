const { BrowserWindow } = require('electron');
const sessionRepository = require('../repositories/session');

class AuthService {
    constructor() {
        this.currentUserId = 'default_user';
        this.isInitialized = false;
        sessionRepository.setAuthService(this);
    }

    async initialize() {
        if (this.isInitialized) return;
        this.isInitialized = true;

        // Clean up zombie sessions from previous runs
        await sessionRepository.endAllActiveSessions();

        this.broadcastUserState();
        console.log('[AuthService] Initialized (local-only mode).');
    }

    broadcastUserState() {
        const userState = this.getCurrentUser();
        BrowserWindow.getAllWindows().forEach(win => {
            if (win && !win.isDestroyed() && win.webContents && !win.webContents.isDestroyed()) {
                win.webContents.send('user-state-changed', userState);
            }
        });
    }

    getCurrentUserId() {
        return this.currentUserId;
    }

    getCurrentUser() {
        return {
            uid: this.currentUserId,
            email: '',
            displayName: 'Local User',
            mode: 'local',
            isLoggedIn: false,
        };
    }
}

const authService = new AuthService();
module.exports = authService;
