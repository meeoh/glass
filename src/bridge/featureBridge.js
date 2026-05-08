// src/bridge/featureBridge.js
const { ipcMain, app, BrowserWindow, systemPreferences } = require('electron');
const settingsService = require('../features/settings/settingsService');
const authService = require('../features/common/services/authService');
const whisperService = require('../features/common/services/whisperService');
const ollamaService = require('../features/common/services/ollamaService');
const modelStateService = require('../features/common/services/modelStateService');
const shortcutsService = require('../features/shortcuts/shortcutsService');
const presetRepository = require('../features/common/repositories/preset');
const localAIManager = require('../features/common/services/localAIManager');
const askService = require('../features/ask/askService');
const listenService = require('../features/listen/listenService');
const permissionService = require('../features/common/services/permissionService');
const vaultService = require('../features/vault/vaultService');
const googleAuthService = require('../features/googleAuth/googleAuthService');
const calendarService = require('../features/calendar/calendarService');
const contactMatchService = require('../features/contactMatch/contactMatchService');
const postCallSummaryService = require('../features/listen/summary/postCallSummaryService');
const providerSettingsRepository = require('../features/common/repositories/providerSettings');

module.exports = {
  // Renderer로부터의 요청을 수신하고 서비스로 전달
  initialize() {
    // Settings Service
    ipcMain.handle('settings:getPresets', async () => await settingsService.getPresets());
    ipcMain.handle('settings:get-auto-update', async () => await settingsService.getAutoUpdateSetting());
    ipcMain.handle('settings:set-auto-update', async (event, isEnabled) => await settingsService.setAutoUpdateSetting(isEnabled));  
    ipcMain.handle('settings:get-model-settings', async () => await settingsService.getModelSettings());
    ipcMain.handle('settings:clear-api-key', async (e, { provider }) => await settingsService.clearApiKey(provider));
    ipcMain.handle('settings:set-selected-model', async (e, { type, modelId }) => await settingsService.setSelectedModel(type, modelId));    

    ipcMain.handle('settings:get-ollama-status', async () => await settingsService.getOllamaStatus());
    ipcMain.handle('settings:ensure-ollama-ready', async () => await settingsService.ensureOllamaReady());
    ipcMain.handle('settings:shutdown-ollama', async () => await settingsService.shutdownOllama());

    // Shortcuts
    ipcMain.handle('settings:getCurrentShortcuts', async () => await shortcutsService.loadKeybinds());
    ipcMain.handle('shortcut:getDefaultShortcuts', async () => await shortcutsService.handleRestoreDefaults());
    ipcMain.handle('shortcut:closeShortcutSettingsWindow', async () => await shortcutsService.closeShortcutSettingsWindow());
    ipcMain.handle('shortcut:openShortcutSettingsWindow', async () => await shortcutsService.openShortcutSettingsWindow());
    ipcMain.handle('shortcut:saveShortcuts', async (event, newKeybinds) => await shortcutsService.handleSaveShortcuts(newKeybinds));
    ipcMain.handle('shortcut:toggleAllWindowsVisibility', async () => await shortcutsService.toggleAllWindowsVisibility());

    // Permissions
    ipcMain.handle('check-system-permissions', async () => await permissionService.checkSystemPermissions());
    ipcMain.handle('request-microphone-permission', async () => await permissionService.requestMicrophonePermission());
    ipcMain.handle('open-system-preferences', async (event, section) => await permissionService.openSystemPreferences(section));
    ipcMain.handle('mark-keychain-completed', async () => await permissionService.markKeychainCompleted());
    ipcMain.handle('check-keychain-completed', async () => await permissionService.checkKeychainCompleted());
    // User/Auth
    ipcMain.handle('get-current-user', () => authService.getCurrentUser());

    // App
    ipcMain.handle('quit-application', () => app.quit());

    // Whisper
    ipcMain.handle('whisper:download-model', async (event, modelId) => await whisperService.handleDownloadModel(modelId));
    ipcMain.handle('whisper:get-installed-models', async () => await whisperService.handleGetInstalledModels());
       
    // General
    ipcMain.handle('get-preset-templates', () => presetRepository.getPresetTemplates());
    ipcMain.handle('get-web-url', () => process.env.pickleglass_WEB_URL || 'http://localhost:3000');

    // Ollama
    ipcMain.handle('ollama:get-status', async () => await ollamaService.handleGetStatus());
    ipcMain.handle('ollama:install', async () => await ollamaService.handleInstall());
    ipcMain.handle('ollama:start-service', async () => await ollamaService.handleStartService());
    ipcMain.handle('ollama:ensure-ready', async () => await ollamaService.handleEnsureReady());
    ipcMain.handle('ollama:get-models', async () => await ollamaService.handleGetModels());
    ipcMain.handle('ollama:get-model-suggestions', async () => await ollamaService.handleGetModelSuggestions());
    ipcMain.handle('ollama:pull-model', async (event, modelName) => await ollamaService.handlePullModel(modelName));
    ipcMain.handle('ollama:is-model-installed', async (event, modelName) => await ollamaService.handleIsModelInstalled(modelName));
    ipcMain.handle('ollama:warm-up-model', async (event, modelName) => await ollamaService.handleWarmUpModel(modelName));
    ipcMain.handle('ollama:auto-warm-up', async () => await ollamaService.handleAutoWarmUp());
    ipcMain.handle('ollama:get-warm-up-status', async () => await ollamaService.handleGetWarmUpStatus());
    ipcMain.handle('ollama:shutdown', async (event, force = false) => await ollamaService.handleShutdown(force));

    // Ask
    ipcMain.handle('ask:sendQuestionFromAsk', async (event, userPrompt) => await askService.sendMessage(userPrompt));
    ipcMain.handle('ask:sendQuestionFromSummary', async (event, userPrompt) => await askService.sendMessage(userPrompt));
    ipcMain.handle('ask:toggleAskButton', async () => await askService.toggleAskButton());
    ipcMain.handle('ask:closeAskWindow',  async () => await askService.closeAskWindow());
    
    // Listen — summary opt-out state from ListenView checkbox
    let _sendSummary = true;
    ipcMain.on('listen:setSendSummary', (event, value) => {
      _sendSummary = value !== false;
      console.log(`[FeatureBridge] Send summary preference: ${_sendSummary}`);
    });

    // Listen
    ipcMain.handle('listen:sendMicAudio', async (event, { data, mimeType }) => await listenService.handleSendMicAudioContent(data, mimeType));
    ipcMain.handle('listen:sendSystemAudio', async (event, { data, mimeType }) => {
        const result = await listenService.sttService.sendSystemAudioContent(data, mimeType);
        if(result && result.success) {
            listenService.sendToRenderer('system-audio-data', { data });
        }
        return result || { success: false };
    });
    ipcMain.handle('listen:startMacosSystemAudio', async () => await listenService.handleStartMacosAudio());
    ipcMain.handle('listen:stopMacosSystemAudio', async () => await listenService.handleStopMacosAudio());
    ipcMain.handle('update-google-search-setting', async (event, enabled) => await listenService.handleUpdateGoogleSearchSetting(enabled));
    ipcMain.handle('listen:isSessionActive', async () => await listenService.isSessionActive());
    ipcMain.handle('listen:changeSession', async (event, listenButtonText, options = {}) => {
      console.log('[FeatureBridge] listen:changeSession from mainheader', listenButtonText);
      try {
        const callDetectionService = require('../features/callDetection/callDetectionService');
        const { notifyListenStateChanged, showHUD, hideHUD } = require('../window/windowManager');
        const isStarting = listenButtonText === 'Listen';
        if (isStarting) _sendSummary = true; // Reset for new session

        // Grab conversation history BEFORE handleListenRequest clears it
        // (Stop calls closeSession which resets history)
        const conversationHistory = !isStarting
          ? [...(listenService.summaryService?.getConversationHistory?.() || [])]
          : [];

        await listenService.handleListenRequest(listenButtonText);
        // Sync call detection state with manual listen start/stop
        callDetectionService.setListening(isStarting);
        notifyListenStateChanged(isStarting);
        if (isStarting) {
          showHUD();
          // Auto-match on manual listen start too
          contactMatchService.autoMatch().catch(err => {
            console.error('[FeatureBridge] Auto-match error:', err.message);
          });
        } else if (listenButtonText === 'Stop') {
          // Stop — stash conversation history for when Done is pressed later
          if (conversationHistory.length > 0) {
            listenService._stashedConversationHistory = conversationHistory;
            console.log(`[FeatureBridge] Stashed ${conversationHistory.length} conversation turns for post-call summary`);
          }
        } else if (listenButtonText === 'Done') {
          // Done = call is over — optionally generate summary, push to CRM, then clean up
          // Use stashed history from Stop, or current history if available
          const finalHistory = conversationHistory.length > 0 ? conversationHistory : (listenService._stashedConversationHistory || []);
          const sendSummary = _sendSummary !== false; // reads from ListenView checkbox state

          if (sendSummary && process.env.VAULT_API_TOKEN) {
            // Capture contact/match data NOW before we clear it
            const calendarService = require('../features/calendar/calendarService');
            const currentEvents = calendarService.getCurrentEvents();
            const calendarEventId = currentEvents.length > 0 ? currentEvents[0].id : null;

            const summaryOptions = {
              callId: contactMatchService._lastCallId || null,
              matchSource: contactMatchService.getMatchSource(),
              contactData: vaultService.getCurrentContact(),
              repEmail: contactMatchService.getRepEmail(),
              calendarEventId: calendarEventId,
              durationSeconds: null,
            };

            // Generate and push summary in the background (don't block the UI)
            console.log(`[FeatureBridge] Generating post-call summary from ${finalHistory.length} turns`);
            postCallSummaryService.generateAndPush(finalHistory, summaryOptions).then(result => {
              if (result.success) {
                console.log('[FeatureBridge] Post-call summary generated and pushed');
                // Notify all windows
                BrowserWindow.getAllWindows().forEach(win => {
                  if (win && !win.isDestroyed()) {
                    win.webContents.send('glass:post-call-summary', result);
                  }
                });
              }
            }).catch(err => {
              console.error('[FeatureBridge] Post-call summary failed:', err.message);
            });
          } else {
            console.log('[FeatureBridge] User opted out of post-call summary');
          }

          hideHUD();
          contactMatchService.clearMatch();
          vaultService.clearContact();
          listenService._stashedConversationHistory = null;
        } else {
          // Stop = end listening but keep HUD visible (user can review transcript)
          contactMatchService.clearMatch();
          vaultService.clearContact();
        }
        return { success: true };
      } catch (error) {
        console.error('[FeatureBridge] listen:changeSession failed', error.message);
        return { success: false, error: error.message };
      }
    });

    // ModelStateService
    ipcMain.handle('model:validate-key', async (e, { provider, key }) => await modelStateService.handleValidateKey(provider, key));
    ipcMain.handle('model:get-all-keys', async () => await modelStateService.getAllApiKeys());
    ipcMain.handle('model:set-api-key', async (e, { provider, key }) => await modelStateService.setApiKey(provider, key));
    ipcMain.handle('model:remove-api-key', async (e, provider) => await modelStateService.handleRemoveApiKey(provider));
    ipcMain.handle('model:get-selected-models', async () => await modelStateService.getSelectedModels());
    ipcMain.handle('model:set-selected-model', async (e, { type, modelId }) => await modelStateService.handleSetSelectedModel(type, modelId));
    ipcMain.handle('model:get-available-models', async (e, { type }) => await modelStateService.getAvailableModels(type));
    ipcMain.handle('model:are-providers-configured', async () => await modelStateService.areProvidersConfigured());
    ipcMain.handle('model:get-provider-config', () => modelStateService.getProviderConfig());
    ipcMain.handle('model:re-initialize-state', async () => await modelStateService.initialize());

    // LocalAIManager 이벤트를 모든 윈도우에 브로드캐스트
    localAIManager.on('install-progress', (service, data) => {
      const event = { service, ...data };
      BrowserWindow.getAllWindows().forEach(win => {
        if (win && !win.isDestroyed()) {
          win.webContents.send('localai:install-progress', event);
        }
      });
    });
    localAIManager.on('installation-complete', (service) => {
      BrowserWindow.getAllWindows().forEach(win => {
        if (win && !win.isDestroyed()) {
          win.webContents.send('localai:installation-complete', { service });
        }
      });
    });
    localAIManager.on('error', (error) => {
      BrowserWindow.getAllWindows().forEach(win => {
        if (win && !win.isDestroyed()) {
          win.webContents.send('localai:error-occurred', error);
        }
      });
    });
    // Handle error-occurred events from LocalAIManager's error handling
    localAIManager.on('error-occurred', (error) => {
      BrowserWindow.getAllWindows().forEach(win => {
        if (win && !win.isDestroyed()) {
          win.webContents.send('localai:error-occurred', error);
        }
      });
    });
    localAIManager.on('model-ready', (data) => {
      BrowserWindow.getAllWindows().forEach(win => {
        if (win && !win.isDestroyed()) {
          win.webContents.send('localai:model-ready', data);
        }
      });
    });
    localAIManager.on('state-changed', (service, state) => {
      const event = { service, ...state };
      BrowserWindow.getAllWindows().forEach(win => {
        if (win && !win.isDestroyed()) {
          win.webContents.send('localai:service-status-changed', event);
        }
      });
    });

    // 주기적 상태 동기화 시작
    localAIManager.startPeriodicSync();

    // ModelStateService 이벤트를 모든 윈도우에 브로드캐스트
    modelStateService.on('state-updated', (state) => {
      BrowserWindow.getAllWindows().forEach(win => {
        if (win && !win.isDestroyed()) {
          win.webContents.send('model-state:updated', state);
        }
      });
    });
    modelStateService.on('settings-updated', () => {
      BrowserWindow.getAllWindows().forEach(win => {
        if (win && !win.isDestroyed()) {
          win.webContents.send('settings-updated');
        }
      });
    });
    modelStateService.on('force-show-apikey-header', () => {
      BrowserWindow.getAllWindows().forEach(win => {
        if (win && !win.isDestroyed()) {
          win.webContents.send('force-show-apikey-header');
        }
      });
    });

    // LocalAI 통합 핸들러 추가
    ipcMain.handle('localai:install', async (event, { service, options }) => {
      return await localAIManager.installService(service, options);
    });
    ipcMain.handle('localai:get-status', async (event, service) => {
      return await localAIManager.getServiceStatus(service);
    });
    ipcMain.handle('localai:start-service', async (event, service) => {
      return await localAIManager.startService(service);
    });
    ipcMain.handle('localai:stop-service', async (event, service) => {
      return await localAIManager.stopService(service);
    });
    ipcMain.handle('localai:install-model', async (event, { service, modelId, options }) => {
      return await localAIManager.installModel(service, modelId, options);
    });
    ipcMain.handle('localai:get-installed-models', async (event, service) => {
      return await localAIManager.getInstalledModels(service);
    });
    ipcMain.handle('localai:run-diagnostics', async (event, service) => {
      return await localAIManager.runDiagnostics(service);
    });
    ipcMain.handle('localai:repair-service', async (event, service) => {
      return await localAIManager.repairService(service);
    });
    
    // 에러 처리 핸들러
    ipcMain.handle('localai:handle-error', async (event, { service, errorType, details }) => {
      return await localAIManager.handleError(service, errorType, details);
    });
    
    // 전체 상태 조회
    ipcMain.handle('localai:get-all-states', async (event) => {
      return await localAIManager.getAllServiceStates();
    });

    // Vault CRM
    ipcMain.handle('vault:lookup-contact', async (e, { email, name }) => {
      try {
        const data = await vaultService.lookupContact({ email, name });
        if (!data) return { success: false, error: 'Contact not found' };
        return { success: true, data, highlights: vaultService.buildHighlights() };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
    ipcMain.handle('vault:get-current-contact', () => {
      return {
        data: vaultService.getCurrentContact(),
        highlights: vaultService.buildHighlights(),
      };
    });
    ipcMain.handle('vault:clear-contact', () => {
      vaultService.clearContact();
      return { success: true };
    });

    // Broadcast contact changes to all windows
    vaultService.onContactChanged((data) => {
      const highlights = vaultService.buildHighlights();
      BrowserWindow.getAllWindows().forEach(win => {
        if (win && !win.isDestroyed()) {
          win.webContents.send('vault:contact-changed', { data, highlights });
        }
      });
    });

    // ─── Glass Main Window: Google Auth + Calendar + Contact Matching ───

    // Google Auth
    ipcMain.handle('glass:authorize-google', async () => {
      try {
        const profile = await googleAuthService.authorize();
        // Start calendar polling after auth
        calendarService.start();
        return { success: true, profile };
      } catch (err) {
        console.error('[FeatureBridge] Google auth failed:', err.message);
        return { success: false, error: err.message };
      }
    });
    ipcMain.handle('glass:sign-out-google', () => {
      googleAuthService.signOut();
      calendarService.stop();
      return { success: true };
    });
    ipcMain.handle('glass:get-google-profile', () => {
      return googleAuthService.getUserProfile();
    });

    // Calendar
    ipcMain.handle('glass:refresh-calendar', async () => {
      await calendarService.refresh();
      return { success: true, events: calendarService.getTodayEvents() };
    });
    ipcMain.handle('glass:get-today-events', () => {
      return calendarService.getTodayEvents();
    });

    // Show HUD from main window
    ipcMain.handle('glass:show-hud', () => {
      const { showHUD, showAllWindows } = require('../window/windowManager');
      showHUD();
      showAllWindows();
      return { success: true };
    });

    // ─── Onboarding / Setup ───
    ipcMain.handle('glass:check-setup-complete', async () => {
      const openai = await providerSettingsRepository.getByProvider('openai');
      const deepgram = await providerSettingsRepository.getByProvider('deepgram');
      return {
        hasProxyToken: !!(openai && openai.api_key),
        hasDeepgramKey: !!(deepgram && deepgram.api_key),
        hasMicPermission: systemPreferences.getMediaAccessStatus('microphone') === 'granted',
        hasScreenPermission: systemPreferences.getMediaAccessStatus('screen') === 'granted',
        isGoogleAuthorized: googleAuthService.isAuthorized(),
      };
    });

    ipcMain.handle('glass:save-setup-keys', async (_, { proxyToken, deepgramKey }) => {
      if (proxyToken) {
        await providerSettingsRepository.upsert('openai', {
          api_key: proxyToken,
          selected_llm_model: 'gpt-4.1',
        });
        await providerSettingsRepository.setActiveProvider('openai', 'llm');
        // Also set the env var so services pick it up immediately
        process.env.SHOPIFY_PROXY_TOKEN = proxyToken;
      }
      if (deepgramKey) {
        await providerSettingsRepository.upsert('deepgram', {
          api_key: deepgramKey,
          selected_stt_model: 'nova-3',
        });
        await providerSettingsRepository.setActiveProvider('deepgram', 'stt');
        process.env.DEEPGRAM_API_KEY = deepgramKey;
      }
      return { success: true };
    });

    ipcMain.handle('glass:request-mic-permission', async () => {
      const status = systemPreferences.getMediaAccessStatus('microphone');
      if (status === 'granted') return { granted: true };
      if (status === 'not-determined') {
        const granted = await systemPreferences.askForMediaAccess('microphone');
        return { granted };
      }
      return { granted: false, status };
    });

    // Initial state for main window
    ipcMain.handle('glass:get-initial-state', async () => {
      const openai = await providerSettingsRepository.getByProvider('openai');
      const setupComplete = !!(openai && openai.api_key);
      return {
        setupComplete,
        isAuthorized: googleAuthService.isAuthorized(),
        userProfile: googleAuthService.getUserProfile(),
        events: calendarService.getTodayEvents(),
        isListening: listenService.isSessionActive(),
        matchResult: contactMatchService.getMatchSource() ? {
          matched: true,
          source: contactMatchService.getMatchSource(),
          contact: vaultService.getCurrentContact()?.contact,
          matchMeta: contactMatchService.getMatchMeta(),
        } : null,
      };
    });

    // Broadcast Google auth changes to all windows
    googleAuthService.on('auth-changed', (profile) => {
      // Auto-set rep email for Vault lookups when Google auth completes,
      // but only if no explicit rep email was configured via env var
      if (profile.email && !process.env.GLASS_REP_EMAIL) {
        contactMatchService.setRepEmail(profile.email);
      }
      BrowserWindow.getAllWindows().forEach(win => {
        if (win && !win.isDestroyed()) {
          win.webContents.send('glass:auth-changed', profile);
        }
      });
    });

    // Broadcast calendar event updates to all windows
    calendarService.on('events-updated', (events) => {
      BrowserWindow.getAllWindows().forEach(win => {
        if (win && !win.isDestroyed()) {
          win.webContents.send('glass:events-updated', events);
        }
      });
    });

    // Broadcast contact match results to all windows
    contactMatchService.on('match-result', (result) => {
      BrowserWindow.getAllWindows().forEach(win => {
        if (win && !win.isDestroyed()) {
          win.webContents.send('glass:match-result', result);
        }
      });
    });

    console.log('[FeatureBridge] Initialized with all feature handlers.');
  },

  // Renderer로 상태를 전송
  sendAskProgress(win, progress) {
    win.webContents.send('feature:ask:progress', progress);
  },
};