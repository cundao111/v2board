(function () {
    'use strict';

    var ENTRY_ID = 'batch-reset-user-secret-admin-entry';
    var MODAL_ID = 'batch-reset-user-secret-admin-modal';
    var API_URL = '/api/v1/batch-reset-user-secret/reset';

    function isUserPage() {
        var route = window.location.pathname + window.location.hash;
        return /(?:^|[\/#])user(?:[\/?#]|$)/.test(route);
    }

    function getAuthorization() {
        return window.localStorage.getItem('authorization');
    }

    function installStyles() {
        if (document.getElementById('batch-reset-user-secret-admin-style')) return;
        var style = document.createElement('style');
        style.id = 'batch-reset-user-secret-admin-style';
        style.textContent = [
            '.brus-mask{position:fixed;inset:0;z-index:1050;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:20px}',
            '.brus-dialog{width:680px;max-width:100%;max-height:90vh;overflow:auto;background:#fff;border-radius:6px;box-shadow:0 8px 30px rgba(0,0,0,.25)}',
            '.brus-head{display:flex;align-items:center;justify-content:space-between;padding:16px 24px;border-bottom:1px solid #e8e8e8}',
            '.brus-title{font-size:16px;font-weight:600}',
            '.brus-close{border:0;background:transparent;font-size:24px;line-height:1;color:#8c8c8c;cursor:pointer}',
            '.brus-body{padding:20px 24px}',
            '.brus-warning{margin-bottom:16px;padding:10px 12px;border:1px solid #ffe58f;background:#fffbe6;border-radius:4px;color:#874d00;line-height:1.6}',
            '.brus-label{display:block;margin-bottom:8px;font-weight:600}',
            '.brus-input{width:100%;min-height:150px;padding:10px 12px;border:1px solid #d9d9d9;border-radius:4px;resize:vertical;line-height:1.6}',
            '.brus-input:focus{outline:0;border-color:#40a9ff;box-shadow:0 0 0 2px rgba(24,144,255,.2)}',
            '.brus-foot{display:flex;justify-content:flex-end;gap:10px;padding:12px 24px;border-top:1px solid #e8e8e8}',
            '.brus-btn{padding:7px 15px;border:1px solid #d9d9d9;border-radius:4px;background:#fff;cursor:pointer}',
            '.brus-btn-danger{border-color:#ff4d4f;background:#ff4d4f;color:#fff}',
            '.brus-btn:disabled{cursor:not-allowed;opacity:.55}',
            '.brus-result{display:none;margin-top:18px;padding-top:14px;border-top:1px solid #f0f0f0}',
            '.brus-result-show{display:block}',
            '.brus-result-title{margin-bottom:8px;font-weight:600}',
            '.brus-success{color:#389e0d}',
            '.brus-error{color:#cf1322}',
            '.brus-muted{color:#8c8c8c}',
            '.brus-list{margin:5px 0 12px;padding-left:22px}'
        ].join('');
        document.head.appendChild(style);
    }

    function createButton() {
        var button = document.createElement('button');
        button.id = ENTRY_ID;
        button.type = 'button';
        button.className = 'ant-btn ml-2';
        button.style.marginLeft = '8px';
        button.innerHTML = '<i class="anticon anticon-reload"></i><span>批量重置 UUID 及订阅 URL</span>';
        button.addEventListener('click', openModal);
        return button;
    }

    function mountEntry() {
        if (!getAuthorization() || !isUserPage() || document.getElementById(ENTRY_ID)) return;
        var toolbar = document.querySelector('.v2board-table-action');
        if (toolbar) toolbar.appendChild(createButton());
    }

    function appendList(container, title, items, className) {
        var heading = document.createElement('div');
        heading.className = 'brus-result-title ' + className;
        heading.textContent = title + '（' + items.length + '）';
        container.appendChild(heading);
        if (!items.length) return;
        var list = document.createElement('ul');
        list.className = 'brus-list';
        items.forEach(function (email) {
            var item = document.createElement('li');
            item.textContent = email;
            list.appendChild(item);
        });
        container.appendChild(list);
    }

    function showError(result, message) {
        result.textContent = '';
        result.className = 'brus-result brus-result-show';
        var title = document.createElement('div');
        title.className = 'brus-result-title brus-error';
        title.textContent = '执行失败';
        var detail = document.createElement('div');
        detail.textContent = message;
        result.appendChild(title);
        result.appendChild(detail);
    }

    function closeModal() {
        var modal = document.getElementById(MODAL_ID);
        if (modal && !modal.dataset.loading) modal.remove();
    }

    function submit(modal) {
        var input = modal.querySelector('.brus-input');
        var submitButton = modal.querySelector('.brus-submit');
        var result = modal.querySelector('.brus-result');
        var emails = input.value.trim();
        if (!emails) return showError(result, '请输入至少一个用户邮箱。');
        if (emails.indexOf('，') !== -1) return showError(result, '邮箱之间请使用英文逗号（,）分隔。');

        var count = emails.split(',').filter(function (email) { return email.trim() !== ''; }).length;
        if (!window.confirm('将重置 ' + count + ' 个邮箱对应用户的 UUID 和订阅 URL。\n\n原节点和旧订阅链接会立即失效，确定继续吗？')) return;

        modal.dataset.loading = '1';
        submitButton.disabled = true;
        submitButton.textContent = '正在重置…';
        result.className = 'brus-result';

        window.fetch(API_URL, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': getAuthorization() || ''
            },
            body: JSON.stringify({ emails: emails })
        }).then(function (response) {
            return response.json().catch(function () { return {}; }).then(function (body) {
                if (!response.ok) throw new Error(body.message || '请求失败，请重新登录管理员后台。');
                return body;
            });
        }).then(function (body) {
            var data = body.data || {};
            result.textContent = '';
            result.className = 'brus-result brus-result-show';
            var title = document.createElement('div');
            title.className = 'brus-result-title brus-success';
            title.textContent = '批量重置完成';
            result.appendChild(title);
            appendList(result, '重置成功', data.reset_emails || [], 'brus-success');
            appendList(result, '未找到用户', data.not_found_emails || [], 'brus-error');
            appendList(result, '已忽略的重复邮箱', data.duplicate_emails || [], 'brus-muted');
        }).catch(function (error) {
            showError(result, error.message || '发生未知错误。');
        }).then(function () {
            delete modal.dataset.loading;
            submitButton.disabled = false;
            submitButton.textContent = '确认批量重置';
        });
    }

    function openModal() {
        if (document.getElementById(MODAL_ID)) return;
        var modal = document.createElement('div');
        modal.id = MODAL_ID;
        modal.className = 'brus-mask';
        modal.innerHTML = [
            '<div class="brus-dialog" role="dialog" aria-modal="true">',
            '<div class="brus-head"><div class="brus-title">批量重置 UUID 及订阅 URL</div><button type="button" class="brus-close" aria-label="关闭">&times;</button></div>',
            '<div class="brus-body"><div class="brus-warning">执行后，用户原来的节点 UUID 和订阅链接会立即失效，需要登录官网重新复制订阅。</div>',
            '<label class="brus-label" for="brus-emails">用户邮箱</label><textarea id="brus-emails" class="brus-input" placeholder="aaa@gmail.com,bbb@gmail.com"></textarea>',
            '<div class="brus-result" aria-live="polite"></div></div>',
            '<div class="brus-foot"><button type="button" class="brus-btn brus-cancel">取消</button><button type="button" class="brus-btn brus-btn-danger brus-submit">确认批量重置</button></div></div>'
        ].join('');
        modal.querySelector('.brus-close').addEventListener('click', closeModal);
        modal.querySelector('.brus-cancel').addEventListener('click', closeModal);
        modal.querySelector('.brus-submit').addEventListener('click', function () { submit(modal); });
        modal.addEventListener('click', function (event) { if (event.target === modal) closeModal(); });
        document.body.appendChild(modal);
        modal.querySelector('.brus-input').focus();
    }

    installStyles();
    new MutationObserver(mountEntry).observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener('hashchange', mountEntry);
    window.addEventListener('popstate', mountEntry);
    mountEntry();
}());
