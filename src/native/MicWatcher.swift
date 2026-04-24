import CoreAudio
import Foundation

// Get the default input (microphone) device
func getDefaultInputDevice() -> AudioDeviceID {
    var address = AudioObjectPropertyAddress(
        mSelector: kAudioHardwarePropertyDefaultInputDevice,
        mScope: kAudioObjectPropertyScopeGlobal,
        mElement: kAudioObjectPropertyElementMain
    )
    var deviceID: AudioDeviceID = 0
    var size = UInt32(MemoryLayout<AudioDeviceID>.size)
    AudioObjectGetPropertyData(
        AudioObjectID(kAudioObjectSystemObject), &address, 0, nil, &size, &deviceID
    )
    return deviceID
}

// Check if any app is using the mic on a given device
func isMicRunning(device: AudioDeviceID) -> Bool {
    var address = AudioObjectPropertyAddress(
        mSelector: kAudioDevicePropertyDeviceIsRunningSomewhere,
        mScope: kAudioObjectPropertyScopeInput,
        mElement: kAudioObjectPropertyElementMain
    )
    var isRunning: UInt32 = 0
    var size = UInt32(MemoryLayout<UInt32>.size)
    AudioObjectGetPropertyData(device, &address, 0, nil, &size, &isRunning)
    return isRunning == 1
}

var lastDevice = getDefaultInputDevice()
var lastState = isMicRunning(device: lastDevice)

// Print initial state
print(lastState ? "MIC_ACTIVE" : "MIC_INACTIVE")
fflush(stdout)

fputs("MicWatcher: polling mic state on device \(lastDevice) every 2s\n", stderr)

// Poll every 2 seconds
while true {
    let device = getDefaultInputDevice()
    if device != lastDevice {
        fputs("MicWatcher: input device changed from \(lastDevice) to \(device)\n", stderr)
        lastDevice = device
    }

    let currentState = isMicRunning(device: device)

    if currentState != lastState {
        print(currentState ? "MIC_ACTIVE" : "MIC_INACTIVE")
        fflush(stdout)
        lastState = currentState
    }

    Thread.sleep(forTimeInterval: 2.0)
}
