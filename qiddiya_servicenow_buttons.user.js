// ==UserScript==
// @name         Qiddiya - User Requests & Assets & Accessories Buttons
// @namespace    http://tampermonkey.net/
// @version      1.6
// @description  Add "Requests", "Assets", and "Accessories" buttons for the shown user (works on task/request forms + user profile + asset record)
// @author       You
// @match        https://support.qiddiya.com/sc_task.do*
// @match        https://support.qiddiya.com/sc_req_item.do*
// @match        https://support.qiddiya.com/sys_user.do*
// @match        https://support.qiddiya.com/alm_hardware.do*
// @match        https://support.qiddiya.com/now/nav/ui/classic/params/target/sc_req_item.do*
// @match        https://support.qiddiya.com/now/nav/ui/classic/params/target/sys_user.do*
// @match        https://support.qiddiya.com/now/nav/ui/classic/params/target/alm_hardware.do*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // Keep EXACT same sizing/shape as your previous version
    function styleButton(btn, bgColor, hoverColor) {
        btn.style.marginLeft = '8px';
        btn.style.padding = '3px 10px';   // keep same
        btn.style.fontSize = '11px';      // keep same
        btn.style.cursor = 'pointer';
        btn.style.border = '1px solid transparent';
        btn.style.borderRadius = '4px';
        btn.style.color = '#ffffff';
        btn.style.background = bgColor;
        btn.style.lineHeight = '1.4';
        btn.style.boxShadow = 'none';

        btn.addEventListener('mouseenter', () => { btn.style.background = hoverColor; });
        btn.addEventListener('mouseleave', () => { btn.style.background = bgColor; });
    }

    // -----------------------------
    // Find input fields (by page)
    // -----------------------------

    // sc_task / sc_req_item: "Requested for" field
    function findRequestedForInput(doc) {
        if (!doc) return null;

        const selectors = [
            'input#sys_display\\.sc_task\\.request_item\\.requested_for',
            'input[name="sys_display.sc_task.request_item.requested_for"]',
            'input#sys_display\\.sc_req_item\\.requested_for',
            'input[name="sys_display.sc_req_item.requested_for"]'
        ];

        for (const sel of selectors) {
            const el = doc.querySelector(sel);
            if (el) return el;
        }
        return null;
    }

    // sys_user profile: user name field (anchor point)
    function findProfileNameInput(doc) {
        if (!doc) return null;

        const selectors = [
            'input#sys_user\\.name',
            'input[name="sys_user.name"]',
            'input#sys_user\\.full_name',
            'input[name="sys_user.full_name"]'
        ];

        for (const sel of selectors) {
            const el = doc.querySelector(sel);
            if (el) return el;
        }

        const wrapper = doc.querySelector('#element\\.sys_user\\.name');
        if (wrapper) {
            const input = wrapper.querySelector('input');
            if (input) return input;
        }

        return null;
    }

    // alm_hardware record: "Assigned to" display field
    function findAssetAssignedToInput(doc) {
        if (!doc) return null;

        const selectors = [
            'input#sys_display\\.alm_hardware\\.assigned_to',
            'input[name="sys_display.alm_hardware.assigned_to"]',
            // some instances can have different table prefix (rare), so fallback by wrapper id:
            '#element\\.alm_hardware\\.assigned_to input'
        ];

        for (const sel of selectors) {
            const el = doc.querySelector(sel);
            if (el) return el;
        }
        return null;
    }

    // Find target input from main doc or iframes (classic nav)
    function findTargetInputAnyContext() {
        // 1) main doc
        let el =
            findRequestedForInput(document) ||
            findProfileNameInput(document) ||
            findAssetAssignedToInput(document);

        if (el) return el;

        // 2) iframes (classic nav usually uses gsft_main)
        const iframes = document.querySelectorAll('iframe');
        for (const frame of iframes) {
            try {
                const frameDoc = frame.contentDocument || frame.contentWindow?.document;
                if (!frameDoc) continue;

                el =
                    findRequestedForInput(frameDoc) ||
                    findProfileNameInput(frameDoc) ||
                    findAssetAssignedToInput(frameDoc);

                if (el) return el;
            } catch (e) {
                continue;
            }
        }

        return null;
    }

    // -----------------------------
    // URL openers
    // -----------------------------

    function openRequestsForUser(name) {
        const n = (name || '').trim();
        if (!n) return alert('User name is empty. Please select/ensure the user name is visible.');

        const listUrl =
            'sc_req_item_list.do?' +
            'sysparm_query=' +
            encodeURIComponent('requested_for.nameSTARTSWITH' + n) +
            '&sysparm_first_row=1' +
            '&sysparm_view=sow' +
            '&sysparm_choice_query_raw=' +
            '&sysparm_list_header_search=true';

        const fullUrl =
            'https://support.qiddiya.com/now/nav/ui/classic/params/target/' +
            encodeURIComponent(listUrl);

        window.open(fullUrl, '_blank');
    }

    function openAssetsForUser(name) {
        const n = (name || '').trim();
        if (!n) return alert('User name is empty. Please select/ensure the user name is visible.');

        const assetUrl =
            'alm_hardware_list.do?' +
            'sysparm_query=' +
            encodeURIComponent('assigned_to.nameSTARTSWITH' + n) +
            '&sysparm_first_row=1' +
            '&sysparm_view=' +
            '&sysparm_choice_query_raw=' +
            '&sysparm_list_header_search=true';

        const fullUrl =
            'https://support.qiddiya.com/now/nav/ui/classic/params/target/' +
            encodeURIComponent(assetUrl);

        window.open(fullUrl, '_blank');
    }

    function openAccessoriesForUser(name) {
        const n = (name || '').trim();
        if (!n) return alert('User name is empty. Please select/ensure the user name is visible.');

        const accUrl =
            'cmdb_ci_acc_list.do?' +
            'sysparm_query=' +
            encodeURIComponent('assigned_to.nameSTARTSWITH' + n) +
            '&sysparm_first_row=1' +
            '&sysparm_view=' +
            '&sysparm_choice_query_raw=' +
            '&sysparm_list_header_search=true';

        const fullUrl =
            'https://support.qiddiya.com/now/nav/ui/classic/params/target/' +
            encodeURIComponent(accUrl);

        window.open(fullUrl, '_blank');
    }

    // -----------------------------
    // Inject buttons
    // -----------------------------

    function tryAddButtons() {
        const targetInput = findTargetInputAnyContext();
        if (!targetInput) return;

        const doc = targetInput.ownerDocument;

        // Avoid duplicates
        if (doc.getElementById('qiddiya-user-requests-btn')) return;

        // Requests button (Blue)
        const btnReq = doc.createElement('button');
        btnReq.id = 'qiddiya-user-requests-btn';
        btnReq.type = 'button';
        btnReq.textContent = 'View user requests';
        btnReq.title = 'Open all requests for this user';
        styleButton(btnReq, '#1F6FEB', '#1A5FD1'); // blue

        // Assets button (Green)
        const btnAssets = doc.createElement('button');
        btnAssets.id = 'qiddiya-user-assets-btn';
        btnAssets.type = 'button';
        btnAssets.textContent = 'View user assets';
        btnAssets.title = 'Open all assets assigned to this user';
        styleButton(btnAssets, '#1F9D55', '#168243'); // green

        // Accessories button (Purple)
        const btnAcc = doc.createElement('button');
        btnAcc.id = 'qiddiya-user-accessories-btn';
        btnAcc.type = 'button';
        btnAcc.textContent = 'View user accessories';
        btnAcc.title = 'Open all accessories assigned to this user';
        styleButton(btnAcc, '#7C3AED', '#6D28D9'); // purple

        const getName = () => (targetInput.value || '').trim();

        btnReq.addEventListener('click', () => openRequestsForUser(getName()));
        btnAssets.addEventListener('click', () => openAssetsForUser(getName()));
        btnAcc.addEventListener('click', () => openAccessoriesForUser(getName()));

        // Insert next to the input
        if (targetInput.parentElement) {
            targetInput.parentElement.appendChild(btnReq);
            targetInput.parentElement.appendChild(btnAssets);
            targetInput.parentElement.appendChild(btnAcc);
        } else {
            targetInput.insertAdjacentElement('afterend', btnReq);
            btnReq.insertAdjacentElement('afterend', btnAssets);
            btnAssets.insertAdjacentElement('afterend', btnAcc);
        }
    }

    function init() {
        tryAddButtons();

        // Handle dynamic rendering in ServiceNow
        const observer = new MutationObserver(() => {
            tryAddButtons();
        });

        if (document.body) {
            observer.observe(document.body, { childList: true, subtree: true });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
