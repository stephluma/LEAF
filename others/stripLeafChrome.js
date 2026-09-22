function stripLeafChrome(frame){
                    try {
                        const doc = frame.contentDocument || frame.contentWindow.document;
                        if (!doc) return;
                        const style = doc.createElement('style');
                        style.textContent = `
                            #header{display:none !important}
                            body{padding-top:0 !important;margin-top:0 !important}
                        `;
                        doc.head.appendChild(style);
                    } catch (err) {
                        console.warn('Could not strip LEAF header from iframe (likely cross-origin):', err);
                    }
                }
