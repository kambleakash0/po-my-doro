// Offscreen Audio Handler

chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === 'play_clock') {
        const audio = document.getElementById('audio-clock');
        if (audio) {
            audio.currentTime = 0;
            audio.play().catch(e => console.error("Play error:", e));
        }
    } else if (msg.action === 'stop_clock') {
        const audio = document.getElementById('audio-clock');
        if (audio) {
            audio.pause();
            audio.currentTime = 0;
        }
    } else if (msg.action === 'play_pre_end') {
        const audio = document.getElementById('audio-pre-end');
        if (audio) {
            audio.currentTime = 0;
            audio.play().catch(e => console.error("Play error:", e));
        }
    } else if (msg.action === 'play_chime') {
        const audio = document.getElementById('audio-chime');
        if (audio) {
            audio.currentTime = 0;
            audio.play().catch(e => console.error("Play error:", e));
        }
    }
});
