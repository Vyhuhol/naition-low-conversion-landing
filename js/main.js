document.addEventListener('DOMContentLoaded', () => {
    const counterId = 111075366;
    const registrationSection = document.getElementById('registration');
    const registrationPanel = registrationSection?.querySelector('.registration-panel');
    const form = document.getElementById('registration-form');
    const message = document.getElementById('form-message');
    const registerButtons = document.querySelectorAll('.btn-register');
    const selectedTariffName = document.getElementById('selected-tariff-name');
    const selectedTariffPrice = document.getElementById('selected-tariff-price');
    const purposeInput = form?.querySelector('textarea[name="purpose"]');
    const purposeOptions = document.querySelectorAll('.purpose-option');
    const mobileBookingBar = document.querySelector('.mobile-booking-bar');
    const hero = document.querySelector('.hero');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const trackGoal = (goal, params = {}) => {
        if (typeof window.ym === 'function') {
            window.ym(counterId, 'reachGoal', goal, params);
        }
    };

    const showSelectedTariff = (button) => {
        const tariffName = button.dataset.tariffName || 'Участие в курсе';
        const tariffPrice = button.dataset.tariffPrice || 'от 4 900 ₽';

        if (selectedTariffName) {
            selectedTariffName.textContent = tariffName;
        }

        if (selectedTariffPrice) {
            selectedTariffPrice.textContent = tariffPrice;
        }

        if (form) {
            form.dataset.selectedTariff = tariffName;
            const tariffInput = form.querySelector('input[name="tariff"]');
            if (tariffInput instanceof HTMLInputElement) {
                tariffInput.value = tariffName;
            }
        }

        document.querySelectorAll('.pricing-card.is-selected').forEach((card) => {
            card.classList.remove('is-selected');
        });

        const pricingCard = button.closest('.pricing-card');
        if (pricingCard) {
            pricingCard.classList.add('is-selected');
        }

        return tariffName;
    };

    registerButtons.forEach((button) => {
        button.addEventListener('click', () => {
            if (!registrationSection) {
                return;
            }

            const source = button.dataset.ctaSource || 'unknown';
            const tariffName = showSelectedTariff(button);

            const ctaGoal = source === 'hero'
                ? 'hero_cta_click'
                : source === 'mobile_sticky'
                    ? 'mobile_cta_click'
                    : 'pricing_cta_click';

            trackGoal(ctaGoal, {
                source,
                tariff: tariffName,
            });

            registrationSection.scrollIntoView({
                behavior: reducedMotion ? 'auto' : 'smooth',
                block: 'start',
            });

            if (registrationPanel) {
                registrationPanel.classList.remove('is-highlighted');
                window.requestAnimationFrame(() => {
                    registrationPanel.classList.add('is-highlighted');
                });
                window.setTimeout(() => {
                    registrationPanel.classList.remove('is-highlighted');
                }, reducedMotion ? 0 : 1400);
            }

            const firstVisibleInput = form?.querySelector('input:not([type="hidden"])');
            window.setTimeout(() => {
                firstVisibleInput?.focus({ preventScroll: true });
            }, reducedMotion ? 0 : 650);
        });
    });

    const updateMobileBookingBar = () => {
        if (!mobileBookingBar || !hero || !registrationSection) {
            return;
        }

        const isMobile = window.matchMedia('(max-width: 720px)').matches;
        const heroPassed = hero.getBoundingClientRect().bottom < 0;
        const registrationReached = registrationSection.getBoundingClientRect().top < window.innerHeight * 0.7;

        mobileBookingBar.classList.toggle(
            'is-visible',
            isMobile && heroPassed && !registrationReached
        );
    };

    updateMobileBookingBar();
    window.addEventListener('scroll', updateMobileBookingBar, { passive: true });
    window.addEventListener('resize', updateMobileBookingBar);

    if (!form) {
        return;
    }

    let formStarted = false;

    purposeOptions.forEach((option) => {
        option.addEventListener('click', () => {
            if (!(purposeInput instanceof HTMLTextAreaElement)) {
                return;
            }

            purposeOptions.forEach((item) => {
                item.classList.remove('is-selected');
                item.setAttribute('aria-pressed', 'false');
            });

            option.classList.add('is-selected');
            option.setAttribute('aria-pressed', 'true');
            purposeInput.value = option.dataset.purposeValue || '';
            purposeInput.dispatchEvent(new Event('input', { bubbles: true }));

            trackGoal('purpose_option_select', {
                option: option.dataset.purposeId || 'unknown',
            });
        });
    });

    purposeInput?.addEventListener('input', (event) => {
        if (event.isTrusted) {
            purposeOptions.forEach((option) => {
                option.classList.remove('is-selected');
                option.setAttribute('aria-pressed', 'false');
            });
        }
    });

    form.addEventListener('input', () => {
        if (formStarted) {
            return;
        }

        formStarted = true;
        trackGoal('form_start', {
            tariff: form.dataset.selectedTariff || 'Участие в курсе',
        });
    });

    if ('IntersectionObserver' in window) {
        let formViewed = false;
        const observer = new IntersectionObserver((entries) => {
            if (formViewed || !entries.some((entry) => entry.isIntersecting)) {
                return;
            }

            formViewed = true;
            trackGoal('form_view');
            observer.disconnect();
        }, { threshold: 0.35 });

        observer.observe(form);
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const submitButton = form.querySelector('button[type="submit"]');
        const formData = new FormData(form);

        trackGoal('form_submit_attempt', {
            tariff: form.dataset.selectedTariff || 'Участие в курсе',
        });

        if (submitButton instanceof HTMLButtonElement) {
            submitButton.disabled = true;
            submitButton.textContent = 'Отправляем…';
        }

        if (message) {
            message.textContent = '';
            message.className = 'form-message';
        }

        try {
            const response = await fetch(form.action, {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok || !data.ok) {
                throw new Error(data.error || 'Не удалось отправить заявку.');
            }

            trackGoal('form_submit_success', {
                tariff: form.dataset.selectedTariff || 'Участие в курсе',
            });

            if (message) {
                message.textContent = 'Заявка принята. Мы свяжемся с вами, сообщим о наличии мест и ответим на вопросы.';
                message.className = 'form-message success';
            }

            form.reset();
            formStarted = false;
        } catch (error) {
            trackGoal('form_submit_error');

            if (message) {
                message.textContent = error instanceof Error ? error.message : 'Не удалось отправить заявку.';
                message.className = 'form-message error';
            }
        } finally {
            if (submitButton instanceof HTMLButtonElement) {
                submitButton.disabled = false;
                submitButton.textContent = 'Проверить наличие мест';
            }
        }
    });
});
