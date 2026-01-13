// ==UserScript==
// @name         Lenovo Long Serial Generator
// @namespace    http://tampermonkey.net/
// @version      2.0
// @description  Generate Lenovo logistics serial (1S+MTM+Serial) from URL
// @author       Daghriry
// @match        https://pcsupport.lenovo.com/*
// @grant        GM_setClipboard
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    let processed = false;

    // استخراج البيانات من الـ URL مباشرة
    function extractFromURL() {
        try {
            const url = window.location.pathname;

            // Pattern: /.../.../MACHINETYPE/MODEL/SERIAL/...
            // Example: /laptops-and-netbooks/.../21lt/21lts5mp00/gm0veb7c/warranty

            const parts = url.toLowerCase().split('/').filter(p => p);

            // ابحث عن السيريال (8 أحرف/أرقام في النهاية قبل warranty أو بعد model)
            let machineType = '';
            let model = '';
            let serial = '';

            // نبحث عن pattern معين
            for (let i = 0; i < parts.length - 1; i++) {
                const current = parts[i];
                const next = parts[i + 1];
                const afterNext = parts[i + 2];

                // Machine Type عادة 4 أحرف/أرقام
                // Model عادة يبدأ بنفس Machine Type
                // Serial عادة 8 أحرف

                if (current.length === 4 && /^[a-z0-9]{4}$/i.test(current)) {
                    if (next && next.startsWith(current) && next.length >= 8) {
                        if (afterNext && afterNext.length === 8 && /^[a-z0-9]{8}$/i.test(afterNext)) {
                            machineType = current.toUpperCase();
                            model = next.toUpperCase();
                            serial = afterNext.toUpperCase();
                            break;
                        }
                    }
                }
            }

            if (!machineType || !model || !serial) {
                return null;
            }

            const mtm = model.startsWith(machineType) ? model : (machineType + model);
            const longSerial = '1S' + mtm + serial;

            return {
                machineType,
                model,
                serial,
                mtm,
                longSerial
            };
        } catch (e) {
            console.error('[Lenovo Serial] URL Parse error:', e);
            return null;
        }
    }

    // استخراج من window.config (fallback)
    function extractFromConfig() {
        try {
            if (!window.config?.product?.ID) {
                return null;
            }

            const productId = window.config.product.ID;
            const parts = productId.split('/');

            if (parts.length < 6) {
                return null;
            }

            const machineType = parts[3];
            const model = parts[4];
            const serial = parts[5];

            if (!machineType || !model || !serial) {
                return null;
            }

            const mtm = model.startsWith(machineType) ? model : (machineType + model);
            const longSerial = '1S' + mtm + serial;

            return {
                machineType,
                model,
                serial,
                mtm,
                longSerial
            };
        } catch (e) {
            return null;
        }
    }

    function copyText(text) {
        if (typeof GM_setClipboard !== 'undefined') {
            try {
                GM_setClipboard(text);
                return true;
            } catch (e) {}
        }

        try {
            const temp = document.createElement('textarea');
            temp.value = text;
            temp.style.position = 'fixed';
            temp.style.left = '-9999px';
            document.body.appendChild(temp);
            temp.select();
            temp.setSelectionRange(0, text.length);
            const success = document.execCommand('copy');
            document.body.removeChild(temp);
            return success;
        } catch (e) {
            return false;
        }
    }

    function createWidget(data) {
        if (processed) return;
        processed = true;

        const style = document.createElement('style');
        style.textContent = `
            #ls-widget {
                position: fixed;
                top: 90px;
                right: 20px;
                background: #fff;
                border: 3px solid #e62129;
                border-radius: 10px;
                padding: 18px;
                box-shadow: 0 8px 24px rgba(0,0,0,0.2);
                z-index: 999999;
                font-family: Arial, sans-serif;
                min-width: 320px;
            }
            .ls-hdr {
                display: flex;
                justify-content: space-between;
                margin-bottom: 12px;
                padding-bottom: 10px;
                border-bottom: 2px solid #f0f0f0;
            }
            .ls-title {
                font-size: 15px;
                font-weight: 700;
                color: #e62129;
            }
            .ls-close {
                cursor: pointer;
                font-size: 20px;
                color: #999;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
            }
            .ls-close:hover {
                background: #f0f0f0;
                color: #e62129;
            }
            .ls-row {
                display: flex;
                margin-bottom: 8px;
                font-size: 13px;
            }
            .ls-lbl {
                font-weight: 600;
                color: #333;
                min-width: 90px;
            }
            .ls-val {
                color: #666;
                font-family: 'Courier New', monospace;
                word-break: break-all;
            }
            .ls-sep {
                height: 1px;
                background: #e0e0e0;
                margin: 12px 0;
            }
            .ls-input {
                width: 100%;
                padding: 10px;
                border: 2px solid #ddd;
                border-radius: 6px;
                font-family: 'Courier New', monospace;
                font-size: 13px;
                font-weight: 600;
                background: #f8f8f8;
                margin-bottom: 10px;
                box-sizing: border-box;
            }
            .ls-input:focus {
                outline: none;
                border-color: #e62129;
                background: #fff;
            }
            .ls-btn {
                width: 100%;
                padding: 12px;
                background: #e62129;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 700;
                font-size: 14px;
            }
            .ls-btn:hover {
                background: #c41e25;
            }
            .ls-btn.ok {
                background: #4caf50;
            }
        `;
        document.head.appendChild(style);

        const widget = document.createElement('div');
        widget.id = 'ls-widget';
        widget.innerHTML = `
            <div class="ls-hdr">
                <div class="ls-title">🔧 Lenovo Serial</div>
                <div class="ls-close">×</div>
            </div>
            <div class="ls-row">
                <div class="ls-lbl">Machine Type:</div>
                <div class="ls-val">${data.machineType}</div>
            </div>
            <div class="ls-row">
                <div class="ls-lbl">Model:</div>
                <div class="ls-val">${data.model}</div>
            </div>
            <div class="ls-row">
                <div class="ls-lbl">Serial:</div>
                <div class="ls-val">${data.serial}</div>
            </div>
            <div class="ls-row">
                <div class="ls-lbl">MTM:</div>
                <div class="ls-val">${data.mtm}</div>
            </div>
            <div class="ls-sep"></div>
            <input type="text" class="ls-input" value="${data.longSerial}" readonly>
            <button class="ls-btn">📋 Copy Long Serial</button>
        `;

        document.body.appendChild(widget);

        const closeBtn = widget.querySelector('.ls-close');
        const copyBtn = widget.querySelector('.ls-btn');
        const input = widget.querySelector('.ls-input');

        closeBtn.onclick = () => widget.remove();

        copyBtn.onclick = () => {
            const success = copyText(data.longSerial);
            if (success) {
                input.select();
                copyBtn.textContent = '✅ Copied!';
                copyBtn.classList.add('ok');
                setTimeout(() => {
                    copyBtn.textContent = '📋 Copy Long Serial';
                    copyBtn.classList.remove('ok');
                }, 2000);
            } else {
                alert('Copy failed. Please select and copy manually (Ctrl+C)');
            }
        };

        input.onclick = () => input.select();

        console.log('[Lenovo Serial] Widget created!');
        console.log('[Lenovo Serial] Long Serial:', data.longSerial);
    }

    function init() {
        if (processed) return;

        // جرب الـ URL أولاً
        let data = extractFromURL();

        // إذا ما نجح، جرب window.config
        if (!data) {
            data = extractFromConfig();
        }

        if (data) {
            console.log('[Lenovo Serial] Data found:', data);
            createWidget(data);
        } else {
            console.log('[Lenovo Serial] Could not extract data from URL or config');
        }
    }

    // جرب التشغيل بعد ثانيتين
    setTimeout(init, 2000);
})();
