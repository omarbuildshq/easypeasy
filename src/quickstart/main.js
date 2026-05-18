/**
 * QuickStart entry point
 * Initializes the wizard, steps, and setup engine.
 */

import Wizard from './Wizard.js';
import QuickStart from './QuickStart.js';
import WelcomeStep from './steps/WelcomeStep.js';
import AccountStep from './steps/AccountStep.js';
import TorBoxStep from './steps/TorBoxStep.js';
import PreferencesStep from './steps/PreferencesStep.js';
import ReviewStep from './steps/ReviewStep.js';
import Clipboard from '../lib/utils/Clipboard.js';

// Shared state object — all steps read/write to this
const state = {
    // Step 1: Welcome
    service: 'stremio',
    mode: 'account',

    // Step 2: Account
    email: '',
    password: '',
    aiostreamsPassword: '',
    compatibilityMode: 'stremio',

    // Step 3: TorBox
    torboxKey: '',
    debridioKey: '',

    // Step 4: Preferences
    selectedHost: 'auto',
    customHostURL: '',
    selectedFormatterId: null,
    customFormatterDefinition: null,
    formatterFilename: null,
    formatterDefinition: null,
    exclude4k: false,
    excludeDolby: false,
    prioritizeQuality: true,
    maxSize: 'unlimited',
    cleanupOldInstalls: true,
};

// Create steps
const steps = [
    new WelcomeStep(state),
    new AccountStep(state),
    new TorBoxStep(state),
    new PreferencesStep(state),
    new ReviewStep(state),
];

// Create wizard
const wizard = new Wizard(steps, {
    onComplete: () => {
        const engine = new QuickStart(wizard, state);
        engine.run();
    },
});

// Initialize
wizard.init();
Clipboard.setup();
