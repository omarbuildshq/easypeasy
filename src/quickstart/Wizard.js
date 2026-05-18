/**
 * Wizard — Step-by-step UI controller
 * Manages navigation, progress bar, and transitions between steps.
 */

export default class Wizard {
    constructor(steps, options = {}) {
        this.steps = steps;
        this.currentIndex = 0;
        this.onComplete = options.onComplete || (() => {});

        // DOM refs
        this.body = document.getElementById('wizardBody');
        this.progressFill = document.getElementById('progressFill');
        this.progressSteps = document.getElementById('progressSteps');
        this.btnBack = document.getElementById('btnBack');
        this.btnNext = document.getElementById('btnNext');
        this.nav = document.getElementById('wizardNav');
    }

    init() {
        this.renderProgressIndicators();
        this.renderStep(this.currentIndex);
        this.updateNav();

        this.btnBack.addEventListener('click', () => this.prev());
        this.btnNext.addEventListener('click', () => this.next());
    }

    renderProgressIndicators() {
        this.progressSteps.innerHTML = '';
        this.steps.forEach((step, i) => {
            const dot = document.createElement('div');
            dot.className = 'progress-step';
            dot.dataset.index = i;

            const num = document.createElement('span');
            num.className = 'step-number';
            num.textContent = i + 1;
            dot.appendChild(num);

            const label = document.createElement('span');
            label.className = 'step-label';
            label.textContent = step.title;
            dot.appendChild(label);

            this.progressSteps.appendChild(dot);
        });
    }

    updateProgress() {
        const pct = ((this.currentIndex) / (this.steps.length - 1)) * 100;
        this.progressFill.style.width = `${pct}%`;

        const dots = this.progressSteps.querySelectorAll('.progress-step');
        dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === this.currentIndex);
            dot.classList.toggle('completed', i < this.currentIndex);
        });
    }

    updateNav() {
        this.btnBack.style.visibility = this.currentIndex === 0 ? 'hidden' : 'visible';

        const step = this.steps[this.currentIndex];
        if (step.isTerminal) {
            this.nav.style.display = 'none';
        } else {
            this.nav.style.display = '';
            this.btnNext.textContent = this.currentIndex === this.steps.length - 1 ? 'Launch Setup' : 'Next';
        }
    }

    async renderStep(index, direction = 'none') {
        const step = this.steps[index];

        const wrapper = document.createElement('div');
        wrapper.className = 'wizard-step';
        wrapper.innerHTML = step.render();

        if (direction !== 'none') {
            wrapper.classList.add(direction === 'forward' ? 'slide-in-right' : 'slide-in-left');
        } else {
            wrapper.classList.add('fade-in');
        }

        // Clear and append
        const oldStep = this.body.querySelector('.wizard-step');
        if (oldStep && direction !== 'none') {
            oldStep.classList.add(direction === 'forward' ? 'slide-out-left' : 'slide-out-right');
            setTimeout(() => oldStep.remove(), 300);
            setTimeout(() => {
                this.body.appendChild(wrapper);
                step.afterRender?.();
            }, 50);
        } else {
            this.body.innerHTML = '';
            this.body.appendChild(wrapper);
            step.afterRender?.();
        }

        this.updateProgress();
        this.updateNav();
    }

    async next() {
        const step = this.steps[this.currentIndex];

        // Validate current step
        if (step.validate && !step.validate()) {
            return;
        }

        // Collect data from the step
        if (step.getData) {
            step.getData();
        }

        if (this.currentIndex === this.steps.length - 1) {
            // Final step — trigger setup
            this.onComplete();
            return;
        }

        this.currentIndex++;
        await this.renderStep(this.currentIndex, 'forward');
    }

    async prev() {
        if (this.currentIndex === 0) return;
        this.currentIndex--;
        await this.renderStep(this.currentIndex, 'backward');
    }

    // Replace the wizard with a success/result view
    showResult(html) {
        this.nav.style.display = 'none';
        this.body.innerHTML = `<div class="wizard-step fade-in">${html}</div>`;
        // Update progress to 100%
        this.progressFill.style.width = '100%';
        const dots = this.progressSteps.querySelectorAll('.progress-step');
        dots.forEach(dot => dot.classList.add('completed'));
    }

    // Show a progress/working state
    showWorking(html) {
        this.nav.style.display = 'none';
        this.body.innerHTML = `<div class="wizard-step fade-in">${html}</div>`;
    }

    // Restore navigation (e.g. after error)
    restoreNav() {
        this.nav.style.display = '';
        this.renderStep(this.currentIndex, 'none');
    }

    setNextEnabled(enabled) {
        this.btnNext.disabled = !enabled;
    }

    setNextText(text) {
        this.btnNext.textContent = text;
    }
}
