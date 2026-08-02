// ==UserScript==
// @name         Qiddiya - User Requests & Assets & Accessories Buttons + Warranty
// @namespace    http://tampermonkey.net/
// @version      3.3
// @description  Add "Requests", "Assets", "Accessories" buttons, Lenovo warranty via daghriry.info API, accessory name dropdown, and @ mention button in comment box
// @author       You
// @match        https://support.qiddiya.com/sc_task.do*
// @match        https://support.qiddiya.com/sc_req_item.do*
// @match        https://support.qiddiya.com/sys_user.do*
// @match        https://support.qiddiya.com/alm_hardware.do*
// @match        https://support.qiddiya.com/cmdb_ci_acc.do*
// @match        https://support.qiddiya.com/now/nav/ui/classic/params/target/sc_req_item.do*
// @match        https://support.qiddiya.com/now/nav/ui/classic/params/target/sys_user.do*
// @match        https://support.qiddiya.com/now/nav/ui/classic/params/target/alm_hardware.do*
// @match        https://support.qiddiya.com/now/nav/ui/classic/params/target/cmdb_ci_acc.do*
// @grant        GM_xmlhttpRequest
// @connect      pcsupport.lenovo.com
// @connect      daghriry.info
// @connect      127.0.0.1
// @connect      localhost
// ==/UserScript==

