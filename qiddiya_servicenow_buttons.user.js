// ==UserScript==
// @name         Qiddiya - User Requests & Assets & Accessories Buttons + Warranty
// @namespace    http://tampermonkey.net/
// @version      1.9
// @description  Add "Requests", "Assets", "Accessories" buttons for the shown user and a working Lenovo "Check Warranty" button
// @author       You
// @match        https://support.qiddiya.com/sc_task.do*
// @match        https://support.qiddiya.com/sc_req_item.do*
// @match        https://support.qiddiya.com/sys_user.do*
// @match        https://support.qiddiya.com/alm_hardware.do*
// @match        https://support.qiddiya.com/now/nav/ui/classic/params/target/sc_req_item.do*
// @match        https://support.qiddiya.com/now/nav/ui/classic/params/target/sys_user.do*
// @match        https://support.qiddiya.com/now/nav/ui/classic/params/target/alm_hardware.do*
// @grant        GM_xmlhttpRequest
// @connect      pcsupport.lenovo.com
// ==/UserScript==

(function () {
    'use strict';

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

        btn.addEventListener('mouseenter', () => {
            btn.style.background = hoverColor;
        });

        btn.addEventListener('mouseleave', () => {
            btn.style.background = bgColor;
        });
    }

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

    function findTargetInputAnyContext() {
        let el =
            findRequestedForInput(document) ||
            findProfileNameInput(document) ||
            findAssetAssignedToInput(document);

        if (el) return el;

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

    function findSerialInputAnyContext() {
        let el = findSerialNumberInput(document);
        if (el) return el;

        const iframes = document.querySelectorAll('iframe');
        for (const frame of iframes) {
            try {
                const frameDoc = frame.contentDocument || frame.contentWindow?.document;
                if (!frameDoc) continue;

                el = findSerialNumberInput(frameDoc);
                if (el) return el;
            } catch (e) {
                continue;
            }
        }

        return null;
    }

    function openRequestsForUser(name) {
        const n = (name || '').trim();
        if (!n) {
            alert('User name is empty. Please select/ensure the user name is visible.');
            return;
        }

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
        if (!n) {
            alert('User name is empty. Please select/ensure the user name is visible.');
            return;
        }

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
        if (!n) {
            alert('User name is empty. Please select/ensure the user name is visible.');
            return;
        }

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

    function getLenovoProductPath(serial) {
        return new Promise((resolve, reject) => {
            const s = (serial || '').trim();
            if (!s) {
                reject(new Error('Serial Number is empty'));
                return;
            }

            const apiUrl =
                'https://pcsupport.lenovo.com/us/en/api/v4/mse/getproducts?productId=' +
                encodeURIComponent(s);

            GM_xmlhttpRequest({
                method: 'GET',
                url: apiUrl,
                headers: {
                    'Accept': 'application/json'
                },
                onload: function (response) {
                    try {
                        if (response.status < 200 || response.status >= 300) {
                            reject(new Error('Lenovo API returned status ' + response.status));
                            return;
                        }

                        const data = JSON.parse(response.responseText);

                        if (!Array.isArray(data) || !data.length || !data[0].Id) {
                            reject(new Error('Warranty product path was not found for this serial number.'));
                            return;
                        }

                        resolve(String(data[0].Id).toLowerCase());
                    } catch (err) {
                        reject(err);
                    }
                },
                onerror: function () {
                    reject(new Error('Network error while calling Lenovo API'));
                },
                ontimeout: function () {
                    reject(new Error('Lenovo API request timed out'));
                }
            });
        });
    }

    async function openWarranty(serial) {
        const s = (serial || '').trim();
        if (!s) {
            alert('Serial Number is empty');
            return;
        }

        try {
            const productPath = await getLenovoProductPath(s);

            const warrantyUrl =
                'https://pcsupport.lenovo.com/us/en/products/' +
                productPath +
                '/warranty';

            window.open(warrantyUrl, '_blank');
        } catch (error) {
            console.error('Warranty lookup failed:', error);
            alert('Failed to retrieve the warranty link from Lenovo.');
        }
    }

    function tryAddButtons() {
        const targetInput = findTargetInputAnyContext();
        if (!targetInput) return;

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

        const serialInput = findSerialInputAnyContext();
        if (serialInput && !serialInput.ownerDocument.getElementById('qiddiya-warranty-btn')) {
            const serialDoc = serialInput.ownerDocument;

            const btnWarranty = serialDoc.createElement('button');
            btnWarranty.id = 'qiddiya-warranty-btn';
            btnWarranty.type = 'button';
            btnWarranty.textContent = 'Check Warranty';
            btnWarranty.title = 'Check Lenovo Warranty';
            styleButton(btnWarranty, '#F59E0B', '#D97706');

            btnWarranty.addEventListener('click', async () => {
                await openWarranty(serialInput.value);
            });

            if (serialInput.parentElement) {
                serialInput.parentElement.appendChild(btnWarranty);
            } else {
                serialInput.insertAdjacentElement('afterend', btnWarranty);
            }
        }
    }

    function init() {
        tryAddButtons();

        const observer = new MutationObserver(() => {
            tryAddButtons();
        });

        if (document.body) {
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
