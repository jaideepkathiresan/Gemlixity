(function () {
    // Initialize extension UI components
    const sidebarWrapper = document.createElement('div');
    sidebarWrapper.className = 'gemini-prompt-sidebar-wrapper';

    const sidebar = document.createElement('div');
    sidebar.id = 'gemini-prompt-sidebar';
    sidebar.innerHTML = `
        <h2>Prompt History</h2>
        <div id="gemini-prompt-list"></div>
    `;

    sidebarWrapper.appendChild(sidebar);

    document.body.appendChild(sidebarWrapper);

    const promptList = document.getElementById('gemini-prompt-list');

    // Manage conversational state
    const seenPrompts = new Set();
    let currentConversationId = getConversationId();
    let activeItem = null;

    function getConversationId() {
        return window.location.pathname;
    }

    function resetHistoryIfNewConversation() {
        const newId = getConversationId();
        if (newId !== currentConversationId) {
            currentConversationId = newId;
            seenPrompts.clear();
            promptList.innerHTML = '';
            activeItem = null;
        }
    }

    function createPromptElement(text, element) {
        const item = document.createElement('div');
        item.className = 'gemini-prompt-item';
        item.dataset.text = text;
        item._lastTargetNode = element;

        item.textContent = text.length > 150 ? text.substring(0, 150) + '...' : text;
        item.title = text;

        item.addEventListener('click', () => {
            if (activeItem) {
                activeItem.classList.remove('active');
            }
            item.classList.add('active');
            activeItem = item;

            let targetElement = item._lastTargetNode;
            let rect = targetElement ? targetElement.getBoundingClientRect() : null;

            // If element is gone or hidden/zero-sized (common in current sessions), do a fresh lookup
            if (!targetElement || !targetElement.isConnected || (rect && rect.width === 0 && rect.height === 0)) {
                const selectors = ['user-query', '[data-test-id="user-query"]', '[data-message-author-role="user"]', '.user-query'];
                let currentNodes = Array.from(document.querySelectorAll(selectors.join(', ')));
                if (currentNodes.length === 0) {
                    currentNodes = Array.from(document.querySelectorAll('.query-text, .user-text'));
                }

                for (const n of currentNodes) {
                    let nText = n.textContent || '';
                    const tNode = n.querySelector('.content, .text, .query-text-content');
                    if (tNode) nText = tNode.textContent || '';
                    nText = nText.replace(/^You said\s*/i, '').trim();
                    if (nText === text) {
                        targetElement = n;
                        item._lastTargetNode = n;
                        break;
                    }
                }
            }

            if (targetElement && targetElement.isConnected) {
                let scrollParent = targetElement.parentElement;
                while (scrollParent && scrollParent !== document.body && scrollParent !== document.documentElement) {
                    const style = window.getComputedStyle(scrollParent);
                    if ((style.overflowY === 'auto' || style.overflowY === 'scroll' || style.overflowY === 'overlay') && scrollParent.scrollHeight > scrollParent.clientHeight) {
                        break;
                    }
                    scrollParent = scrollParent.parentElement;
                }
                if (!scrollParent || scrollParent === document.body || scrollParent === document.documentElement) {
                    scrollParent = window;
                }

                const isWindow = scrollParent === window;
                const startY = isWindow ? window.scrollY : scrollParent.scrollTop;

                let targetY;
                if (isWindow) {
                    targetY = startY + targetElement.getBoundingClientRect().top - (window.innerHeight / 2);
                } else {
                    const parentRect = scrollParent.getBoundingClientRect();
                    const targetRect = targetElement.getBoundingClientRect();
                    targetY = startY + (targetRect.top - parentRect.top) - (parentRect.height / 2) + (targetRect.height / 2);
                }

                const distance = targetY - startY;
                const duration = 600;
                let startTime = null;

                function step(currentTime) {
                    if (!startTime) startTime = currentTime;
                    const timeElapsed = currentTime - startTime;
                    const progress = Math.min(timeElapsed / duration, 1);

                    const easeProgress = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;
                    const currentY = startY + (distance * easeProgress);

                    if (isWindow) {
                        window.scrollTo(0, currentY);
                    } else {
                        scrollParent.scrollTop = currentY;
                    }

                    if (timeElapsed < duration) {
                        requestAnimationFrame(step);
                    }
                }

                if (Math.abs(distance) > 5) {
                    requestAnimationFrame(step);
                }

                const originalTransition = targetElement.style.transition || '';
                const originalBg = targetElement.style.backgroundColor || '';

                targetElement.style.transition = 'background-color 0.3s ease, color 0.3s ease';
                targetElement.style.backgroundColor = 'rgba(114, 174, 253, 0.4)';

                setTimeout(() => {
                    if (targetElement && targetElement.isConnected) {
                        targetElement.style.backgroundColor = originalBg;
                        setTimeout(() => {
                            if (targetElement && targetElement.isConnected) {
                                targetElement.style.transition = originalTransition;
                            }
                        }, 300);
                    }
                }, 1500);
            }
        });

        return item;
    }

    // Parse DOM for active prompts
    function scanForPrompts() {
        resetHistoryIfNewConversation();

        // Target primary user text nodes
        const selectors = [
            'user-query',
            '[data-test-id="user-query"]',
            '[data-message-author-role="user"]',
            '.user-query'
        ];

        let nodes = document.querySelectorAll(selectors.join(', '));

        if (nodes.length === 0) {
            const chatElements = document.querySelectorAll('.query-text, .user-text');
            if (chatElements.length > 0) nodes = chatElements;
        }

        let validItems = [];
        nodes.forEach(node => {
            let text = node.textContent.trim();

            const textNode = node.querySelector('.content, .text, .query-text-content');
            if (textNode) {
                text = textNode.textContent.trim();
            }

            text = text.replace(/^You said\s*/i, '').trim();

            if (text && text.length > 0 && text !== 'Edit') {
                validItems.push({ text, node });
            }
        });

        // Maintain document order, filter duplicates
        let uniqueItems = [];
        let trackedTexts = new Set();
        validItems.forEach(item => {
            if (!trackedTexts.has(item.text)) {
                trackedTexts.add(item.text);
                uniqueItems.push(item);
            }
        });

        let isNewAddition = false;

        uniqueItems.forEach((item, index) => {
            if (!seenPrompts.has(item.text)) {
                seenPrompts.add(item.text);
                isNewAddition = true;
                item.el = createPromptElement(item.text, item.node);
            } else {
                item.el = Array.from(promptList.children).find(el => el.dataset.text === item.text);
                if (item.el) item.el._lastTargetNode = item.node;
            }
        });

        // Sync DOM order to reflect document visual order
        uniqueItems.forEach((item, index) => {
            if (item.el) {
                if (promptList.children[index] !== item.el) {
                    promptList.insertBefore(item.el, promptList.children[index] || null);
                }
            }
        });

        if (isNewAddition) {
            sidebar.scrollTop = sidebar.scrollHeight;
        }
    }

    // Perform initial parse
    setTimeout(scanForPrompts, 1500);

    const observer = new MutationObserver((mutations) => {
        let newNodesAdded = false;
        for (const mutation of mutations) {
            if (mutation.addedNodes.length > 0) {
                newNodesAdded = true;
                break;
            }
        }

        if (newNodesAdded) {
            clearTimeout(window._geminiScanTimeout);
            window._geminiScanTimeout = setTimeout(() => {
                scanForPrompts();
                hideDisclaimerText();
            }, 800);
        }
    });

    function hideDisclaimerText() {
        const walkers = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
        let node;
        while ((node = walkers.nextNode())) {
            if (node.nodeValue && node.nodeValue.includes('Gemini is AI and can make mistakes')) {
                const parent = node.parentElement;
                if (parent && parent.style) {
                    parent.style.display = 'none';
                    parent.style.opacity = '0';
                    parent.style.visibility = 'hidden';
                }
            }
        }
    }
    setTimeout(hideDisclaimerText, 1000);

    observer.observe(document.body, { childList: true, subtree: true });

    let lastUrl = location.href;
    new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            resetHistoryIfNewConversation();
            setTimeout(scanForPrompts, 1000);
        }
    }).observe(document, { subtree: true, childList: true });

    const bottomBtn = document.createElement('div');
    bottomBtn.id = 'gemini-scroll-to-bottom-btn';
    bottomBtn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>`;
    document.body.appendChild(bottomBtn);

    let activeScrollContainer = window;

    window.addEventListener('scroll', (e) => {
        let target = e.target;
        if (target === document) target = document.documentElement;

        if (target.scrollHeight > window.innerHeight * 0.8 || target === document.documentElement) {
            activeScrollContainer = target === document.documentElement ? window : target;

            const currentScroll = target === document.documentElement ? window.scrollY : target.scrollTop;
            const containerHeight = target === document.documentElement ? window.innerHeight : target.clientHeight;

            const isNearBottom = (target.scrollHeight - currentScroll - containerHeight) < 250;
            if (!isNearBottom) {
                bottomBtn.classList.add('visible');
            } else {
                bottomBtn.classList.remove('visible');
            }
        }
    }, true);

    bottomBtn.addEventListener('click', () => {
        const isWindow = activeScrollContainer === window;
        const targetElement = isWindow ? document.documentElement : activeScrollContainer;

        const startY = isWindow ? window.scrollY : targetElement.scrollTop;
        const targetY = targetElement.scrollHeight - (isWindow ? window.innerHeight : targetElement.clientHeight);
        const distance = targetY - startY;

        if (distance <= 0) return;

        const duration = 500;
        let startTime = null;

        function step(currentTime) {
            if (!startTime) startTime = currentTime;
            const timeElapsed = currentTime - startTime;
            const progress = Math.min(timeElapsed / duration, 1);

            const easeProgress = 1 - Math.pow(1 - progress, 3);
            const currentY = startY + (distance * easeProgress);

            if (isWindow) {
                window.scrollTo(0, currentY);
            } else {
                targetElement.scrollTop = currentY;
            }

            if (timeElapsed < duration) {
                requestAnimationFrame(step);
            }
        }
        requestAnimationFrame(step);
    });

})();