(function () {
    'use strict';

    // Daghriry Lenovo lookup API (change for local dev, e.g. http://127.0.0.1:5000)
    const DAGHRIRY_API_BASE = 'https://daghriry.info';

    // ─── Accessory name options ───────────────────────────────────────────────
    const ACCESSORY_NAMES = [
        'Lenovo Wireless Keyboard & Mouse Combo',
        'Lenovo Headset',
        'Lenovo Bag',
        'Lenovo Webcam',
        'Cables',
        'Privacy Screen'
    ];

    // ─── Style helpers ────────────────────────────────────────────────────────
    function styleButton(btn, bgColor, hoverColor) {
        btn.style.marginLeft = '8px';
        btn.style.padding = '3px 10px';
        btn.style.fontSize = '11px';
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

    // ─── Input finders ────────────────────────────────────────────────────────
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

    function findAssetAssignedToInput(doc) {
        if (!doc) return null;
        const selectors = [
            'input#sys_display\\.alm_hardware\\.assigned_to',
            'input[name="sys_display.alm_hardware.assigned_to"]',
            '#element\\.alm_hardware\\.assigned_to input'
        ];
        for (const sel of selectors) {
            const el = doc.querySelector(sel);
            if (el) return el;
        }
        return null;
    }

    function findSerialNumberInput(doc) {
        if (!doc) return null;
        const selectors = [
            'input#alm_hardware\\.serial_number',
            'input[name="alm_hardware.serial_number"]',
            '#element\\.alm_hardware\\.serial_number input'
        ];
        for (const sel of selectors) {
            const el = doc.querySelector(sel);
            if (el) return el;
        }
        return null;
    }

    // ─── Accessory "Name" input finder ────────────────────────────────────────
    function findAccessoryNameInput(doc) {
        if (!doc) return null;
        const selectors = [
            'input#cmdb_ci_acc\\.name',
            'input[name="cmdb_ci_acc.name"]',
            '#element\\.cmdb_ci_acc\\.name input'
        ];
        for (const sel of selectors) {
            const el = doc.querySelector(sel);
            if (el) return el;
        }
        return null;
    }
    // ─── Accessory "Item" input finder ──────
    function findCatalogItemInput(doc) {
        if (!doc) return null;

        const selectors = [
            'input#sys_display\\.sc_req_item\\.cat_item',
            'input[name="sys_display.sc_req_item.cat_item"]',
            '#element\\.sc_req_item\\.cat_item input'
        ];

        for (const sel of selectors) {
            const el = doc.querySelector(sel);
            if (el) return el;
        }

        return null;
    }


    // ─── Comment textarea finder ───────────────────────────────────────────────
    function findCommentTextarea(doc) {
        if (!doc) return null;
        return doc.querySelector('textarea#activity-stream-textarea') ||
               doc.querySelector('textarea[data-as-unique-id="activity-stream-textarea"]') ||
               doc.querySelector('textarea[data-stream-text-input="comments"]');
    }

    function findCommentTextareaAnyContext() {
        return searchInAllContexts(findCommentTextarea);
    }

    // ─── Mention button injection ──────────────────────────────────────────────
    function injectMentionButton() {
        if (!window.location.href.includes('sc_req_item')) return;

        const textarea = findCommentTextareaAnyContext();
        if (!textarea) return;

        const doc = textarea.ownerDocument;

        if (doc.getElementById('qiddiya-mention-btn')) return;

        const nameInput = findTargetInputAnyContext();
        const userName = nameInput ? (nameInput.value || '').trim() : '';

        const textareaParent = textarea.parentElement;
        if (!textareaParent) return;

        function triggerTextareaEvents() {
            ['input', 'change', 'keyup'].forEach(evtName => {
                textarea.dispatchEvent(new Event(evtName, { bubbles: true }));
            });

            try {
                const scope = angular.element(textarea).scope(); // eslint-disable-line no-undef
                if (scope) {
                    scope.$apply(() => { scope.inputTypeValue = textarea.value; });
                }
            } catch (e) { /* angular not accessible */ }
        }

        function insertText(text) {
            const current = textarea.value || '';
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;

            if (typeof start === 'number') {
                textarea.value = current.slice(0, start) + text + current.slice(end);
                textarea.selectionStart = textarea.selectionEnd = start + text.length;
            } else {
                textarea.value = current ? current + '\n' + text : text;
            }

            textarea.focus();
            triggerTextareaEvents();
        }

        // ── @ Mention button ──
        const btn = doc.createElement('button');
        btn.id = 'qiddiya-mention-btn';
        btn.type = 'button';
        btn.title = userName ? `Mention ${userName}` : 'Mention requested-for user';
        btn.textContent = userName ? `@ ${userName}` : '@';

        Object.assign(btn.style, {
            marginTop: '6px',
            padding: '3px 10px',
            fontSize: '11px',
            cursor: 'pointer',
            border: '1px solid transparent',
            borderRadius: '4px',
            color: '#ffffff',
            background: '#1F6FEB',
            lineHeight: '1.4',
            display: 'inline-block'
        });

        btn.addEventListener('mouseenter', () => { btn.style.background = '#1A5FD1'; });
        btn.addEventListener('mouseleave', () => { btn.style.background = '#1F6FEB'; });

        btn.addEventListener('click', () => {
            const currentNameInput = findTargetInputAnyContext();
            const currentName = currentNameInput ? (currentNameInput.value || '').trim() : '';

            if (!currentName) {
                alert('User name is empty — please open a request with a "Requested for" field first.');
                return;
            }

            insertText(`@[${currentName}] `);
        });

        // ── HoD button ──
        const hodBtn = doc.createElement('button');
        hodBtn.id = 'qiddiya-hod-approval-btn';
        hodBtn.type = 'button';
        hodBtn.title = 'Insert HoD approval reply';
        hodBtn.textContent = 'HoD';

        Object.assign(hodBtn.style, {
            marginTop: '6px',
            marginLeft: '6px',
            padding: '3px 10px',
            fontSize: '11px',
            cursor: 'pointer',
            border: '1px solid transparent',
            borderRadius: '4px',
            color: '#ffffff',
            background: '#D97706',
            lineHeight: '1.4',
            display: 'inline-block'
        });

        hodBtn.addEventListener('mouseenter', () => { hodBtn.style.background = '#B45309'; });
        hodBtn.addEventListener('mouseleave', () => { hodBtn.style.background = '#D97706'; });

        hodBtn.addEventListener('click', () => {
            const currentNameInput = findTargetInputAnyContext();
            const currentName = currentNameInput ? (currentNameInput.value || '').trim() : '';

            if (!currentName) {
                alert('User name is empty — please open a request with a "Requested for" field first.');
                return;
            }

            const quickReply = `@[${currentName}]\n\nPlease provide HoD email approval to proceed with your request.`;
            insertText(quickReply);
        });

        // ── BJ (Business Justification) button ──
        const bjBtn = doc.createElement('button');
        bjBtn.id = 'qiddiya-bj-btn';
        bjBtn.type = 'button';
        bjBtn.title = 'Insert Business Justification request reply';
        bjBtn.textContent = 'BJ';

        Object.assign(bjBtn.style, {
            marginTop: '6px',
            marginLeft: '6px',
            padding: '3px 10px',
            fontSize: '11px',
            cursor: 'pointer',
            border: '1px solid transparent',
            borderRadius: '4px',
            color: '#ffffff',
            background: '#DC2626',
            lineHeight: '1.4',
            display: 'inline-block'
        });

        bjBtn.addEventListener('mouseenter', () => { bjBtn.style.background = '#B91C1C'; });
        bjBtn.addEventListener('mouseleave', () => { bjBtn.style.background = '#DC2626'; });

        bjBtn.addEventListener('click', () => {
            const currentNameInput = findTargetInputAnyContext();
            const currentName = currentNameInput ? (currentNameInput.value || '').trim() : '';

            const bjReply = currentName
                ? `@[${currentName}]\n\nUser did not provide a proper business justification. Please provide valid justification on why the license is needed.`
                : `User did not provide a proper business justification. Please provide valid justification on why the license is needed.`;

            insertText(bjReply);
        });

        // ── App Install (IT Issue) button ──
        const appBtn = doc.createElement('button');
        appBtn.id = 'qiddiya-app-install-btn';
        appBtn.type = 'button';
        appBtn.title = 'Insert IT issue request for application installation';
        appBtn.textContent = 'App';

        Object.assign(appBtn.style, {
            marginTop: '6px',
            marginLeft: '6px',
            padding: '3px 10px',
            fontSize: '11px',
            cursor: 'pointer',
            border: '1px solid transparent',
            borderRadius: '4px',
            color: '#ffffff',
            background: '#059669',
            lineHeight: '1.4',
            display: 'inline-block'
        });

        appBtn.addEventListener('mouseenter', () => { appBtn.style.background = '#047857'; });
        appBtn.addEventListener('mouseleave', () => { appBtn.style.background = '#059669'; });

        appBtn.addEventListener('click', () => {
            const currentNameInput = findTargetInputAnyContext();
            const currentName = currentNameInput ? (currentNameInput.value || '').trim() : '';

            if (!currentName) {
                alert('User name is empty — please open a request with a "Requested for" field first.');
                return;
            }

            const quickReply = `@[${currentName}]\n\nPlease raise an IT issue for the helpdesk team to help you install the right application: https://support.qiddiya.com/esc?id=sc_cat_item&sys_id=6b598d618382c210e88141747daad326`;
            insertText(quickReply);
        });

        textareaParent.insertAdjacentElement('afterend', btn);
        btn.insertAdjacentElement('afterend', hodBtn);
        hodBtn.insertAdjacentElement('afterend', bjBtn);
        bjBtn.insertAdjacentElement('afterend', appBtn);
    }

    // ─── Context searchers ────────────────────────────────────────────────────
    function searchInAllContexts(finder) {
        let el = finder(document);
        if (el) return el;

        const iframes = document.querySelectorAll('iframe');
        for (const frame of iframes) {
            try {
                const frameDoc = frame.contentDocument || frame.contentWindow?.document;
                if (!frameDoc) continue;
                el = finder(frameDoc);
                if (el) return el;
            } catch (e) { continue; }
        }
        return null;
    }

    function findTargetInputAnyContext() {
        return searchInAllContexts(doc =>
            findRequestedForInput(doc) ||
            findProfileNameInput(doc) ||
            findAssetAssignedToInput(doc)
        );
    }

    function findSerialInputAnyContext() {
        return searchInAllContexts(findSerialNumberInput);
    }

    function findAccessoryNameInputAnyContext() {
        return searchInAllContexts(findAccessoryNameInput);
    }

    function findCatalogItemInputAnyContext() {
        return searchInAllContexts(findCatalogItemInput);
    }

    // ─── Open helpers ─────────────────────────────────────────────────────────
    function openRequestsForUser(name) {
        const n = (name || '').trim();
        if (!n) { alert('User name is empty.'); return; }
        window.open(
            'https://support.qiddiya.com/now/nav/ui/classic/params/target/' +
            encodeURIComponent(
                'sc_req_item_list.do?sysparm_query=' +
                encodeURIComponent('requested_for.nameSTARTSWITH' + n) +
                '&sysparm_first_row=1&sysparm_view=sow&sysparm_choice_query_raw=&sysparm_list_header_search=true'
            ),
            '_blank'
        );
    }

    function openAssetsForUser(name) {
        const n = (name || '').trim();
        if (!n) { alert('User name is empty.'); return; }
        window.open(
            'https://support.qiddiya.com/now/nav/ui/classic/params/target/' +
            encodeURIComponent(
                'alm_hardware_list.do?sysparm_query=' +
                encodeURIComponent('assigned_to.nameSTARTSWITH' + n) +
                '&sysparm_first_row=1&sysparm_view=&sysparm_choice_query_raw=&sysparm_list_header_search=true'
            ),
            '_blank'
        );
    }

    function openAccessoriesForUser(name) {
        const n = (name || '').trim();
        if (!n) { alert('User name is empty.'); return; }
        window.open(
            'https://support.qiddiya.com/now/nav/ui/classic/params/target/' +
            encodeURIComponent(
                'cmdb_ci_acc_list.do?sysparm_query=' +
                encodeURIComponent('assigned_to.nameSTARTSWITH' + n) +
                '&sysparm_first_row=1&sysparm_view=&sysparm_choice_query_raw=&sysparm_list_header_search=true'
            ),
            '_blank'
        );
    }


    function openRequestsByItem(itemName) {
        const n = (itemName || '').trim();

        if (!n) {
            alert('Item name is empty.');
            return;
        }

        window.open(
            'https://support.qiddiya.com/now/nav/ui/classic/params/target/' +
            encodeURIComponent(
                'sc_req_item_list.do?sysparm_query=' +
                encodeURIComponent('cat_item.name=' + n) +
                '&sysparm_first_row=1' +
                '&sysparm_list_header_search=true'
            ),
            '_blank'
        );
    }

    // ─── Warranty (via Daghriry API) ───────────────────────────────────────────
    function lookupWarrantyViaApi(serial) {
        return new Promise((resolve, reject) => {
            const s = (serial || '').trim();
            if (!s) {
                reject(new Error('Serial number is empty'));
                return;
            }
            GM_xmlhttpRequest({
                method: 'POST',
                url: DAGHRIRY_API_BASE + '/api/lenovo/lookup',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                data: JSON.stringify({ serial: s }),
                onload(response) {
                    try {
                        const data = JSON.parse(response.responseText || '{}');
                        if (response.status < 200 || response.status >= 300) {
                            reject(new Error(data.error || ('API returned status ' + response.status)));
                            return;
                        }
                        resolve(data);
                    } catch (err) {
                        reject(err);
                    }
                },
                onerror() { reject(new Error('Network error while calling warranty API')); },
                ontimeout() { reject(new Error('Warranty API request timed out')); }
            });
        });
    }

    function formatExpiryDate(isoOrFormatted) {
        if (!isoOrFormatted) return '';
        const part = String(isoOrFormatted).split(' ')[0];
        return part || '';
    }

    // Parse YYYY-MM-DD (or ISO) as local date at midnight; returns null if invalid
    function parseExpiryDate(isoOrFormatted) {
        const part = formatExpiryDate(isoOrFormatted);
        if (!part) return null;
        const m = part.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (!m) return null;
        const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
        return Number.isNaN(d.getTime()) ? null : d;
    }

    // Whole days from today (local) to expiry date; expiry day itself counts as still covered
    function daysUntilExpiry(expiryDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const end = new Date(expiryDate);
        end.setHours(0, 0, 0, 0);
        return Math.round((end - today) / 86400000);
    }

    function formatDurationPhrase(days) {
        const n = Math.abs(days);
        if (n === 0) return 'today';
        if (n === 1) return '1 day';
        if (n < 60) return n + ' days';
        const months = Math.round(n / 30);
        if (months < 24) return months + (months === 1 ? ' month' : ' months');
        const years = Math.round(n / 365);
        return years + (years === 1 ? ' year' : ' years');
    }

    function buildWarrantyDisplayText(data) {
        const expiry = formatExpiryDate(data.warranty_expiration);
        const expiryDate = parseExpiryDate(data.warranty_expiration);

        // Prefer client-side date check so stale/wrong API warranty_state cannot mislead
        let days = null;
        if (expiryDate) {
            days = daysUntilExpiry(expiryDate);
        } else if (typeof data.days_remaining === 'number') {
            days = data.days_remaining;
        }

        let state = data.warranty_state;
        if (days !== null) {
            state = days >= 0 ? 'in_warranty' : 'out_of_warranty';
        }

        if (state === 'in_warranty') {
            let line = 'Still under warranty';
            if (days !== null && days > 0) {
                line += ' · Expires in ' + formatDurationPhrase(days);
                if (expiry) line += ' (' + expiry + ')';
            } else if (days === 0) {
                line += ' · Expires today';
                if (expiry) line += ' (' + expiry + ')';
            } else if (expiry) {
                line += ' · Expires on ' + expiry;
            }
            return { text: line, color: '#3fb950', state: 'in' };
        }

        if (state === 'out_of_warranty') {
            let line = 'Warranty expired';
            if (days !== null && days < 0) {
                line += ' · Expired ' + formatDurationPhrase(days) + ' ago';
                if (expiry) line += ' (' + expiry + ')';
            } else if (expiry) {
                line += ' · Ended ' + expiry;
            }
            return { text: line, color: '#f85149', state: 'out' };
        }

        return {
            text: data.comments || data.warranty_status || 'Warranty status unknown',
            color: '#d29922',
            state: 'unknown'
        };
    }

    function openLenovoWarrantyPage(productPath) {
        const path = (productPath || '').trim().toLowerCase();
        if (!path) {
            alert('Lenovo product path is not available for this serial.');
            return;
        }
        window.open('https://pcsupport.lenovo.com/sa/en/products/' + path + '/warranty', '_blank');
    }

    // ─── Accessory Name Dropdown ───────────────────────────────────────────────
    function injectAccessoryNameDropdown(nameInput) {
        const doc = nameInput.ownerDocument;
        if (doc.getElementById('qiddiya-acc-name-dropdown-btn')) return;

        // Wrapper to anchor the dropdown menu
        const wrapper = doc.createElement('span');
        wrapper.style.position = 'relative';
        wrapper.style.display = 'inline-block';
        wrapper.style.marginLeft = '8px';

        // Trigger button
        const btn = doc.createElement('button');
        btn.id = 'qiddiya-acc-name-dropdown-btn';
        btn.type = 'button';
        btn.textContent = '▾ Quick select';
        btn.style.padding = '3px 10px';
        btn.style.fontSize = '11px';
        btn.style.cursor = 'pointer';
        btn.style.border = '1px solid transparent';
        btn.style.borderRadius = '4px';
        btn.style.color = '#ffffff';
        btn.style.background = '#7C3AED';
        btn.style.lineHeight = '1.4';
        btn.addEventListener('mouseenter', () => { btn.style.background = '#6D28D9'; });
        btn.addEventListener('mouseleave', () => { btn.style.background = '#7C3AED'; });

        // Dropdown menu
        const menu = doc.createElement('div');
        menu.id = 'qiddiya-acc-name-menu';
        Object.assign(menu.style, {
            display: 'none',
            position: 'absolute',
            top: '100%',
            left: '0',
            zIndex: '99999',
            background: '#ffffff',
            border: '1px solid #ccc',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            minWidth: '240px',
            marginTop: '2px',
            overflow: 'hidden'
        });

        ACCESSORY_NAMES.forEach(name => {
            const item = doc.createElement('div');
            item.textContent = name;
            Object.assign(item.style, {
                padding: '8px 14px',
                fontSize: '12px',
                cursor: 'pointer',
                color: '#333333',
                whiteSpace: 'nowrap'
            });
            item.addEventListener('mouseenter', () => { item.style.background = '#f0f0f0'; });
            item.addEventListener('mouseleave', () => { item.style.background = ''; });
            item.addEventListener('click', () => {
                nameInput.value = name;
                // Trigger ServiceNow change events so the form registers the value
                ['input', 'change'].forEach(evtName => {
                    nameInput.dispatchEvent(new Event(evtName, { bubbles: true }));
                });
                menu.style.display = 'none';
            });
            menu.appendChild(item);
        });

        // Toggle menu on button click
        btn.addEventListener('click', e => {
            e.stopPropagation();
            menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
        });

        // Close menu when clicking outside
        doc.addEventListener('click', () => { menu.style.display = 'none'; }, true);

        wrapper.appendChild(btn);
        wrapper.appendChild(menu);

        // Insert after the name input
        if (nameInput.parentElement) {
            nameInput.parentElement.appendChild(wrapper);
        } else {
            nameInput.insertAdjacentElement('afterend', wrapper);
        }
    }

    // ─── Main injection ────────────────────────────────────────────────────────
    function tryAddButtons() {
		// Catalog Item button

        const itemInput = findCatalogItemInputAnyContext();

        if (
            itemInput &&
            !itemInput.ownerDocument.getElementById('qiddiya-item-requests-btn')
        ) {
            const doc = itemInput.ownerDocument;

            const btnItem = doc.createElement('button');

            btnItem.id = 'qiddiya-item-requests-btn';
            btnItem.type = 'button';
            btnItem.textContent = 'View Item Requests';
            btnItem.title = 'Open all requests of this catalog item';

            styleButton(btnItem, '#0EA5E9', '#0284C7');

            btnItem.addEventListener('click', () => {
                openRequestsByItem(itemInput.value);
            });

            if (itemInput.parentElement) {
                itemInput.parentElement.appendChild(btnItem);
            } else {
                itemInput.insertAdjacentElement('afterend', btnItem);
            }
        }

        // User action buttons (Requests / Assets / Accessories)
        const targetInput = findTargetInputAnyContext();
        if (targetInput) {
            const doc = targetInput.ownerDocument;
            if (!doc.getElementById('qiddiya-user-requests-btn')) {
                const btnReq = doc.createElement('button');
                btnReq.id = 'qiddiya-user-requests-btn';
                btnReq.type = 'button';
                btnReq.textContent = 'View user requests';
                btnReq.title = 'Open all requests for this user';
                styleButton(btnReq, '#1F6FEB', '#1A5FD1');

                const btnAssets = doc.createElement('button');
                btnAssets.id = 'qiddiya-user-assets-btn';
                btnAssets.type = 'button';
                btnAssets.textContent = 'View user assets';
                btnAssets.title = 'Open all assets assigned to this user';
                styleButton(btnAssets, '#1F9D55', '#168243');

                const btnAcc = doc.createElement('button');
                btnAcc.id = 'qiddiya-user-accessories-btn';
                btnAcc.type = 'button';
                btnAcc.textContent = 'View user accessories';
                btnAcc.title = 'Open all accessories assigned to this user';
                styleButton(btnAcc, '#7C3AED', '#6D28D9');

                const getName = () => (targetInput.value || '').trim();
                btnReq.addEventListener('click', () => openRequestsForUser(getName()));
                btnAssets.addEventListener('click', () => openAssetsForUser(getName()));
                btnAcc.addEventListener('click', () => openAccessoriesForUser(getName()));

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
        }

        // Warranty button + Auto Long Serial display
        const serialInput = findSerialInputAnyContext();
        if (serialInput && !serialInput.ownerDocument.getElementById('qiddiya-warranty-btn')) {
            const serialDoc = serialInput.ownerDocument;

            // ── Verify & Open in Lenovo button ──
            const btnWarranty = serialDoc.createElement('button');
            btnWarranty.id = 'qiddiya-warranty-btn';
            btnWarranty.type = 'button';
            btnWarranty.textContent = 'Verify & Open in Lenovo';
            btnWarranty.title = 'Check warranty via Daghriry API and open Lenovo warranty page';
            styleButton(btnWarranty, '#F59E0B', '#D97706');

            // ── Info panel (long serial + warranty status) ──
            const infoWrap = serialDoc.createElement('div');
            infoWrap.id = 'qiddiya-serial-info-wrap';
            Object.assign(infoWrap.style, {
                display: 'none',
                marginTop: '6px',
                padding: '8px 10px',
                background: '#1e1e2e',
                border: '1px solid #444',
                borderRadius: '6px',
                fontSize: '12px',
                color: '#c9d1d9',
                flexDirection: 'column',
                gap: '6px'
            });

            const longSerialRow = serialDoc.createElement('div');
            Object.assign(longSerialRow.style, {
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
                fontFamily: 'monospace'
            });

            const longSerialLabel = serialDoc.createElement('span');
            longSerialLabel.textContent = 'Long Serial:';
            longSerialLabel.style.color = '#8b949e';

            const longSerialValue = serialDoc.createElement('span');
            longSerialValue.id = 'qiddiya-long-serial-value';
            longSerialValue.style.color = '#79c0ff';
            longSerialValue.style.fontWeight = 'bold';
            longSerialValue.style.letterSpacing = '0.5px';

            const copyBtn = serialDoc.createElement('button');
            copyBtn.type = 'button';
            copyBtn.textContent = 'Copy';
            Object.assign(copyBtn.style, {
                padding: '2px 8px',
                fontSize: '11px',
                cursor: 'pointer',
                border: '1px solid #555',
                borderRadius: '4px',
                background: '#30363d',
                color: '#c9d1d9',
                lineHeight: '1.4',
                display: 'none'
            });

            const copyLongSerial = (val) => {
                if (!val) return;
                const onDone = () => {
                    copyBtn.textContent = 'Copied!';
                    copyBtn.style.color = '#3fb950';
                    setTimeout(() => {
                        copyBtn.textContent = 'Copy';
                        copyBtn.style.color = '#c9d1d9';
                    }, 2000);
                };
                navigator.clipboard.writeText(val).then(onDone).catch(() => {
                    const ta = serialDoc.createElement('textarea');
                    ta.value = val;
                    ta.style.position = 'fixed';
                    ta.style.left = '-9999px';
                    serialDoc.body.appendChild(ta);
                    ta.select();
                    serialDoc.execCommand('copy');
                    serialDoc.body.removeChild(ta);
                    onDone();
                });
            };
            copyBtn.addEventListener('click', () => copyLongSerial(longSerialValue.textContent));

            const loadingSpan = serialDoc.createElement('span');
            loadingSpan.id = 'qiddiya-serial-info-loading';
            loadingSpan.textContent = 'Loading warranty info...';
            loadingSpan.style.color = '#8b949e';
            loadingSpan.style.display = 'none';

            longSerialRow.appendChild(longSerialLabel);
            longSerialRow.appendChild(longSerialValue);
            longSerialRow.appendChild(copyBtn);
            longSerialRow.appendChild(loadingSpan);

            const warrantyStatusEl = serialDoc.createElement('div');
            warrantyStatusEl.id = 'qiddiya-warranty-status';
            Object.assign(warrantyStatusEl.style, {
                fontSize: '12px',
                fontWeight: '600',
                lineHeight: '1.5',
                display: 'none'
            });

            infoWrap.appendChild(longSerialRow);
            infoWrap.appendChild(warrantyStatusEl);

            let fetchDebounce = null;
            let lastFetchedSerial = '';
            let lastLookupData = null;

            function showWarrantyStatus(display) {
                warrantyStatusEl.style.display = 'block';
                warrantyStatusEl.textContent = display.text;
                warrantyStatusEl.style.color = display.color;
            }

            function hideWarrantyStatus() {
                warrantyStatusEl.style.display = 'none';
                warrantyStatusEl.textContent = '';
            }

            async function fetchAndShowSerialInfo() {
                const s = (serialInput.value || '').trim();
                if (!s) {
                    infoWrap.style.display = 'none';
                    lastFetchedSerial = '';
                    lastLookupData = null;
                    return;
                }
                if (s === lastFetchedSerial) return;
                lastFetchedSerial = s;
                lastLookupData = null;

                infoWrap.style.display = 'flex';
                longSerialValue.textContent = '';
                longSerialValue.style.color = '#79c0ff';
                copyBtn.style.display = 'none';
                hideWarrantyStatus();
                loadingSpan.style.display = 'inline';

                try {
                    const data = await lookupWarrantyViaApi(s);
                    lastLookupData = data;
                    loadingSpan.style.display = 'none';

                    if (data.long_serial) {
                        longSerialValue.textContent = data.long_serial;
                        copyBtn.style.display = 'inline-block';
                    } else if (data.status === 'not_found') {
                        longSerialValue.textContent = 'Serial not found';
                        longSerialValue.style.color = '#f85149';
                    } else {
                        longSerialValue.textContent = 'Long serial unavailable';
                        longSerialValue.style.color = '#8b949e';
                    }

                    if (data.status === 'found' || data.warranty_state !== 'unknown') {
                        showWarrantyStatus(buildWarrantyDisplayText(data));
                    } else if (data.status === 'not_found') {
                        showWarrantyStatus({ text: 'Serial not found in Lenovo catalog', color: '#f85149', state: 'unknown' });
                    } else {
                        showWarrantyStatus(buildWarrantyDisplayText(data));
                    }
                } catch (err) {
                    loadingSpan.style.display = 'none';
                    longSerialValue.textContent = 'Lookup failed';
                    longSerialValue.style.color = '#f85149';
                    showWarrantyStatus({ text: 'Error: ' + err.message, color: '#f85149', state: 'unknown' });
                    copyBtn.style.display = 'none';
                }
            }

            serialInput.addEventListener('change', () => {
                clearTimeout(fetchDebounce);
                fetchDebounce = setTimeout(fetchAndShowSerialInfo, 600);
            });
            serialInput.addEventListener('input', () => {
                clearTimeout(fetchDebounce);
                fetchDebounce = setTimeout(fetchAndShowSerialInfo, 800);
            });

            btnWarranty.addEventListener('click', async () => {
                const s = (serialInput.value || '').trim();
                if (!s) {
                    alert('Serial number is empty');
                    return;
                }
                if (lastLookupData && lastLookupData.product_path && lastFetchedSerial === s) {
                    openLenovoWarrantyPage(lastLookupData.product_path);
                    return;
                }
                btnWarranty.disabled = true;
                try {
                    const data = await lookupWarrantyViaApi(s);
                    lastLookupData = data;
                    lastFetchedSerial = s;
                    if (data.product_path) {
                        openLenovoWarrantyPage(data.product_path);
                    } else {
                        alert('Lenovo product path is not available for this serial.');
                    }
                } catch (err) {
                    alert('Warranty lookup failed: ' + err.message);
                } finally {
                    btnWarranty.disabled = false;
                }
            });

            if (serialInput.parentElement) {
                serialInput.parentElement.appendChild(btnWarranty);
                serialInput.parentElement.insertAdjacentElement('afterend', infoWrap);
            } else {
                serialInput.insertAdjacentElement('afterend', btnWarranty);
                btnWarranty.insertAdjacentElement('afterend', infoWrap);
            }

            if ((serialInput.value || '').trim()) {
                setTimeout(fetchAndShowSerialInfo, 1000);
            }
        }

        // Accessory Name dropdown
        const accNameInput = findAccessoryNameInputAnyContext();
        if (accNameInput) {
            injectAccessoryNameDropdown(accNameInput);
        }

        // @ Mention button near comment textarea
        injectMentionButton();
    }

    function init() {
        tryAddButtons();
        const observer = new MutationObserver(() => { tryAddButtons(); });
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
