(function () {
    'use strict';

    if (window.V2BoardRegistrationCaptchaInitialized) return;
    window.V2BoardRegistrationCaptchaInitialized = true;

    var ROOT_ID = 'v2board-registration-captcha';
    var STYLE_ID = 'v2board-registration-captcha-style';
    var TURNSTILE_SCRIPT_ID = 'v2board-registration-turnstile-script';
    var CAP_SCRIPT_ID = 'v2board-registration-cap-script';
    var state = {
        loading: false,
        loaded: false,
        config: null,
        providers: [],
        provider: '',
        token: ''
    };

    function isRegisterRoute() {
        return /^#\/register(?:[/?]|$)/.test(window.location.hash || '');
    }

    function getRegisterButton() {
        var buttons = document.querySelectorAll('#main-container .form-group.mb-0 > button[type="submit"]');
        return buttons.length ? buttons[buttons.length - 1] : null;
    }

    function getHost() {
        return document.getElementById(ROOT_ID);
    }

    function addStyles() {
        if (document.getElementById(STYLE_ID)) return;

        var style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = [
            '.v2board-registration-captcha{margin:0 0 1rem}',
            '.v2board-registration-captcha-label{display:block;margin:0 0 .45rem;color:#343a40;font-size:.9rem;font-weight:600}',
            '.v2board-registration-captcha-required{color:#dc3545}',
            '.v2board-registration-captcha-select{margin-bottom:.75rem}',
            '.v2board-registration-captcha-widget{min-height:68px;display:flex;align-items:center}',
            '.v2board-registration-captcha-hint{margin-top:.4rem;color:#dc3545;font-size:.8rem}',
            '.v2board-registration-captcha-loading{color:#6c757d;font-size:.875rem}'
        ].join('');
        document.head.appendChild(style);
    }

    function resetToken() {
        state.token = '';
        window.V2BoardRegistrationCaptcha = null;
    }

    function setToken(token) {
        state.token = typeof token === 'string' ? token : '';
        window.V2BoardRegistrationCaptcha = state.token ? {
            provider: state.provider,
            token: state.token
        } : null;
        setHint(state.token ? '' : '请先完成人机验证');
    }

    function setHint(text) {
        var host = getHost();
        var hint = host && host.querySelector('.v2board-registration-captcha-hint');
        if (hint) hint.textContent = text || '';
    }

    function enabledProviders(config) {
        var providers = Array.isArray(config.captcha_providers) ? config.captcha_providers : [];
        return providers.filter(function (provider) {
            if (provider === 'turnstile') return !!config.recaptcha_site_key;
            if (provider === 'cap') return !!config.cap_endpoint && !!config.cap_site_key;
            return false;
        });
    }

    function createHost() {
        var button = getRegisterButton();
        if (!button) return null;

        var buttonGroup = button.parentNode;
        if (!buttonGroup || !buttonGroup.parentNode) return null;

        var host = getHost();
        if (!host) {
            host = document.createElement('div');
            host.id = ROOT_ID;
            host.className = 'form-group v2board-registration-captcha';
            buttonGroup.parentNode.insertBefore(host, buttonGroup);
        }
        return host;
    }

    function loadScript(id, src, done, failed) {
        var script = document.getElementById(id);
        if (script) {
            script.addEventListener('load', done);
            script.addEventListener('error', failed);
            return;
        }

        script = document.createElement('script');
        script.id = id;
        script.async = true;
        script.src = src;
        script.addEventListener('load', done);
        script.addEventListener('error', failed);
        document.head.appendChild(script);
    }

    function renderTurnstile(container) {
        var config = state.config;
        var rendered = false;

        function render() {
            if (rendered || !container.isConnected || state.provider !== 'turnstile') return;
            if (!window.turnstile || typeof window.turnstile.render !== 'function') return;

            rendered = true;
            try {
                window.turnstile.render(container, {
                    sitekey: config.recaptcha_site_key,
                    callback: function (token) { setToken(token); },
                    'expired-callback': resetToken,
                    'error-callback': function () {
                        resetToken();
                        setHint('人机验证加载失败，请切换验证方式或稍后重试');
                    }
                });
            } catch (error) {
                rendered = false;
                setHint('人机验证加载失败，请刷新页面后重试');
            }
        }

        if (window.turnstile && typeof window.turnstile.render === 'function') {
            render();
            return;
        }

        loadScript(
            TURNSTILE_SCRIPT_ID,
            'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit',
            render,
            function () { setHint('人机验证脚本加载失败，请切换验证方式或稍后重试'); }
        );
        window.setTimeout(render, 1200);
    }

    function renderCap(container) {
        var config = state.config;

        function mount() {
            if (!container.isConnected || state.provider !== 'cap') return;
            container.innerHTML = '';

            var widget = document.createElement('cap-widget');
            widget.setAttribute(
                'data-cap-api-endpoint',
                String(config.cap_endpoint).replace(/\/+$/, '') + '/' + config.cap_site_key + '/'
            );
            widget.addEventListener('solve', function (event) {
                setToken(event && event.detail ? event.detail.token : '');
            });
            widget.addEventListener('error', function () {
                resetToken();
                setHint('人机验证失败，请重试或切换 Cloudflare 验证');
            });
            widget.addEventListener('expired', resetToken);
            container.appendChild(widget);
        }

        if (window.customElements && window.customElements.get('cap-widget')) {
            mount();
            return;
        }

        loadScript(
            CAP_SCRIPT_ID,
            config.cap_widget_url || 'https://cdn.jsdelivr.net/npm/cap-widget@latest',
            function () {
                if (window.customElements && window.customElements.whenDefined) {
                    window.customElements.whenDefined('cap-widget').then(mount);
                } else {
                    mount();
                }
            },
            function () { setHint('人机验证脚本加载失败，请切换 Cloudflare 验证或稍后重试'); }
        );
    }

    function render() {
        var host = createHost();
        if (!host) return;

        if (state.loading) {
            host.innerHTML = '<div class="v2board-registration-captcha-loading">正在加载人机验证…</div>';
            return;
        }

        if (!state.providers.length) {
            host.remove();
            resetToken();
            return;
        }

        if (state.providers.indexOf(state.provider) === -1) {
            state.provider = state.providers.indexOf('cap') !== -1 ? 'cap' : state.providers[0];
            resetToken();
        }

        var options = state.providers.map(function (provider) {
            var label = provider === 'cap' ? 'CAP 验证' : 'Cloudflare 验证';
            return '<option value="' + provider + '">' + label + '</option>';
        }).join('');

        host.innerHTML = [
            '<label class="v2board-registration-captcha-label" for="v2board-registration-captcha-provider">人机验证方式 <span class="v2board-registration-captcha-required">*</span></label>',
            '<select id="v2board-registration-captcha-provider" class="form-control form-control-alt v2board-registration-captcha-select">' + options + '</select>',
            '<div class="v2board-registration-captcha-widget"></div>',
            '<div class="v2board-registration-captcha-hint"></div>'
        ].join('');

        var select = host.querySelector('select');
        select.value = state.provider;
        select.addEventListener('change', function () {
            state.provider = select.value;
            resetToken();
            render();
        });

        var container = host.querySelector('.v2board-registration-captcha-widget');
        if (state.provider === 'cap') renderCap(container);
        else renderTurnstile(container);
    }

    function loadConfig() {
        if (state.loading || state.loaded) return;
        state.loading = true;
        render();

        var request = new XMLHttpRequest();
        request.open('GET', '/api/v1/guest/comm/config', true);
        request.onreadystatechange = function () {
            if (request.readyState !== 4) return;

            state.loading = false;
            state.loaded = true;
            if (request.status >= 200 && request.status < 300) {
                try {
                    var response = JSON.parse(request.responseText);
                    state.config = response.data || {};
                    state.providers = enabledProviders(state.config);
                } catch (error) {
                    state.config = {};
                    state.providers = [];
                }
            } else {
                state.config = {};
                state.providers = [];
            }
            render();
        };
        request.send();
    }

    function ensure() {
        if (!isRegisterRoute()) {
            var host = getHost();
            if (host) host.remove();
            resetToken();
            return;
        }

        addStyles();
        createHost();
        loadConfig();
        if (state.loaded) render();
    }

    function isRegisterButton(button) {
        return button && button === getRegisterButton() && isRegisterRoute();
    }

    document.addEventListener('click', function (event) {
        var button = event.target && event.target.closest ? event.target.closest('button') : null;
        if (!isRegisterButton(button)) return;

        if (state.loading || !state.loaded) {
            event.preventDefault();
            event.stopImmediatePropagation();
            setHint('人机验证正在加载，请稍候');
            return;
        }

        if (state.providers.length && !state.token) {
            event.preventDefault();
            event.stopImmediatePropagation();
            setHint('请先完成人机验证');
        }
    }, true);

    window.addEventListener('hashchange', ensure);
    new MutationObserver(function () {
        if (isRegisterRoute() && !getHost()) ensure();
    }).observe(document.documentElement, { childList: true, subtree: true });
    ensure();
}());
