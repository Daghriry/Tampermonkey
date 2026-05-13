// ==UserScript==
// @name         Qiddiya - User Requests & Assets & Accessories Buttons + Warranty
// @namespace    http://tampermonkey.net/
// @version      2.5
// @description  Add "Requests", "Assets", "Accessories" buttons for the shown user, a working Lenovo "Check Warranty" button, and a Name dropdown on the accessories form
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
// ==/UserScript==

(function () {
    'use strict';

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

    // ─── Warranty ─────────────────────────────────────────────────────────────
    function getLenovoProductPath(serial) {
        return new Promise((resolve, reject) => {
            const s = (serial || '').trim();
            if (!s) { reject(new Error('Serial Number is empty')); return; }
            GM_xmlhttpRequest({
                method: 'GET',
                url: 'https://pcsupport.lenovo.com/us/en/api/v4/mse/getproducts?productId=' + encodeURIComponent(s),
                headers: { 'Accept': 'application/json' },
                onload(response) {
                    try {
                        if (response.status < 200 || response.status >= 300) {
                            reject(new Error('Lenovo API returned status ' + response.status)); return;
                        }
                        const data = JSON.parse(response.responseText);
                        if (!Array.isArray(data) || !data.length || !data[0].Id) {
                            reject(new Error('Warranty product path was not found.')); return;
                        }
                        resolve(String(data[0].Id).toLowerCase());
                    } catch (err) { reject(err); }
                },
                onerror()  { reject(new Error('Network error while calling Lenovo API')); },
                ontimeout() { reject(new Error('Lenovo API request timed out')); }
            });
        });
    }

    async function openWarranty(serial) {
        const s = (serial || '').trim();
        if (!s) { alert('Serial Number is empty'); return; }
        try {
            const path = await getLenovoProductPath(s);
            window.open('https://pcsupport.lenovo.com/us/en/products/' + path + '/warranty', '_blank');
        } catch (err) {
            console.error('Warranty lookup failed:', err);
            alert('Failed to retrieve the warranty link from Lenovo.');
        }
    }

    // ─── Long Serial Calculator ────────────────────────────────────────────────
    // Uses the same Lenovo API call we already make for warranty.
    // Response shape: [{ Id: "21lt/thinkpad-t14s-gen-5/21lts5mp00/mp8m1234" }]
    // Path parts (split by "/"): [0]=category, [1]=family, [2]=MTM, [3]=serial  ← 4 parts
    // OR the product page URL shape after redirect:
    //   /us/en/products/21lt/thinkpad-t14s-gen-5/21lts5mp00/mp8m1234/...
    // We rebuild: 1S + MTM + shortSerial
    function computeLongSerial(shortSerial, productPath) {
        // productPath example: "20ld/thinkpad-x1-yoga-3rd-gen-type-20ld-20le-20lf-20lg/20les41r00/r90trt7a"
        // parts[0]              = machineType  e.g. "20ld"
        // parts[1]              = family name  e.g. "thinkpad-x1-yoga-..."  ← skip this
        // parts[parts.length-2] = MTM          e.g. "20les41r00"            ← we want this
        // parts[parts.length-1] = serial       e.g. "r90trt7a"
        try {
            const parts = productPath.split('/').filter(Boolean);
            if (parts.length < 3) return null;
            const mtm    = parts[parts.length - 2].toUpperCase();   // second-to-last = MTM
            const serial = shortSerial.toUpperCase().trim();
            return '1S' + mtm + serial;
        } catch (e) {
            return null;
        }
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

            // ── Warranty button ──
            const btnWarranty = serialDoc.createElement('button');
            btnWarranty.id = 'qiddiya-warranty-btn';
            btnWarranty.type = 'button';
            btnWarranty.textContent = 'Check Warranty';
            btnWarranty.title = 'Check Lenovo Warranty';
            styleButton(btnWarranty, '#F59E0B', '#D97706');

            // ── Long Serial container ──
            const longSerialWrap = serialDoc.createElement('div');
            longSerialWrap.id = 'qiddiya-long-serial-wrap';
            Object.assign(longSerialWrap.style, {
                display: 'none',
                marginTop: '6px',
                padding: '5px 10px',
                background: '#1e1e2e',
                border: '1px solid #444',
                borderRadius: '6px',
                fontFamily: 'monospace',
                fontSize: '12px',
                color: '#c9d1d9',
                alignItems: 'center',
                gap: '8px',
                flexWrap: 'wrap'
            });

            const longSerialLabel = serialDoc.createElement('span');
            longSerialLabel.textContent = 'Long Serial:';
            longSerialLabel.style.color = '#8b949e';
            longSerialLabel.style.marginRight = '4px';

            const longSerialValue = serialDoc.createElement('span');
            longSerialValue.id = 'qiddiya-long-serial-value';
            longSerialValue.style.color = '#79c0ff';
            longSerialValue.style.fontWeight = 'bold';
            longSerialValue.style.letterSpacing = '0.5px';

            const copyBtn = serialDoc.createElement('button');
            copyBtn.type = 'button';
            copyBtn.textContent = '📋 Copy';
            Object.assign(copyBtn.style, {
                marginLeft: '10px',
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
            copyBtn.addEventListener('click', () => {
                const val = longSerialValue.textContent;
                if (!val) return;
                navigator.clipboard.writeText(val).then(() => {
                    copyBtn.textContent = '✅ Copied!';
                    copyBtn.style.color = '#3fb950';
                    setTimeout(() => { copyBtn.textContent = '📋 Copy'; copyBtn.style.color = '#c9d1d9'; }, 2000);
                }).catch(() => {
                    const ta = serialDoc.createElement('textarea');
                    ta.value = val;
                    ta.style.position = 'fixed';
                    ta.style.left = '-9999px';
                    serialDoc.body.appendChild(ta);
                    ta.select();
                    serialDoc.execCommand('copy');
                    serialDoc.body.removeChild(ta);
                    copyBtn.textContent = '✅ Copied!';
                    setTimeout(() => { copyBtn.textContent = '📋 Copy'; }, 2000);
                });
            });

            const loadingSpan = serialDoc.createElement('span');
            loadingSpan.id = 'qiddiya-long-serial-loading';
            loadingSpan.textContent = '⏳ جاري الجلب...';
            loadingSpan.style.color = '#8b949e';
            loadingSpan.style.display = 'none';

            longSerialWrap.appendChild(longSerialLabel);
            longSerialWrap.appendChild(longSerialValue);
            longSerialWrap.appendChild(copyBtn);
            longSerialWrap.appendChild(loadingSpan);

            // ── Core fetch + display logic (auto, no click needed) ──
            let fetchDebounce = null;
            let lastFetchedSerial = '';

            async function fetchAndShowLongSerial() {
                const s = (serialInput.value || '').trim();
                if (!s || s === lastFetchedSerial) return;
                lastFetchedSerial = s;

                // Show loading state
                longSerialWrap.style.display = 'flex';
                longSerialValue.textContent = '';
                longSerialValue.style.color = '#79c0ff';
                copyBtn.style.display = 'none';
                loadingSpan.style.display = 'inline';

                try {
                    const productPath = await getLenovoProductPath(s);
                    const longSerial = computeLongSerial(s, productPath);
                    loadingSpan.style.display = 'none';
                    if (longSerial) {
                        longSerialValue.textContent = longSerial;
                        copyBtn.style.display = 'inline-block';
                    } else {
                        longSerialValue.textContent = 'تعذّر حساب الـ Long Serial';
                        longSerialValue.style.color = '#f85149';
                    }
                } catch (err) {
                    loadingSpan.style.display = 'none';
                    longSerialValue.textContent = 'خطأ: ' + err.message;
                    longSerialValue.style.color = '#f85149';
                    copyBtn.style.display = 'none';
                }
            }

            // Auto-trigger when serial field changes (user types or page fills it)
            serialInput.addEventListener('change', () => {
                clearTimeout(fetchDebounce);
                fetchDebounce = setTimeout(fetchAndShowLongSerial, 600);
            });
            serialInput.addEventListener('input', () => {
                clearTimeout(fetchDebounce);
                fetchDebounce = setTimeout(fetchAndShowLongSerial, 800);
            });

            // ── Warranty button still opens the page ──
            btnWarranty.addEventListener('click', async () => {
                const s = (serialInput.value || '').trim();
                if (!s) { alert('Serial Number is empty'); return; }
                try {
                    const productPath = await getLenovoProductPath(s);
                    window.open('https://pcsupport.lenovo.com/us/en/products/' + productPath + '/warranty', '_blank');
                } catch (err) {
                    alert('Failed to retrieve the warranty link from Lenovo.');
                }
            });

            // ── Insert into page ──
            if (serialInput.parentElement) {
                serialInput.parentElement.appendChild(btnWarranty);
                serialInput.parentElement.insertAdjacentElement('afterend', longSerialWrap);
            } else {
                serialInput.insertAdjacentElement('afterend', btnWarranty);
                btnWarranty.insertAdjacentElement('afterend', longSerialWrap);
            }

            // ── Auto-run on page load if serial already filled ──
            if ((serialInput.value || '').trim()) {
                setTimeout(fetchAndShowLongSerial, 1000);
            }
        }

        // Accessory Name dropdown
        const accNameInput = findAccessoryNameInputAnyContext();
        if (accNameInput) {
            injectAccessoryNameDropdown(accNameInput);
        }
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
