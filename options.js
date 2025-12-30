// options.js
document.addEventListener('DOMContentLoaded', () => {
    // Load
    chrome.storage.local.get("settings", (res) => {
        if (res.settings) {
            document.getElementById('work').value = res.settings.work;
            document.getElementById('short').value = res.settings.short;
            document.getElementById('long').value = res.settings.long;
        }
    });

    // Save
    document.getElementById('save').addEventListener('click', () => {
        const settings = {
            work: parseInt(document.getElementById('work').value) || 25,
            short: parseInt(document.getElementById('short').value) || 5,
            long: parseInt(document.getElementById('long').value) || 15
        };

        chrome.storage.local.set({ settings }, () => {
            const status = document.getElementById('status');
            status.classList.add('visible');
            setTimeout(() => status.classList.remove('visible'), 2000);

            // Should we stop timer? Python app resets. 
            // Extension background checks settings on transition, so changes apply to NEXT segment usually.
            // If we want to reset current, we'd message background. 
            // Let's keep it simple: applies next.
        });
    });
});
